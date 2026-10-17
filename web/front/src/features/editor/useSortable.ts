import Sortable, { type Options } from "sortablejs";
import { useEffect, useRef } from "react";

interface SortableHookOptions<T> {
  readonly disabled?: boolean;
  readonly dependencies: readonly unknown[];
  readonly value: T;
  createOptions(getValue: () => T): Options;
}

/** Owns SortableJS lifecycle and shared drag affordances; feature hooks own document semantics. */
export function useSortable<T>(options: SortableHookOptions<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const valueRef = useRef(options.value);
  valueRef.current = options.value;

  useEffect(() => {
    const element = ref.current;
    if (!element || options.disabled) return;

    const sortableOptions = options.createOptions(() => valueRef.current);
    let originalNext: ChildNode | null = null;
    const sortable = Sortable.create(element, {
      animation: prefersReducedMotion() ? 0 : 150,
      ghostClass: "drag-ghost",
      chosenClass: "drag-chosen",
      dragClass: "drag-active",
      delay: 130,
      delayOnTouchOnly: true,
      // Native HTML drag does not give the editor a consistent pointer path
      // across the mouse and touch surfaces it supports. Sortable's fallback
      // keeps the handle, drop affordance and document mutation on one path.
      forceFallback: true,
      // Keep the visual proxy in its list. Appending it to <body> loses
      // container-scoped Discord sizing rules and makes the dragged item jump.
      fallbackOnBody: false,
      ...sortableOptions,
      onStart: (event) => {
        originalNext = event.item.nextSibling;
        document.body.classList.add("is-dragging");
        sortableOptions.onStart?.(event);
      },
      onEnd: (event) => {
        document.body.classList.remove("is-dragging");
        // React owns the DOM order. Undo Sortable's physical move before
        // applying the array mutation, including moves between containers.
        event.from.insertBefore(
          event.item,
          originalNext?.parentNode === event.from ? originalNext : null,
        );
        sortableOptions.onEnd?.(event);
      },
    });

    return () => {
      document.body.classList.remove("is-dragging");
      sortable.destroy();
    };
  }, [options.disabled, ...options.dependencies]);

  return ref;
}

export function sortableIndex(
  primary: number | undefined,
  fallback: number | undefined,
) {
  return primary ?? fallback ?? -1;
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
