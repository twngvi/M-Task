const STORAGE_KEY = "taskboard";
const THEME_KEY = "taskboard-theme";

const DEFAULT_COLUMN_TITLES = ["To Do", "Doing", "Done"];

export function buildDefaultBoard() {
  return {
    columns: DEFAULT_COLUMN_TITLES.map((title, index) => ({
      id: `col-${index + 1}`,
      title,
      tasks: [],
    })),
  };
}

function normalizeTask(task) {
  return {
    id: String(task?.id || `task-${Date.now()}`),
    content: String(task?.content || "").trim(),
    createdAt: Number(task?.createdAt || Date.now()),
    priority: ["low", "medium", "high"].includes(task?.priority)
      ? task.priority
      : "medium",
  };
}

function normalizeBoard(candidate) {
  const fallback = buildDefaultBoard();
  if (!candidate || !Array.isArray(candidate.columns)) {
    return fallback;
  }

  const titleById = new Map(fallback.columns.map((col) => [col.id, col.title]));

  const columns = fallback.columns.map((fallbackCol) => {
    const matched = candidate.columns.find(
      (col) => col && col.id === fallbackCol.id,
    );
    const tasks = Array.isArray(matched?.tasks)
      ? matched.tasks.map(normalizeTask)
      : [];

    return {
      id: fallbackCol.id,
      title: titleById.get(fallbackCol.id) || fallbackCol.title,
      tasks,
    };
  });

  return { columns };
}

export function sanitizeBoard(candidate) {
  return normalizeBoard(candidate);
}

export function saveBoard(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Khong the luu du lieu board:", error);
    return false;
  }
}

export function loadBoard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return buildDefaultBoard();
    }

    return normalizeBoard(JSON.parse(raw));
  } catch (error) {
    console.error("Khong the doc du lieu board, dung du lieu mac dinh:", error);
    return buildDefaultBoard();
  }
}

export function saveTheme(isDark) {
  try {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  } catch (error) {
    console.error("Khong the luu theme:", error);
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark";
  } catch (error) {
    console.error("Khong the doc theme:", error);
    return false;
  }
}
