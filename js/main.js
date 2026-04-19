import { initDragAndDrop } from "./dragdrop.js";
import { renderBoard } from "./render.js";
import {
  DEFAULT_TAG_COLOR,
  TASK_COLOR_PALETTE,
  buildDefaultBoard,
  loadBoard,
  loadTheme,
  sanitizeRichTextHtml,
  sanitizeBoard,
  saveBoard,
  saveTheme,
} from "./storage.js";

let board = loadBoard();

const uiState = {
  keyword: "",
  priority: "all",
  dark: loadTheme(),
};

const modalState = {
  mode: "create",
  columnId: "",
  taskId: "",
};

const listModalRefs = {
  root: null,
  form: null,
  input: null,
};

const modalRefs = {
  root: null,
  heading: null,
  form: null,
  title: null,
  editor: null,
  hiddenDescription: null,
  startAt: null,
  endAt: null,
  priority: null,
  color: null,
  colorName: null,
  palette: null,
  tagText: null,
  tagColor: null,
  tagPreview: null,
};

const COLOR_NAME_MAP = {
  "#0f766e": "Lagoon",
  "#0891b2": "Ocean",
  "#2563eb": "Blue Bay",
  "#7c3aed": "Twilight",
  "#db2777": "Sunset Pink",
  "#ef4444": "Coral Red",
  "#f59e0b": "Sun Glow",
  "#65a30d": "Palm Leaf",
  "#0ea5a4": "Sea Glass",
  "#06b6d4": "Tropical Water",
  "#3b82f6": "Sky Blue",
  "#6366f1": "Wave Indigo",
  "#8b5cf6": "Evening Violet",
  "#a855f7": "Orchid",
  "#ec4899": "Flamingo",
  "#f43f5e": "Beach Berry",
  "#f97316": "Sunset Orange",
  "#84cc16": "Lime Palm",
  "#22c55e": "Sea Green",
  "#14b8a6": "Aqua Mint",
  "#38bdf8": "Shoreline",
  "#facc15": "Sunny Sand",
  "#fb7185": "Shell Pink",
  "#4ade80": "Island Lime",
};

function getColorName(color) {
  return COLOR_NAME_MAP[String(color || "").toLowerCase()] || "Custom";
}

function findColumn(columnId) {
  return board.columns.find((column) => column.id === columnId);
}

function getColumnIndex(columnId) {
  return board.columns.findIndex((column) => column.id === columnId);
}

function createTaskId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `task-${window.crypto.randomUUID()}`;
  }

  return `task-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function createColumnId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `col-${window.crypto.randomUUID()}`;
  }

  return `col-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function toDateTimeLocalValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function getDefaultTimeRange() {
  const start = new Date();
  start.setSeconds(0, 0);

  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    startAt: toDateTimeLocalValue(start.toISOString()),
    endAt: toDateTimeLocalValue(end.toISOString()),
  };
}

function commit(nextBoard) {
  board = sanitizeBoard(nextBoard);
  saveBoard(board);
  draw();
}

function draw() {
  renderBoard(board, uiState);

  const dragEnabled = !uiState.keyword.trim() && uiState.priority === "all";
  const dragHint = document.getElementById("dragHint");
  if (dragHint) {
    dragHint.textContent = dragEnabled
      ? ""
      : "Filters are active, drag-and-drop is temporarily locked.";
  }

  initDragAndDrop({
    enabled: dragEnabled,
    onTaskEnd: handleDragEnd,
    onColumnEnd: handleColumnDragEnd,
  });
}

function handleDragEnd(evt) {
  const taskId = evt.item?.dataset?.taskId;
  const fromColumnId = evt.from?.dataset?.columnId;
  const toColumnId = evt.to?.dataset?.columnId;

  if (!taskId || !fromColumnId || !toColumnId) return;

  const fromCol = findColumn(fromColumnId);
  const toCol = findColumn(toColumnId);
  if (!fromCol || !toCol) return;

  const fromIndex = fromCol.tasks.findIndex((task) => task.id === taskId);
  if (fromIndex === -1) return;

  const [movedTask] = fromCol.tasks.splice(fromIndex, 1);
  const targetIndex = Math.max(0, Math.min(evt.newIndex, toCol.tasks.length));

  movedTask.updatedAt = Date.now();
  toCol.tasks.splice(targetIndex, 0, movedTask);

  commit({ ...board, columns: [...board.columns] });
}

