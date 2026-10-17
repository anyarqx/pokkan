import { sortableIndex, useSortable } from "./useSortable";

interface SortableItemsOptions {
  readonly item: string;
  readonly handle: string;
  /** Test/preview surfaces must never let Sortable mutate their rendered DOM. */
  readonly disabled?: boolean;
  onMove(oldIndex: number, newIndex: number): void;
}

/** Sorts a single repeatable API array. Structural mutation is still owned by the document tree. */
export function useSortableItems(options: SortableItemsOptions) {
  return useSortable({
    value: options,
    disabled: options.disabled,
    dependencies: [options.disabled, options.handle, options.item],
    createOptions: (getOptions) => ({
      draggable: getOptions().item,
      handle: getOptions().handle,
      onEnd: (event) => {
        const oldIndex = sortableIndex(event.oldDraggableIndex, event.oldIndex);
        const newIndex = sortableIndex(event.newDraggableIndex, event.newIndex);
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex)
          getOptions().onMove(oldIndex, newIndex);
      },
    }),
  });
}
