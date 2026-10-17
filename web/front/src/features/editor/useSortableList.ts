import type { MessageFormat } from "../kits/domain";
import type { ComponentPath } from "./schema";
import { parsePath } from "./tree";
import { sortableIndex, useSortable } from "./useSortable";

interface SortableListOptions {
  readonly parentPath: ComponentPath;
  readonly mode: MessageFormat;
  readonly disabled?: boolean;
  readonly canMove: (
    source: ComponentPath,
    destination: ComponentPath,
    oldIndex: number,
  ) => boolean;
  readonly onMove: (
    source: ComponentPath,
    destination: ComponentPath,
    oldIndex: number,
    newIndex: number,
  ) => void;
  readonly onStart?: () => void;
  readonly onEnd?: () => void;
}

/** SortableJS is used only as a pointer/touch interaction layer; document mutation remains schema-owned. */
export function useSortableList(options: SortableListOptions) {
  const parentKey = JSON.stringify(options.parentPath);
  return useSortable({
    value: options,
    disabled: options.disabled,
    dependencies: [options.disabled, options.mode, parentKey],
    createOptions: (getOptions) => ({
      group: `pokkan-${getOptions().mode}`,
      draggable: ".editor-node",
      handle: ".drag-handle",
      onStart: () => getOptions().onStart?.(),
      onMove: (event) => {
        const source = parsePath(event.from.dataset.parentPath ?? "[]");
        const destination = parsePath(event.to.dataset.parentPath ?? "[]");
        const oldIndex = Number(event.dragged.dataset.index ?? -1);
        return getOptions().canMove(source, destination, oldIndex);
      },
      onEnd: (event) => {
        const current = getOptions();
        current.onEnd?.();
        const source = parsePath(event.from.dataset.parentPath ?? "[]");
        const destination = parsePath(event.to.dataset.parentPath ?? "[]");
        const oldIndex = sortableIndex(event.oldDraggableIndex, event.oldIndex);
        const newIndex = sortableIndex(event.newDraggableIndex, event.newIndex);
        if (
          oldIndex !== newIndex ||
          JSON.stringify(source) !== JSON.stringify(destination)
        )
          current.onMove(source, destination, oldIndex, newIndex);
      },
    }),
  });
}
