import { Eye, EyeOff, SendHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { kitsPath, sendKitPath } from "../../app/routes";
import { EditorCanvas } from "../editor/EditorCanvas";
import { useKitPreview } from "./useKitPreview";
import { validateDiscordOutput } from "../editor/schema";
import { webhookCompatibility, WebhookPayloadError, type Kit } from "./domain";
import {
  deliverWebhook,
  deliveredMessageUrl,
  discordWebhookUrl,
  rememberWebhook,
  rememberedWebhook,
} from "./webhook";
import { useNotice } from "../../shared/notifications";
import { docsUrl } from "../../shared/SiteLinks";
import { useSession } from "../../shared/session";

export function SendKit({
  locale,
  kits,
  selectedId,
}: {
  locale: string;
  kits: readonly Kit[];
  selectedId: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notify } = useNotice();
  const kit = kits.find((item) => item.id === selectedId);
  const preview = useKitPreview(kit);
  const scope = useSession().account?.id ?? "guest";
  const [storedUrl, setStoredUrl] = useState(() => ({
    scope,
    url: rememberedWebhook(scope),
  }));
  const webhookUrl = storedUrl.scope === scope ? storedUrl.url : "";
  const setWebhookUrl = (url: string) => setStoredUrl({ scope, url });
  const [sending, setSending] = useState(false);
  const [checkedUrl, setCheckedUrl] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [sent, setSent] = useState<{ kitId: string; url?: string }>();
  const urlInput = useRef<HTMLInputElement>(null);
  const errorId = useId();
  let urlError = "";
  try {
    discordWebhookUrl(webhookUrl);
  } catch (error) {
    urlError =
      error instanceof Error
        ? error.message
        : t("apiErrors.webhook_url_invalid");
  }
  const outputErrors = kit
    ? validateDiscordOutput(kit.message).filter(
        (issue) => issue.level === "error",
      )
    : [];
  const compatibility = kit ? webhookCompatibility(kit.message) : undefined;
  const valid = Boolean(kit) && outputErrors.length === 0 && !compatibility;
  useEffect(() => {
    setStoredUrl({ scope, url: rememberedWebhook(scope) });
    setCheckedUrl(false);
  }, [scope]);

  async function send() {
    if (!kit || !valid || sending) return;
    if (urlError) {
      setCheckedUrl(true);
      urlInput.current?.focus();
      return;
    }
    setSending(true);
    try {
      const delivered = await deliverWebhook(webhookUrl, kit.message);
      setSent({ kitId: kit.id, url: deliveredMessageUrl(delivered) });
      rememberWebhook(webhookUrl, scope);
      notify(t("app.messageSent"), "success");
    } catch (error) {
      notify(
        error instanceof WebhookPayloadError
          ? t(`app.webhookErrors.${error.code}`, {
              fields: error.fields.join(", "),
            })
          : error instanceof Error
            ? error.message
            : t("app.messageSendFailed"),
        "error",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label={t("app.send")} className="kits-send">
      <div className="kits-send-head">
        <label className="form-field kits-send-picker">
          <span>{t("app.kit")}</span>
          <select
            disabled={sending}
            onChange={(event) =>
              navigate(sendKitPath(locale, event.target.value || undefined))
            }
            value={kit?.id ?? ""}
          >
            <option value="">{t("app.selectKit")}</option>
            {kits.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {kit ? (
          <Link className="text-link" to={kitsPath(locale, kit.id)}>
            {t(kit.can_edit === false ? "app.view" : "app.edit")}
          </Link>
        ) : null}
      </div>
      {kit ? (
        <div className="kits-send-body">
          <form
            className="kit-delivery"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label className="form-field">
              <span>{t("app.webhookUrl")}</span>
              <span className="webhook-address">
                <input
                  ref={urlInput}
                  aria-invalid={(checkedUrl && Boolean(urlError)) || undefined}
                  aria-describedby={
                    checkedUrl && urlError ? errorId : undefined
                  }
                  autoComplete="off"
                  onChange={(event) => {
                    const value = event.target.value;
                    setWebhookUrl(value);
                    if (!value) setCheckedUrl(false);
                    if (!value) rememberWebhook("", scope);
                  }}
                  placeholder="https://discord.com/api/webhooks/…"
                  type={showUrl ? "url" : "password"}
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={webhookUrl}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t(
                    showUrl ? "app.hideWebhook" : "app.showWebhook",
                  )}
                  title={t(showUrl ? "app.hideWebhook" : "app.showWebhook")}
                  onClick={() => setShowUrl(!showUrl)}
                >
                  {showUrl ? (
                    <EyeOff aria-hidden="true" size={16} />
                  ) : (
                    <Eye aria-hidden="true" size={16} />
                  )}
                </button>
              </span>
            </label>
            {checkedUrl && urlError ? (
              <p className="form-error" role="alert" id={errorId}>
                {urlError}
              </p>
            ) : null}
            <a
              className="webhook-help"
              href={docsUrl(locale, "guide/create-webhook")}
              target="_blank"
              rel="noreferrer"
            >
              {t("app.webhookHelp")}
            </a>
            {outputErrors.length ? (
              <div role="alert">
                <p>{t("app.fixMessageBeforeSend")}</p>
                <ul>
                  {outputErrors.map((issue, index) => (
                    <li key={index}>{issue.message}</li>
                  ))}
                </ul>
                <Link to={kitsPath(locale, kit.id)}>{t("app.edit")}</Link>
              </div>
            ) : null}
            {compatibility ? (
              <p role="alert">
                {t(`app.webhookErrors.${compatibility.code}`, {
                  fields: compatibility.fields.join(", "),
                })}
              </p>
            ) : null}
            <button
              className="button primary"
              disabled={!valid || !webhookUrl || sending}
              type="submit"
            >
              <SendHorizontal strokeWidth={1.5} aria-hidden="true" size={16} />{" "}
              {sending ? t("app.sending") : t("app.sendNow")}
            </button>
            {sent?.kitId === kit.id ? (
              <p role="status">
                {t("app.messageSent")}
                {sent.url ? (
                  <>
                    {" "}
                    <a href={sent.url} target="_blank" rel="noreferrer">
                      {t("app.openSentMessage")}
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </form>
          <section
            aria-label={t("app.messagePreview")}
            className="kits-send-preview"
          >
            <EditorCanvas
              document={kit.message}
              {...preview}
              previewPlaceholders
              readOnly
            />
          </section>
        </div>
      ) : null}
    </section>
  );
}
