const sortableInstances = [];

function clearSortables() {
  while (sortableInstances.length) {
    const instance = sortableInstances.pop();
    instance.destroy();
  }
}

export function initDragAndDrop({ enabled, onTaskEnd, onColumnEnd }) {
  clearSortables();

  if (!window.Sortable) {
    console.error("SortableJS is not loaded.");
    return;
  }

  const lists = document.querySelectorAll(".task-list");

  lists.forEach((list) => {
    const sortable = new window.Sortable(list, {
      group: "shared",
      animation: 150,
      disabled: !enabled,
      onEnd: (evt) => {
        if (typeof onTaskEnd === "function") {
          onTaskEnd(evt);
        }
      },
    });

    sortableInstances.push(sortable);
  });

  const board = document.getElementById("board");
  if (!board) return;

  const columnSortable = new window.Sortable(board, {
    animation: 170,
    draggable: ".column",
    handle: ".column-drag-handle",
    onEnd: (evt) => {
      if (typeof onColumnEnd === "function") {
        onColumnEnd(evt);
      }
    },
  });

  sortableInstances.push(columnSortable);
}
