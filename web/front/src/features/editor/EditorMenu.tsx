import { useEffect, useId, useRef, type ComponentProps } from "react";
import { FloatingSurface } from "../../shared/FloatingSurface";

/** Component and insertion menus share keyboard, dismissal and overlay behavior. */
export function EditorMenu({
  close,
  ...props
}: ComponentProps<typeof FloatingSurface> & { close(): void }) {
  const id = useId();
  const dismiss = useRef(close);
  dismiss.current = close;
  useEffect(() => {
    const menu = document.getElementById(id);
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    let active = true;
    queueMicrotask(() => {
      if (active)
        menu
          ?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
          ?.focus({ preventScroll: true });
    });
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menu?.contains(event.target) &&
        !(
          previous?.matches('[aria-haspopup="menu"]') &&
          previous.contains(event.target)
        )
      )
        dismiss.current();
    };
    const scroll = (event: Event) => {
      if (!(event.target instanceof Node) || !menu?.contains(event.target))
        dismiss.current();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("scroll", scroll, true);
    return () => {
      active = false;
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("scroll", scroll, true);
      if (
        document.activeElement === document.body ||
        menu?.contains(document.activeElement)
      ) {
        const selected = document.querySelector(".editor-node.is-selected");
        const moved =
          selected && previous && previous.closest(".editor-node") !== selected
            ? selected.querySelector<HTMLElement>(
                '.node-controls [aria-haspopup="menu"]',
              )
            : null;
        (moved ?? (previous?.isConnected ? previous : null))?.focus({
          preventScroll: true,
        });
      }
    };
  }, [id]);
  return (
    <FloatingSurface
      {...props}
      id={id}
      portal
      role="menu"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
          return;
        }
        if (event.key === "Tab") {
          close();
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        event.stopPropagation();
        const items = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not(:disabled)',
          ),
        ];
        const current = items.indexOf(document.activeElement as HTMLElement);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : (current + (event.key === "ArrowDown" ? 1 : items.length - 1)) %
                items.length;
        items[next]?.focus();
      }}
    />
  );
}
