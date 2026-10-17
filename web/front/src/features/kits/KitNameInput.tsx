import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { kitNameLimit, type Kit } from "./domain";
import { kitStore } from "./store";

/** Renaming edits the same local draft as the message; Save persists both. */
export function KitNameInput({
  kit,
  close,
  inline = false,
  change,
}: Readonly<{
  kit: Kit;
  inline?: boolean;
  change?(name: string): void;
  close(changed: boolean, restoreFocus?: boolean): void;
}>) {
  const { t } = useTranslation();
  const [name, setName] = useState(kit.name);
  const [invalid, setInvalid] = useState(false);
  const errorId = useId();
  const input = useRef<HTMLInputElement | HTMLSpanElement>(null);
  const initialName = useRef(kit.name);
  const finished = useRef(false);
  useEffect(() => {
    const element = input.current;
    element?.focus();
    if (element instanceof HTMLInputElement) element.select();
    else if (element) {
      const range = document.createRange();
      range.selectNodeContents(element);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }, []);
  function finish(cancel = false, restoreFocus = false) {
    if (finished.current) return;
    finished.current = true;
    const next = (inline ? (input.current?.textContent ?? "") : name)
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, kitNameLimit);
    const changed =
      !cancel && Boolean(next) && next !== kit.name && kit.can_edit !== false;
    if (changed) {
      if (change) change(next);
      else kitStore.update(kit.id, { name: next });
    }
    close(changed, restoreFocus);
  }
  return (
    <span
      className="kit-name-input"
      onBlur={() => finish(!name.trim())}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") {
          event.preventDefault();
          finish(true, true);
        }
        if (event.key === "Enter") {
          event.preventDefault();
          if (!name.trim()) setInvalid(true);
          else finish(false, true);
        }
      }}
    >
      {inline ? (
        <span
          ref={(element) => {
            input.current = element;
          }}
          className="kit-title-text"
          role="textbox"
          aria-label={t("app.renameKit")}
          aria-multiline={false}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          onInput={(event) => {
            const element = event.currentTarget;
            const raw = element.textContent ?? "";
            const next = raw.replace(/[\r\n]+/g, " ").slice(0, kitNameLimit);
            if (
              !(event.nativeEvent as InputEvent).isComposing &&
              raw !== next
            ) {
              element.textContent = next;
              const range = document.createRange();
              range.selectNodeContents(element);
              range.collapse(false);
              window.getSelection()?.removeAllRanges();
              window.getSelection()?.addRange(range);
            }
            setName(raw === next ? raw : next);
            setInvalid(false);
          }}
        >
          {initialName.current}
        </span>
      ) : (
        <input
          ref={(element) => {
            input.current = element;
          }}
          aria-label={t("app.renameKit")}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          maxLength={kitNameLimit}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setInvalid(false);
          }}
        />
      )}
      {invalid ? (
        <span id={errorId} className="form-error" role="alert">
          {t("app.kitNameRequired")}
        </span>
      ) : null}
    </span>
  );
}
