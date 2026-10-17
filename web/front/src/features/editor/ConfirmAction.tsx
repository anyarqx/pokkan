import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Sheet } from "./Sheet";

/** Destructive document operations require a decision away from the original trigger. */
export function ConfirmAction({
  title,
  description,
  label,
  confirm,
  close,
}: Readonly<{
  title: string;
  description: string;
  label: string;
  confirm(): void | boolean | Promise<void | boolean>;
  close(): void;
}>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return createPortal(
    <Sheet
      title={title}
      close={() => {
        if (!busy) close();
      }}
      className="confirm-sheet"
    >
      <p>{description}</p>
      {failed && (
        <p className="form-error" role="alert">
          {t("app.kitDeleteFailed")}
        </p>
      )}
      <div className="actions">
        <button
          className="button"
          data-autofocus
          disabled={busy}
          onClick={close}
          type="button"
        >
          {t("app.cancel")}
        </button>
        <button
          className="button danger-confirm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setFailed(false);
            try {
              if ((await confirm()) !== false) close();
              else setFailed(true);
            } catch {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
          type="button"
        >
          {label}
        </button>
      </div>
    </Sheet>,
    document.body,
  );
}