function handleColumnDragEnd(evt) {
  const oldIndex = Number(evt.oldIndex);
  const newIndex = Number(evt.newIndex);

  if (
    Number.isNaN(oldIndex) ||
    Number.isNaN(newIndex) ||
    oldIndex === newIndex
  ) {
    return;
  }

  const columns = [...board.columns];
  const [movedColumn] = columns.splice(oldIndex, 1);
  if (!movedColumn) return;

  columns.splice(newIndex, 0, movedColumn);
  commit({ ...board, columns });
}

function closeAllCardActions() {
  document.querySelectorAll(".task-card.actions-visible").forEach((card) => {
    card.classList.remove("actions-visible");
  });
}

function toggleCardActions(card) {
  const wasVisible = card.classList.contains("actions-visible");
  closeAllCardActions();

  if (!wasVisible) {
    card.classList.add("actions-visible");
  }
}

function openListModal() {
  if (!listModalRefs.root || !listModalRefs.input) return;

  listModalRefs.root.hidden = false;
  listModalRefs.input.value = `List ${board.columns.length + 1}`;

  window.requestAnimationFrame(() => {
    listModalRefs.input.focus();
    listModalRefs.input.select();
  });
}

function closeListModal() {
  if (!listModalRefs.root || !listModalRefs.form) return;

  listModalRefs.root.hidden = true;
  listModalRefs.form.reset();
}

function handleListModalSubmit(event) {
  if (event.target !== listModalRefs.form) return;

  event.preventDefault();

  const title = listModalRefs.input.value.trim().slice(0, 40);
  if (!title) {
    alert("List name cannot be empty.");
    listModalRefs.input.focus();
    return;
  }

  let id = createColumnId();
  while (findColumn(id)) {
    id = createColumnId();
  }

  const nextColumns = [...board.columns, { id, title, tasks: [] }];
  closeListModal();
  commit({ ...board, columns: nextColumns });
}

function startInlineColumnRename(titleEl) {
  const columnEl = titleEl.closest(".column");
  const columnId = columnEl?.dataset.columnId;
  if (!columnId) return;

  const column = findColumn(columnId);
  if (!column) return;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "column-title-input";
  input.maxLength = 40;
  input.value = column.title;
  input.setAttribute("aria-label", "Rename list");

  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let handled = false;
  const finish = (save) => {
    if (handled) return;
    handled = true;

    if (save) {
      const newTitle = input.value.trim().slice(0, 40);
      if (newTitle && newTitle !== column.title) {
        const nextColumns = board.columns.map((item) =>
          item.id === columnId ? { ...item, title: newTitle } : item,
        );
        commit({ ...board, columns: nextColumns });
        return;
      }
    }

    draw();
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });

  input.addEventListener("blur", () => finish(true));
}

function handleGlobalDoubleClick(event) {
  const titleEl = event.target.closest(".column-title-text");
  if (!titleEl) return;

  startInlineColumnRename(titleEl);
}

function getTaskContextByElement(element) {
  const card = element.closest(".task-card");
  const columnEl = element.closest(".column");
  if (!card || !columnEl) return null;

  const taskId = card.dataset.taskId;
  const columnId = columnEl.dataset.columnId;
  if (!taskId || !columnId) return null;

  const column = findColumn(columnId);
  if (!column) return null;

  const task = column.tasks.find((item) => item.id === taskId);
  if (!task) return null;

  return { task, taskId, column, columnId };
}

function handleDeleteTask(button) {
  const context = getTaskContextByElement(button);
  if (!context) return;

  const confirmed = window.confirm(
    "Are you sure you want to delete this task?",
  );
  if (!confirmed) return;

  context.column.tasks = context.column.tasks.filter(
    (task) => task.id !== context.taskId,
  );

  commit({ ...board, columns: [...board.columns] });
}

function handleCompleteTask(button) {
  const context = getTaskContextByElement(button);
  if (!context) return;

  const currentIndex = getColumnIndex(context.columnId);
  if (currentIndex === -1 || currentIndex >= board.columns.length - 1) return;

  const nextColumn = board.columns[currentIndex + 1];
  const sourceIndex = context.column.tasks.findIndex(
    (task) => task.id === context.taskId,
  );
  if (sourceIndex === -1) return;

  const [task] = context.column.tasks.splice(sourceIndex, 1);
  task.updatedAt = Date.now();
  nextColumn.tasks.unshift(task);

  commit({ ...board, columns: [...board.columns] });
}

