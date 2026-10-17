import { Sheet } from "./Sheet";
import { CircleCheck, Copy, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deserializeDiscordJson,
  deserializePokkanKit,
  ImportError,
  toDiscordJson,
  toPokkanKit,
} from "../kits/domain";
import type { Kit } from "../kits/domain";
import { validateDiscordOutput } from "./schema";
import { copyText } from "../../shared/copy";

type JsonKind = "discord" | "kit";

export function JsonSheet({
  kit,
  close,
  apply,
}: Readonly<{
  kit: Kit;
  close(): void;
  apply(contract: Omit<Kit, "id">): void;
}>) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<JsonKind>("discord");
  const sourceKitId = useRef(kit.id);
  const document = kit.message;
  const current = useMemo(
    () =>
      JSON.stringify(
        kind === "discord" ? toDiscordJson(document) : toPokkanKit(kit),
        null,
        2,
      ),
    [document, kind, kit],
  );
  const [draft, setDraft] = useState(current);
  const [baseline, setBaseline] = useState(current);
  const [baseKind, setBaseKind] = useState(kind);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState<JsonKind | "close">();
  const continueEditing = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (leaving) continueEditing.current?.focus({ preventScroll: true });
  }, [leaving]);
  function leave(next: JsonKind | "close") {
    if (next === kind) return;
    if (draft !== baseline) {
      setLeaving(next);
      return;
    }
    if (next === "close") close();
    else setKind(next);
  }
  const exportErrors = useMemo(
    () =>
      validateDiscordOutput(document).filter((item) => item.level === "error"),
    [document],
  );
  const canExportDiscord = kind !== "discord" || exportErrors.length === 0;

  useEffect(() => {
    // Revalidation may replace the Kit while this sheet has manual edits.
    // Only a deliberate format change or a clean buffer follows new data.
    if (baseKind !== kind || draft === baseline) {
      setDraft(current);
      setBaseline(current);
      setBaseKind(kind);
      setError(undefined);
      if (baseKind !== kind) setNotice(undefined);
    }
  }, [current, kind, baseKind, draft, baseline]);

  async function copy() {
    try {
      await copyText(draft);
      setCopied(true);
      setError(undefined);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      setError(t("app.copyFailed"));
    }
  }

  function download() {
    const blob = new Blob([draft], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download =
      kind === "discord" ? "discord-message.json" : "pokkan-kit.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function applyDraft() {
    if (sourceKitId.current !== kit.id) return;
    try {
      const value: unknown = JSON.parse(draft);
      const data =
        kind === "kit"
          ? deserializePokkanKit(value)
          : { ...kit, message: deserializeDiscordJson(value) };
      apply({
        name: data.name,
        arguments: data.arguments,
        message: data.message,
        placeholders: data.placeholders,
      });
      setBaseline(draft);
      setError(undefined);
      setNotice(t("app.jsonApplied"));
    } catch (cause) {
      setError(
        cause instanceof ImportError
          ? t(`app.importErrors.${cause.code}`)
          : t("app.jsonImportFailed"),
      );
    }
  }

  return (
    <Sheet
      title={t("app.messageJson")}
      close={() => leave("close")}
      className="json-sheet"
    >
      {leaving ? (
        <div className="json-discard">
          <p>{t("app.unsavedJson")}</p>
          <div className="actions">
            <button
              ref={continueEditing}
              className="button"
              onClick={() => setLeaving(undefined)}
              type="button"
            >
              {t("app.continueEditing")}
            </button>
            <button
              className="button danger-confirm"
              onClick={() => {
                if (leaving === "close") close();
                else setKind(leaving);
                setLeaving(undefined);
              }}
              type="button"
            >
              {t("app.discardChanges")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="json-toolbar">
            <div aria-label={t("app.json")} className="choice-row" role="group">
              <button
                aria-pressed={kind === "discord"}
                onClick={() => leave("discord")}
                type="button"
              >
                {t("app.discordRequest")}
              </button>
              <button
                aria-pressed={kind === "kit"}
                onClick={() => leave("kit")}
                type="button"
              >
                {t("app.kitJson")}
              </button>
            </div>
            <div className="json-actions">
              <button
                className="icon-button"
                aria-label={copied ? t("app.copied") : t("app.copy")}
                title={copied ? t("app.copied") : t("app.copy")}
                disabled={!canExportDiscord}
                onClick={() => void copy()}
                type="button"
              >
                {copied ? (
                  <CircleCheck
                    className="solid-circle-icon"
                    aria-hidden="true"
                    size={16}
                  />
                ) : (
                  <Copy aria-hidden="true" size={18} />
                )}
              </button>
              <button
                className="icon-button"
                aria-label={t("app.download")}
                title={t("app.download")}
                disabled={!canExportDiscord}
                onClick={download}
                type="button"
              >
                <Download aria-hidden="true" size={18} />
              </button>
              <button
                className="button quiet"
                disabled={sourceKitId.current !== kit.id}
                onClick={applyDraft}
                type="button"
              >
                {t("app.applyJson")}
              </button>
            </div>
          </div>
          <label className="sr-only" htmlFor="message-json">
            {kind === "discord" ? t("app.discordRequest") : t("app.kitJson")}
          </label>
          <textarea
            aria-describedby={error ? "json-error" : undefined}
            className="json-editor"
            id="message-json"
            onChange={(event) => {
              setDraft(event.target.value);
              setNotice(undefined);
            }}
            spellCheck="false"
            value={draft}
          />
          {sourceKitId.current !== kit.id && (
            <p className="json-notice" role="status">
              {t("app.jsonDifferentMessage")}
            </p>
          )}
          {error ? (
            <p className="form-error" id="json-error" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="json-notice" role="status">
              {notice}
            </p>
          ) : null}
          {!canExportDiscord ? (
            <p className="form-error" role="alert">
              {t("app.discordExportUnavailable", {
                count: exportErrors.length,
              })}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
