function formatPriorityLabel(priority) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  return (template.content.textContent || "").trim();
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function renderTask(task, column, columnIndex, totalColumns) {
  const safeTitle = escapeHtml(task.title);
  const endAt = escapeHtml(formatDateTime(task.endAt));
  const safeColor = escapeHtml(task.color || "#0f766e");
  const safeTagText = escapeHtml(String(task.tagText || "").trim());
  const safeTagColor = escapeHtml(task.tagColor || "#0ea5c6");
  const tagBadge = safeTagText
    ? `<span class="tag-badge" style="--task-tag-color: ${safeTagColor};" title="${safeTagText}">${safeTagText}</span>`
    : "";

  const actions = [
    '<button class="card-action card-action-icon" type="button" data-action="open-edit-modal" aria-label="Edit task" title="Edit"><img class="action-icon-image" src="Image/Edit.svg" alt="" aria-hidden="true" /></button>',
  ];

  if (column.id === "col-2") {
    actions.push(
      '<button class="card-action card-action-icon card-action-complete" type="button" data-action="complete-task" aria-label="Complete task" title="Complete"><img class="action-icon-image" src="Image/Hoanthanh.svg" alt="" aria-hidden="true" /></button>',
    );
  }

  if (column.id === "col-1") {
    actions.push(
      '<button class="card-action card-action-icon" type="button" data-action="duplicate-task" aria-label="Duplicate task" title="Duplicate"><img class="action-icon-image" src="Image/Duplicate.svg" alt="" aria-hidden="true" /></button>',
    );
  }

  actions.push(
    '<button class="card-action card-action-icon card-action-danger" type="button" data-action="delete-task" aria-label="Delete task" title="Delete"><img class="action-icon-image" src="Image/Delete.svg" alt="" aria-hidden="true" /></button>',
  );

  return `
    <li class="task-card" data-task-id="${task.id}" style="--task-color: ${safeColor}">
      <div class="task-color-dot" aria-hidden="true"></div>
      <p class="task-title">${safeTitle}</p>
      <div class="task-time-group">
        <div class="task-timebox">
          <p class="time-range">${endAt}</p>
        </div>
      </div>
      <div class="task-footer">
        <div class="task-badges">
          <span class="priority-badge priority-${task.priority}">${formatPriorityLabel(task.priority)}</span>
          ${tagBadge}
        </div>
      </div>
      <div class="task-actions-row">
        <div class="task-actions">
          ${actions.join("")}
        </div>
      </div>
    </li>
  `;
}

function renderColumn(column, filters, columnIndex, totalColumns) {
  const keyword = filters.keyword.trim().toLowerCase();

  const visibleTasks = column.tasks.filter((task) => {
    const searchSource = `${task.title} ${stripHtml(task.descriptionHtml)} ${task.tagText || ""}`;
    const okKeyword = !keyword || searchSource.toLowerCase().includes(keyword);
    const okPriority =
      filters.priority === "all" || task.priority === filters.priority;
    return okKeyword && okPriority;
  });

  const taskHtml = visibleTasks.length
    ? visibleTasks
        .map((task) => renderTask(task, column, columnIndex, totalColumns))
        .join("")
    : '<li class="empty">No matching tasks</li>';

  return `
    <article class="column" data-column-id="${column.id}">
      <header class="column-header">
        <h2 class="column-title"><span class="column-drag-handle" aria-hidden="true">⋮⋮</span><span class="column-title-text" title="Double-click to rename">${escapeHtml(column.title)}</span></h2>
        <div class="column-header-right">
          <span class="task-count">${column.tasks.length}</span>
          <button class="add-task-btn" type="button" data-action="open-create-modal" data-column-id="${column.id}" aria-label="Add task to column ${escapeHtml(
            column.title,
          )}">+</button>
        </div>
      </header>

      <ul class="task-list" data-column-id="${column.id}">
        ${taskHtml}
      </ul>
    </article>
  `;
}

export function renderBoard(board, filters) {
  const container = document.getElementById("board");
  if (!container) return;

  container.innerHTML = board.columns
    .map((column, index) =>
      renderColumn(column, filters, index, board.columns.length),
    )
    .join("");
}
