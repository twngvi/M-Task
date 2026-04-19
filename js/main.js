import { initDragAndDrop } from "./dragdrop.js";
import { renderBoard } from "./render.js";
import {
  buildDefaultBoard,
  loadBoard,
  loadTheme,
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

function findColumn(columnId) {
  return board.columns.find((column) => column.id === columnId);
}

function createTaskId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `task-${window.crypto.randomUUID()}`;
  }

  return `task-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function commit(nextBoard) {
  board = nextBoard;
  saveBoard(board);
  draw();
}

function draw() {
  renderBoard(board, uiState);

  const dragEnabled = !uiState.keyword.trim() && uiState.priority === "all";
  const dragHint = document.getElementById("dragHint");
  if (dragHint) {
    dragHint.textContent = dragEnabled
      ? "Keo tha de doi thu tu hoac chuyen task qua cot khac."
      : "Dang bat filter, tam khoa drag-drop de tranh sai lech du lieu.";
  }

  initDragAndDrop({
    enabled: dragEnabled,
    onEnd: handleDragEnd,
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

  toCol.tasks.splice(targetIndex, 0, movedTask);

  commit({ ...board, columns: [...board.columns] });
}

function handleAddTask(event) {
  const form = event.target.closest(".add-task-form");
  if (!form) return;

  event.preventDefault();

  const columnId = form.dataset.columnId;
  const column = findColumn(columnId);
  if (!column) return;

  const contentInput = form.elements.content;
  const priorityInput = form.elements.priority;

  const content = String(contentInput?.value || "").trim();
  if (!content) {
    alert("Task khong duoc de trong.");
    return;
  }

  column.tasks.push({
    id: createTaskId(),
    content,
    createdAt: Date.now(),
    priority: priorityInput?.value || "medium",
  });

  commit({ ...board, columns: [...board.columns] });
}

function handleDeleteTask(button) {
  const card = button.closest(".task-card");
  const columnEl = button.closest(".column");
  if (!card || !columnEl) return;

  const taskId = card.dataset.taskId;
  const columnId = columnEl.dataset.columnId;
  const column = findColumn(columnId);
  if (!column) return;

  column.tasks = column.tasks.filter((task) => task.id !== taskId);
  commit({ ...board, columns: [...board.columns] });
}

function startInlineEdit(contentEl) {
  const card = contentEl.closest(".task-card");
  const columnEl = contentEl.closest(".column");
  if (!card || !columnEl) return;

  const existingInput = card.querySelector(".inline-editor");
  if (existingInput) return;

  const currentText = contentEl.textContent.trim();

  const input = document.createElement("input");
  input.type = "text";
  input.value = currentText;
  input.maxLength = 180;
  input.className = "inline-editor";

  contentEl.replaceWith(input);
  input.focus();
  input.select();

  const saveInline = (submit) => {
    const newValue = input.value.trim();
    const finalText = submit && newValue ? newValue : currentText;

    const taskId = card.dataset.taskId;
    const column = findColumn(columnEl.dataset.columnId);
    const task = column?.tasks.find((item) => item.id === taskId);
    if (task) {
      task.content = finalText;
      commit({ ...board, columns: [...board.columns] });
    } else {
      draw();
    }
  };

  input.addEventListener("blur", () => saveInline(true), { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      input.blur();
      return;
    }

    if (event.key === "Escape") {
      saveInline(false);
    }
  });
}

function handleFilterAndActions(event) {
  if (event.type === "submit") {
    handleAddTask(event);
    return;
  }

  if (event.type === "click") {
    const deleteBtn = event.target.closest('[data-action="delete-task"]');
    if (deleteBtn) {
      handleDeleteTask(deleteBtn);
      return;
    }
  }

  if (event.type === "dblclick") {
    const editable = event.target.closest('[data-action="edit-content"]');
    if (editable) {
      startInlineEdit(editable);
    }
  }
}

function setupStaticControls() {
  const keywordInput = document.getElementById("keywordFilter");
  const prioritySelect = document.getElementById("priorityFilter");
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
        throw new Error("Sai dinh dang du lieu");
      }

      commit(sanitizeBoard({ ...buildDefaultBoard(), ...data }));
    } catch (error) {
      alert(`Import that bai: ${error.message}`);
    } finally {
      importInput.value = "";
    }
  });
}

function init() {
  document.addEventListener("submit", handleFilterAndActions);
  document.addEventListener("click", handleFilterAndActions);
  document.addEventListener("dblclick", handleFilterAndActions);

  setupStaticControls();
  draw();
}

init();
