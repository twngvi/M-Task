const sortableInstances = [];

function clearSortables() {
  while (sortableInstances.length) {
    const instance = sortableInstances.pop();
    instance.destroy();
  }
}

export function initDragAndDrop({ enabled, onEnd }) {
  clearSortables();

  if (!window.Sortable) {
    console.error("SortableJS chua duoc nap.");
    return;
  }

  const lists = document.querySelectorAll(".task-list");

  lists.forEach((list) => {
    const sortable = new window.Sortable(list, {
      group: "shared",
      animation: 150,
      disabled: !enabled,
      onEnd: (evt) => {
        if (typeof onEnd === "function") {
          onEnd(evt);
        }
      },
    });

    sortableInstances.push(sortable);
  });
}
