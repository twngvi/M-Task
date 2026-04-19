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

function renderTask(task) {
  const safeContent = escapeHtml(task.content);
  const formattedTime = escapeHtml(new Date(task.createdAt).toLocaleString());

  return `
    <li class="task-card" data-task-id="${task.id}">
      <p class="task-content" data-action="edit-content">${safeContent}</p>
      <div class="task-meta">
        <p class="timestamp">${formattedTime}</p>
        <span class="priority-badge priority-${task.priority}">${formatPriorityLabel(task.priority)}</span>
      </div>
      <div class="task-actions">
        <button class="delete-btn" type="button" data-action="delete-task">Delete</button>
      </div>
    </li>
  `;
}

function renderColumn(column, filters) {
  const keyword = filters.keyword.trim().toLowerCase();

  const visibleTasks = column.tasks.filter((task) => {
    const okKeyword = !keyword || task.content.toLowerCase().includes(keyword);
    const okPriority =
      filters.priority === "all" || task.priority === filters.priority;
    return okKeyword && okPriority;
  });

  const taskHtml = visibleTasks.length
    ? visibleTasks.map((task) => renderTask(task)).join("")
    : '<li class="empty">Khong co task phu hop</li>';

  return `
    <article class="column" data-column-id="${column.id}">
      <header class="column-header">
        <h2 class="column-title">${column.title}</h2>
        <span class="task-count">${column.tasks.length} tasks</span>
      </header>

      <ul class="task-list" data-column-id="${column.id}">
        ${taskHtml}
      </ul>

      <form class="add-task-form" data-column-id="${column.id}">
        <input name="content" type="text" placeholder="Nhap task moi..." required maxlength="180" />
        <div class="add-row">
          <select name="priority" aria-label="Do uu tien task moi">
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="low">Low</option>
          </select>
          <button type="submit">Add</button>
        </div>
      </form>
    </article>
  `;
}

export function renderBoard(board, filters) {
  const container = document.getElementById("board");
  if (!container) return;

  container.innerHTML = board.columns
    .map((column) => renderColumn(column, filters))
    .join("");
}
