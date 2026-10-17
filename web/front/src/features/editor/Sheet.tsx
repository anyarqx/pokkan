import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** All editor sheets share focus, dismissal and scrolling behavior. */
export function Sheet({
  title,
  close,
  children,
  className = "",
}: Readonly<{
  title: string;
  close(): void;
  children: ReactNode;
  className?: string;
}>) {
  const { t } = useTranslation();
  const sheet = useRef<HTMLElement>(null);
  const closeAction = useRef(close);
  closeAction.current = close;
  useEffect(() => {
    // Disabling a focused submit button can return browser focus to the body.
    const outsideKey = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (
        event.target !== document.body &&
        event.target !== document.documentElement &&
        event.target !== window
      )
        return;
      event.stopPropagation();
      if (event.key === "Escape") closeAction.current();
      if (event.key === "Tab") {
        event.preventDefault();
        const items = [
          ...(sheet.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
          ) ?? []),
        ].filter((item) => item.getClientRects().length);
        (event.shiftKey ? items.at(-1) : items[0])?.focus();
      }
    };
    window.addEventListener("keydown", outsideKey, true);
    return () => window.removeEventListener("keydown", outsideKey, true);
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const siblings: [HTMLElement, boolean][] = [];
    let branch = sheet.current?.parentElement;
    while (branch && branch !== document.body) {
      for (const sibling of branch.parentElement?.children ?? []) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          siblings.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const content = sheet.current?.querySelector<HTMLElement>(".sheet-content");
    const initial =
      content?.querySelector<HTMLElement>(
        "[data-autofocus], input:not(:disabled), textarea:not(:disabled), select:not(:disabled)",
      ) ?? sheet.current?.querySelector<HTMLElement>("h2");
    initial?.focus({ preventScroll: true });
    return () => {
      siblings.forEach(([element, inert]) => {
        element.inert = inert;
      });
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="sheet-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      role="presentation"
    >
      <section
        ref={sheet}
        aria-label={title}
        aria-modal="true"
        role="dialog"
        className={`component-sheet ${className}`}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          }
          if (event.key !== "Tab") return;
          const items = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
            ),
          ].filter((item) => item.getClientRects().length);
          const first = items[0],
            last = items.at(-1);
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              !items.includes(document.activeElement as HTMLElement))
          ) {
            event.preventDefault();
            last?.focus();
          } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
              !items.includes(document.activeElement as HTMLElement))
          ) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header>
          <h2 tabIndex={-1}>{title}</h2>
          <button
            aria-label={t("app.close")}
            className="icon-button"
            onClick={close}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="sheet-content">{children}</div>
      </section>
    </div>
  );
}
