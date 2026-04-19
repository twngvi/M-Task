const STORAGE_KEY = "taskboard";
const THEME_KEY = "taskboard-theme";

const DEFAULT_COLUMN_TITLES = ["To Do", "Doing", "Done"];
const DEFAULT_TASK_COLOR = "#0f766e";
const MAX_COLUMN_TITLE_LENGTH = 40;
export const DEFAULT_TAG_COLOR = "#0ea5c6";

export const TASK_COLOR_PALETTE = [
  "#0f766e",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ef4444",
  "#f59e0b",
  "#65a30d",
  "#0ea5a4",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#38bdf8",
  "#facc15",
  "#fb7185",
  "#4ade80",
];

const ALLOWED_DESCRIPTION_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function sanitizeRichTextHtml(rawHtml) {
  const template = document.createElement("template");
  template.innerHTML = String(rawHtml || "");

  const cleanNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment();
    }

    const tagName = node.tagName.toLowerCase();

    if (!ALLOWED_DESCRIPTION_TAGS.has(tagName)) {
      const fragment = document.createDocumentFragment();
      node.childNodes.forEach((child) => {
        fragment.append(cleanNode(child));
      });
      return fragment;
    }

    const safeElement = document.createElement(tagName);
    node.childNodes.forEach((child) => {
      safeElement.append(cleanNode(child));
    });

    return safeElement;
  };

  const wrapper = document.createElement("div");
  template.content.childNodes.forEach((child) => {
    wrapper.append(cleanNode(child));
  });

  return wrapper.innerHTML.trim();
}

function normalizePriority(priority) {
  return ["low", "medium", "high"].includes(priority) ? priority : "medium";
}

function normalizeColor(color, fallbackColor = DEFAULT_TASK_COLOR) {
  const candidate = String(color || "").trim();
  const valid = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(candidate);
  if (!valid) {
    return fallbackColor;
  }

  if (candidate.length === 4) {
    const [hash, r, g, b] = candidate;
    return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return candidate.toLowerCase();
}

function normalizeTagText(value) {
  return String(value || "")
    .trim()
    .slice(0, 36);
}

function normalizeColumnTitle(value, fallbackTitle) {
  const title = String(value || "")
    .trim()
    .slice(0, MAX_COLUMN_TITLE_LENGTH);

  if (title) {
    return title;
  }

  return fallbackTitle;
}

function normalizeColumnId(value, fallbackIndex) {
  const id = String(value || "").trim();
  if (id) {
    return id;
  }

  return `col-custom-${fallbackIndex + 1}`;
}

function normalizeDateTime(value, fallbackIso) {
  const parsed = new Date(value || fallbackIso);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackIso;
  }

  return parsed.toISOString();
}

function buildDefaultTimeRange(createdAt) {
  const start = new Date(createdAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
  };
}

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
  const now = Date.now();
  const createdAt = Number(task?.createdAt || now);
  const updatedAt = Number(task?.updatedAt || createdAt);
  const legacyContent = String(task?.content || "").trim();
  const title = String(task?.title || legacyContent || "Untitled task").trim();
  const fallbackRange = buildDefaultTimeRange(createdAt);
  const startAt = normalizeDateTime(
    task?.startAt || createdAt,
    fallbackRange.startAt,
  );
  let endAt = normalizeDateTime(task?.endAt, fallbackRange.endAt);

  if (new Date(endAt).getTime() < new Date(startAt).getTime()) {
    endAt = new Date(
      new Date(startAt).getTime() + 60 * 60 * 1000,
    ).toISOString();
  }

  const legacyDescription = legacyContent
    ? `<p>${escapeHtml(legacyContent)}</p>`
    : "";
  const tagText = normalizeTagText(task?.tagText || task?.tag?.text || "");
  const tagColor = normalizeColor(
    task?.tagColor || task?.tag?.color,
    DEFAULT_TAG_COLOR,
  );

  return {
    id: String(task?.id || `task-${now}`),
    title,
    descriptionHtml: sanitizeRichTextHtml(
      task?.descriptionHtml || task?.description || legacyDescription,
    ),
    startAt,
    endAt,
    createdAt,
    updatedAt,
    priority: normalizePriority(task?.priority),
    color: normalizeColor(task?.color, DEFAULT_TASK_COLOR),
    tagText,
    tagColor,
  };
}

function normalizeBoard(candidate) {
  const fallback = buildDefaultBoard();
  if (!candidate || !Array.isArray(candidate.columns)) {
    return fallback;
  }

  const fallbackById = new Map(fallback.columns.map((col) => [col.id, col]));
  const usedIds = new Set();
  const columns = [];

  candidate.columns.forEach((column, index) => {
    if (!column || typeof column !== "object") {
      return;
    }

    let normalizedId = normalizeColumnId(column.id, index);
    if (usedIds.has(normalizedId)) {
      const baseId = normalizedId;
      let suffix = 2;

      while (usedIds.has(`${baseId}-${suffix}`)) {
        suffix += 1;
      }

      normalizedId = `${baseId}-${suffix}`;
    }

    usedIds.add(normalizedId);

    const fallbackTitle =
      fallbackById.get(normalizedId)?.title || `List ${columns.length + 1}`;

    columns.push({
      id: normalizedId,
      title: normalizeColumnTitle(column.title, fallbackTitle),
      tasks: Array.isArray(column.tasks) ? column.tasks.map(normalizeTask) : [],
    });
  });

  fallback.columns.forEach((defaultColumn) => {
    if (usedIds.has(defaultColumn.id)) {
      return;
    }

    columns.push({
      id: defaultColumn.id,
      title: defaultColumn.title,
      tasks: [],
    });
  });

  if (!columns.length) {
    return fallback;
  }

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
    console.error("Unable to save board data:", error);
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
    console.error("Unable to read board data, using default board:", error);
    return buildDefaultBoard();
  }
}

export function saveTheme(isDark) {
  try {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  } catch (error) {
    console.error("Unable to save theme:", error);
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark";
  } catch (error) {
    console.error("Unable to read theme:", error);
    return false;
  }
}