function handleDuplicateTask(button) {
  const context = getTaskContextByElement(button);
  if (!context) return;

  if (context.columnId !== "col-1") return;

  const sourceIndex = context.column.tasks.findIndex(
    (task) => task.id === context.taskId,
  );
  if (sourceIndex === -1) return;

  const copy = {
    ...context.task,
    id: createTaskId(),
    title: `${context.task.title} (copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  context.column.tasks.splice(sourceIndex + 1, 0, copy);
  commit({ ...board, columns: [...board.columns] });
}

function highlightActiveColor(color) {
  if (!modalRefs.palette) return;

  modalRefs.palette.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.color === color);
  });

  if (modalRefs.colorName) {
    modalRefs.colorName.textContent = getColorName(color);
  }
}

function highlightActiveTagColor(color) {
  if (!modalRefs.tagPalette) return;

  modalRefs.tagPalette.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.color === color);
  });

  if (modalRefs.tagColorName) {
    modalRefs.tagColorName.textContent = getColorName(color);
  }
}

function updateTagPreview() {
  if (!modalRefs.tagPreview || !modalRefs.tagColor || !modalRefs.tagText) {
    return;
  }

  const text = modalRefs.tagText.value.trim();
  const color = modalRefs.tagColor.value || DEFAULT_TAG_COLOR;

  modalRefs.tagPreview.textContent = text || "No tag";
  modalRefs.tagPreview.style.setProperty("--tag-preview-color", color);
  modalRefs.tagPreview.classList.toggle("is-empty", !text);
  highlightActiveTagColor(color);
}

function openModal() {
  if (!modalRefs.root) return;

  modalRefs.root.hidden = false;
  window.requestAnimationFrame(() => {
    modalRefs.title?.focus();
  });
}

function closeModal() {
  if (!modalRefs.root || !modalRefs.form || !modalRefs.editor) return;

  modalRefs.root.hidden = true;
  modalRefs.form.reset();
  modalRefs.editor.innerHTML = "";
  modalRefs.hiddenDescription.value = "";

  modalState.mode = "create";
  modalState.columnId = "";
  modalState.taskId = "";

  modalRefs.color.value = TASK_COLOR_PALETTE[0];
  highlightActiveColor(TASK_COLOR_PALETTE[0]);

  if (modalRefs.tagText) {
    modalRefs.tagText.value = "";
  }

  if (modalRefs.tagColor) {
    modalRefs.tagColor.value = DEFAULT_TAG_COLOR;
  }

  updateTagPreview();
}

function fillModalForCreate(columnId) {
  const defaults = getDefaultTimeRange();

  modalState.mode = "create";
  modalState.columnId = columnId;
  modalState.taskId = "";

  modalRefs.heading.textContent = "Add New Task";
  modalRefs.title.value = "";
  modalRefs.editor.innerHTML = "";
  modalRefs.startAt.value = defaults.startAt;
  modalRefs.endAt.value = defaults.endAt;
  modalRefs.priority.value = "medium";
  modalRefs.color.value = TASK_COLOR_PALETTE[0];
  highlightActiveColor(TASK_COLOR_PALETTE[0]);
  modalRefs.tagText.value = "";
  modalRefs.tagColor.value = DEFAULT_TAG_COLOR;
  updateTagPreview();
}

function fillModalForEdit(columnId, taskId) {
  const column = findColumn(columnId);
  const task = column?.tasks.find((item) => item.id === taskId);
  if (!task) return false;

  modalState.mode = "edit";
  modalState.columnId = columnId;
  modalState.taskId = taskId;

  modalRefs.heading.textContent = "Edit Task";
  modalRefs.title.value = task.title;
  modalRefs.editor.innerHTML = task.descriptionHtml || "";
  modalRefs.startAt.value = toDateTimeLocalValue(task.startAt);
  modalRefs.endAt.value = toDateTimeLocalValue(task.endAt);
  modalRefs.priority.value = task.priority;
  modalRefs.color.value = task.color;
  highlightActiveColor(task.color);
  modalRefs.tagText.value = task.tagText || "";
  modalRefs.tagColor.value = task.tagColor || DEFAULT_TAG_COLOR;
  updateTagPreview();

  return true;
}

function openCreateModal(columnId) {
  if (!findColumn(columnId)) return;

  fillModalForCreate(columnId);
  openModal();
}

function openEditModal(columnId, taskId) {
  const found = fillModalForEdit(columnId, taskId);
  if (!found) return;

  openModal();
}

function handleToolbarClick(button) {
  const command = button.dataset.editorCmd;
  if (!command) return;

  modalRefs.editor?.focus();
  document.execCommand(command, false);
}

function handleTaskModalSubmit(event) {
  if (event.target !== modalRefs.form) return;

  event.preventDefault();

  const title = modalRefs.title.value.trim();
  const descriptionHtml = sanitizeRichTextHtml(modalRefs.editor.innerHTML);
  const startAt = toIsoDateTime(modalRefs.startAt.value);
  const endAt = toIsoDateTime(modalRefs.endAt.value);
  const priority = modalRefs.priority.value;
  const color = modalRefs.color.value;
  const tagText = modalRefs.tagText.value.trim().slice(0, 36);
  const tagColor = modalRefs.tagColor.value || DEFAULT_TAG_COLOR;

  if (!title) {
    alert("Task name cannot be empty.");
    modalRefs.title.focus();
    return;
  }

  if (!startAt || !endAt) {
    alert("Please fill in both start and end times.");
    return;
  }

  if (new Date(endAt).getTime() < new Date(startAt).getTime()) {
    alert("End time must be later than or equal to start time.");
    return;
  }

  const column = findColumn(modalState.columnId);
  if (!column) {
    alert("Unable to find target column to save task.");
    return;
  }

  modalRefs.hiddenDescription.value = descriptionHtml;

  if (modalState.mode === "create") {
    column.tasks.push({
      id: createTaskId(),
      title,
      descriptionHtml,
      startAt,
      endAt,
      priority,
      color,
      tagText,
      tagColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } else {
    const task = column.tasks.find((item) => item.id === modalState.taskId);
    if (!task) {
      alert("Unable to find task to update.");
      return;
    }

    task.title = title;
    task.descriptionHtml = descriptionHtml;
    task.startAt = startAt;
    task.endAt = endAt;
    task.priority = priority;
    task.color = color;
    task.tagText = tagText;
    task.tagColor = tagColor;
    task.updatedAt = Date.now();
  }

  closeModal();
  commit({ ...board, columns: [...board.columns] });
}

function handleGlobalClick(event) {
  const commandButton = event.target.closest("[data-editor-cmd]");
  if (commandButton) {
    event.preventDefault();
    handleToolbarClick(commandButton);
    return;
  }

  const actionEl = event.target.closest("[data-action]");

  const clickedCard = event.target.closest(".task-card");
  const clickedCardAction = event.target.closest("[data-action]");
  if (clickedCard && !clickedCardAction) {
    toggleCardActions(clickedCard);
  } else if (!clickedCard) {
    closeAllCardActions();
  }

  if (!actionEl) return;

  const action = actionEl.dataset.action;

  if (action === "open-create-modal") {
    const columnId =
      actionEl.dataset.columnId ||
      actionEl.closest(".column")?.dataset.columnId;
    if (columnId) {
      openCreateModal(columnId);
    }
    return;
  }

  if (action === "open-edit-modal") {
    const columnId = actionEl.closest(".column")?.dataset.columnId;
    const taskId = actionEl.closest(".task-card")?.dataset.taskId;
    if (columnId && taskId) {
      openEditModal(columnId, taskId);
    }
    return;
  }

  if (action === "close-modal") {
    closeModal();
    return;
  }

  if (action === "close-list-modal") {
    closeListModal();
    return;
  }

  if (action === "complete-task") {
    handleCompleteTask(actionEl);
    return;
  }

  if (action === "duplicate-task") {
    handleDuplicateTask(actionEl);
    return;
  }

  if (action === "delete-task") {
    handleDeleteTask(actionEl);
  }
}

function setupModal() {
  modalRefs.root = document.getElementById("taskModal");
  modalRefs.heading = document.getElementById("taskModalTitle");
  modalRefs.form = document.getElementById("taskModalForm");
  modalRefs.title = document.getElementById("taskTitle");
  modalRefs.editor = document.getElementById("taskDescriptionEditor");
  modalRefs.hiddenDescription = document.getElementById("taskDescriptionInput");
  modalRefs.startAt = document.getElementById("taskStartAt");
  modalRefs.endAt = document.getElementById("taskEndAt");
  modalRefs.priority = document.getElementById("taskPriority");
  modalRefs.color = document.getElementById("taskColor");
  modalRefs.colorName = document.getElementById("taskColorName");
  modalRefs.palette = document.getElementById("colorPalette");
  modalRefs.tagText = document.getElementById("taskTagText");
  modalRefs.tagColor = document.getElementById("taskTagColor");
  modalRefs.tagColorName = document.getElementById("taskTagColorName");
  modalRefs.tagPalette = document.getElementById("tagColorPalette");
  modalRefs.tagPreview = document.getElementById("taskTagPreview");

  if (!modalRefs.palette || !modalRefs.tagPalette) return;

  modalRefs.palette.innerHTML = TASK_COLOR_PALETTE.map(
    (color) => `
      <button
        type="button"
        class="color-swatch"
        style="background:${color}"
        data-color="${color}"
        aria-label="Choose color ${getColorName(color)}"
      ></button>
    `,
  ).join("");

  modalRefs.palette.addEventListener("click", (event) => {
    const swatch = event.target.closest(".color-swatch");
    if (!swatch) return;

    const color = swatch.dataset.color;
    if (!color) return;

    modalRefs.color.value = color;
    highlightActiveColor(color);
  });

  modalRefs.tagPalette.innerHTML = TASK_COLOR_PALETTE.map(
    (color) => `
      <button
        type="button"
        class="color-swatch"
        style="background:${color}"
        data-color="${color}"
        aria-label="Choose tag color ${getColorName(color)}"
      ></button>
    `,
  ).join("");

  modalRefs.tagPalette.addEventListener("click", (event) => {
    const swatch = event.target.closest(".color-swatch");
    if (!swatch) return;

    const color = swatch.dataset.color;
    if (!color) return;

    modalRefs.tagColor.value = color;
    updateTagPreview();
  });

  modalRefs.color.value = TASK_COLOR_PALETTE[0];
  highlightActiveColor(TASK_COLOR_PALETTE[0]);

  modalRefs.tagColor.value = DEFAULT_TAG_COLOR;
  modalRefs.tagText.addEventListener("input", updateTagPreview);
  updateTagPreview();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRefs.root && !modalRefs.root.hidden) {
      closeModal();
    }
  });
}

function setupGlobalEvents() {
  document.addEventListener("submit", handleTaskModalSubmit);
  document.addEventListener("submit", handleListModalSubmit);
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("dblclick", handleGlobalDoubleClick);
}

function setupStaticControls() {
  const keywordInput = document.getElementById("keywordFilter");
  const prioritySelect = document.getElementById("priorityFilter");
  const addListBtn = document.getElementById("addListBtn");
  const darkToggle = document.getElementById("darkToggle");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importInput = document.getElementById("importInput");

  if (uiState.dark) {
    document.body.classList.add("dark");
  }

  keywordInput?.addEventListener("input", () => {
    uiState.keyword = keywordInput.value;
    draw();
  });

  prioritySelect?.addEventListener("change", () => {
    uiState.priority = prioritySelect.value;
    draw();
  });

  addListBtn?.addEventListener("click", openListModal);

  darkToggle?.addEventListener("click", () => {
    uiState.dark = !uiState.dark;
    document.body.classList.toggle("dark", uiState.dark);
    saveTheme(uiState.dark);
  });

  exportBtn?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(board, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `taskboard-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  });

  importBtn?.addEventListener("click", () => importInput?.click());

  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const data = JSON.parse(raw);

      if (!data || !Array.isArray(data.columns)) {
        throw new Error("Invalid data format");
      }

      commit(sanitizeBoard({ ...buildDefaultBoard(), ...data }));
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    } finally {
      importInput.value = "";
    }
  });
}

function setupListModal() {
  listModalRefs.root = document.getElementById("listModal");
  listModalRefs.form = document.getElementById("listModalForm");
  listModalRefs.input = document.getElementById("listNameInput");

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      listModalRefs.root &&
      !listModalRefs.root.hidden
    ) {
      closeListModal();
    }
  });
}

function setupBrandIconEffect() {
  const brand = document.querySelector(".brand");
  const brandIcon = document.querySelector(".brand-icon");
  if (!brand || !brandIcon) return;

  brand.addEventListener("click", () => {
    brandIcon.classList.remove("brand-icon-spin");
    void brandIcon.offsetWidth;
    brandIcon.classList.add("brand-icon-spin");
  });

  brandIcon.addEventListener("animationend", () => {
    brandIcon.classList.remove("brand-icon-spin");
  });
}

function init() {
  setupGlobalEvents();
  setupModal();
  setupListModal();
  setupStaticControls();
  setupBrandIconEffect();
  draw();
}

init();
