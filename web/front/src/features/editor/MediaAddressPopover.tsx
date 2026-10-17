import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { FloatingSurface } from "../../shared/FloatingSurface";

export function MediaAddressPopover({
  anchor,
  change,
  close,
  label,
  value,
  hint,
  beginEdit,
  endEdit,
}: Readonly<{
  anchor: RefObject<HTMLElement | null>;
  change(value: string): void;
  close(): void;
  label: string;
  value: string;
  hint?: string;
  beginEdit(): void;
  endEdit(): void;
}>) {
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !anchor.current?.contains(event.target) &&
        !surface.current?.contains(event.target)
      ) {
        endEdit();
        close();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      endEdit();
      close();
      anchor.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [anchor, close, endEdit]);
  return createPortal(
    <div ref={surface}>
      <FloatingSurface
        anchorRef={anchor}
        aria-label={label}
        className="editor-popover media-address-popover"
        onClick={(event) => event.stopPropagation()}
        placement="top-start"
        role="dialog"
      >
        <input
          aria-label={label}
          autoFocus
          onBlur={endEdit}
          onChange={(event) => change(event.target.value)}
          onFocus={beginEdit}
          placeholder={hint ? "attachment://file.pdf" : label}
          title={hint}
          value={value}
        />
      </FloatingSurface>
    </div>,
    document.body,
  );
}
