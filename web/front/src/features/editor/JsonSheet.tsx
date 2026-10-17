import { Sheet } from "./Sheet";
import { CircleCheck, Clipboard, FileDown, FileUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [copied, setCopied] = useState(false);
  const exportErrors = useMemo(
    () =>
      validateDiscordOutput(document).filter((item) => item.level === "error"),
    [document],
  );
  const canExportDiscord = kind !== "discord" || exportErrors.length === 0;

  useEffect(() => {
    setDraft(current);
    setError(undefined);
    setNotice(undefined);
  }, [current]);

  async function copy() {
    if (!canExportDiscord) {
      setError(
        t("app.payloadIssuesBeforeCopy", { count: exportErrors.length }),
      );
      return;
    }
    await copyText(draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_600);
  }

  function download() {
    if (!canExportDiscord) {
      setError(
        t("app.payloadIssuesBeforeDownload", { count: exportErrors.length }),
      );
      return;
    }
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
    <Sheet title={t("app.messageJson")} close={close} className="json-sheet">
      <div aria-label={t("app.json")} className="choice-row" role="group">
        <button
          aria-pressed={kind === "discord"}
          onClick={() => setKind("discord")}
          type="button"
        >
          {t("app.discordRequest")}
        </button>
        <button
          aria-pressed={kind === "kit"}
          onClick={() => setKind("kit")}
          type="button"
        >
          {t("app.kitJson")}
        </button>
      </div>
      <label className="json-editor-label" htmlFor="message-json">
        {kind === "discord" ? t("app.discordRequest") : t("app.kitJson")}
      </label>
      <textarea
        aria-describedby={error ? "json-error" : undefined}
        className="json-editor"
        id="message-json"
        onChange={(event) => setDraft(event.target.value)}
        spellCheck="false"
        value={draft}
      />
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
      <footer className="json-actions">
        <button
          className="button quiet"
          disabled={!canExportDiscord}
          onClick={() => void copy()}
          type="button"
        >
          {copied ? (
            <CircleCheck
              className="solid-circle-icon"
              fill="currentColor"
              aria-hidden="true"
              size={16}
            />
          ) : (
            <Clipboard fill="currentColor" aria-hidden="true" size={16} />
          )}
          {copied ? t("app.copied") : t("app.copy")}
        </button>
        <button
          className="button quiet"
          disabled={!canExportDiscord}
          onClick={download}
          type="button"
        >
          <FileDown className="solid-file-icon" aria-hidden="true" size={16} />{" "}
          {t("app.download")}
        </button>
        <button className="button primary" onClick={applyDraft} type="button">
          <FileUp className="solid-file-icon" aria-hidden="true" size={16} />{" "}
          {t("app.applyJson")}
        </button>
      </footer>
    </Sheet>
  );
}
