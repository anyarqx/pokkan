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
  useEffect(() => {
    // Disabling a focused submit button can return browser focus to the body.
    const outsideKey = (event: KeyboardEvent) => {
      if (
        event.target !== document.body &&
        event.target !== document.documentElement &&
        event.target !== window
      )
        return;
      event.stopPropagation();
      if (event.key === "Escape") close();
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
  }, [close]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
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
          if (event.key === "Escape") {
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
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header>
          <h2>{title}</h2>
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
