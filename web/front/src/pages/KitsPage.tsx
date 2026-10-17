import {
  LayoutGrid,
  Plus,
  MessageSquare,
  SendHorizontal,
  Upload,
} from "lucide-react";
import { type FormEvent, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { KitList } from "../features/kits/KitList";
import { SendKit } from "../features/kits/SendKit";
import { useKits } from "../shared/useKits";
import { kitNameLimit, type MessageFormat } from "../features/kits/domain";
import {
  buildBuiltInExample,
  buildStarterMessage,
  isBuiltInExample,
} from "../features/kits/presets";
import { KitImportError, kitStore } from "../features/kits/store";
import { PageMeta } from "../shared/PageMeta";
import { defaultLocale } from "../app/i18n";
import { kitsPath, sendKitPath } from "../app/routes";
import { useSession } from "../shared/session";
import { useContexts } from "../shared/contexts";

export function KitsPage() {
  const { t } = useTranslation();
  const { locale = defaultLocale } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const allKits = useKits();
  const session = useSession();
  const contexts = useContexts(session.account?.id);
  const contextId = contexts.selected_context_id;
  const selectedGuild = contexts.guilds.find(
    (guild) => guild.id === contextId && guild.status === "installed",
  );
  const contextReady =
    !contexts.loading && (contextId === "personal" || Boolean(selectedGuild));
  const kits = contextReady
    ? allKits.filter((kit) => (kit.guild_id ?? "personal") === contextId)
    : [];
  const handledExample = useRef<string | undefined>(undefined);
  const [kind, setKind] = useState<"new" | "import">("new");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<MessageFormat>("componentsV2");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const search = new URLSearchParams(location.search);
  const selectedId = search.get("kit");
  const sending = search.has("send") || search.has("kit");
  const existingNames = new Set(
    kits.map((kit) => kit.name.toLocaleLowerCase(locale)),
  );
  let suggestedName = "";
  for (let number = 1; number <= kits.length + 1; number++) {
    const candidate = t(
      `app.suggestedKitName.${kind === "import" ? "import" : mode}`,
      {
        number,
      },
    );
    if (!existingNames.has(candidate.toLocaleLowerCase(locale))) {
      suggestedName = candidate;
      break;
    }
  }

  useEffect(() => {
    if (!contextReady) return;
    const value = new URLSearchParams(location.search).get("example");
    if (!value || handledExample.current === value) return;
    handledExample.current = value;
    if (!isBuiltInExample(value)) return;
    const origin =
      typeof window === "undefined"
        ? "https://pokkan.net"
        : window.location.origin;
    const example = buildBuiltInExample(value, locale, t, origin);
    const kit = kitStore.createDraft(
      example.name,
      example.message,
      contextId === "personal" ? undefined : contextId,
    );
    navigate(kitsPath(locale, kit.id), { replace: true });
  }, [contextId, contextReady, locale, location.search, navigate, t]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!contextReady) return;
    const normalizedName = name.trim() || suggestedName;

    try {
      const kit =
        kind === "new"
          ? kitStore.createDraft(
              normalizedName,
              buildStarterMessage(mode, t),
              contextId === "personal" ? undefined : contextId,
            )
          : kitStore.import(
              normalizedName,
              raw,
              contextId === "personal" ? undefined : contextId,
            );
      navigate(kitsPath(locale, kit.id));
    } catch (cause) {
      if (cause instanceof KitImportError) {
        setError(t(`app.importErrors.${cause.code}`));
      } else {
        setError(cause instanceof Error ? cause.message : t("app.invalidJson"));
      }
    }
  }

  if (!contextReady)
    return (
      <div className="kits-page">
        <PageMeta
          description={t("meta.kitsDescription")}
          title={t("app.kits")}
        />
        <section className="workspace-intro">
          <h1>{t("app.kits")}</h1>
        </section>
        <p role="status">
          {contexts.loading ? t("contexts.loading") : t("contexts.unavailable")}
        </p>
      </div>
    );

  const library = (
    <div className="kits-library">
      {(kits.length > 0 || contextId !== "personal") && (
        <section aria-labelledby="existing-kits-title">
          <h2 id="existing-kits-title">
            {t(contextId === "personal" ? "app.yourKits" : "app.serverKits")}
          </h2>
          {kits.length > 0 ? <KitList kits={kits} /> : <p>{t("app.noKits")}</p>}
        </section>
      )}
      <section aria-labelledby="kit-examples-title">
        <h2 id="kit-examples-title">{t("app.startExample")}</h2>
        <ul className="kit-examples">
          {(
            [
              ["legacy", "legacy"],
              ["components-v2", "componentsV2"],
              ["poll", "polls"],
            ] as const
          ).map(([id, label]) => (
            <li key={id}>
              <Link
                className="text-link"
                to={`${kitsPath(locale)}?example=${id}`}
              >
                {t(`landing.${label}`)} →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  return (
    <div className="kits-page">
      <PageMeta description={t("meta.kitsDescription")} title={t("app.kits")} />
      <section className="workspace-intro">
        <div className="kits-heading">
          <h1>{t("app.kits")}</h1>
          <span>{selectedGuild?.name ?? t("contexts.personal")}</span>
        </div>
      </section>
      <div
        className="choice-row kits-actions"
        role="group"
        aria-label={t("app.kits")}
      >
        <button
          aria-pressed={!sending && kind === "new"}
          onClick={() => {
            setKind("new");
            setError("");
            if (sending) navigate(kitsPath(locale));
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={16} /> {t("app.newKit")}
        </button>
        <button
          aria-pressed={!sending && kind === "import"}
          onClick={() => {
            setKind("import");
            setError("");
            if (sending) navigate(kitsPath(locale));
          }}
          type="button"
        >
          <Upload aria-hidden="true" size={16} /> {t("app.importKit")}
        </button>
        <button
          aria-pressed={sending}
          onClick={() => navigate(sendKitPath(locale))}
          type="button"
        >
          <SendHorizontal strokeWidth={1.5} aria-hidden="true" size={16} />{" "}
          {t("app.send")}
        </button>
      </div>
      {sending ? (
        kits.length > 0 ? (
          <SendKit kits={kits} locale={locale} selectedId={selectedId} />
        ) : (
          <div className="kits-send-empty">
            <p>{t("app.sendNeedsKit")}</p>
            <button
              className="button primary"
              onClick={() => navigate(kitsPath(locale))}
              type="button"
            >
              {t("app.createKit")}
            </button>
          </div>
        )
      ) : (
        <div className="kits-layout">
          <section
            className="kit-create"
            aria-label={
              kind === "new" ? t("app.createKit") : t("app.importKit")
            }
          >
            <form onSubmit={submit}>
              <div className="form-field">
                <label htmlFor="kit-name">{t("app.kitName")}</label>
                <input
                  autoComplete="off"
                  id="kit-name"
                  maxLength={kitNameLimit}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={suggestedName}
                  value={name}
                />
              </div>
              {kind === "new" ? (
                <fieldset className="mode-picker choice-switch format-switch">
                  <legend>{t("app.kitFormat")}</legend>
                  <label>
                    <input
                      checked={mode === "legacy"}
                      name="mode"
                      onChange={() => setMode("legacy")}
                      type="radio"
                    />
                    <span>
                      <MessageSquare
                        fill="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                        size={17}
                      />
                      <div>
                        {t("app.legacy")}
                        <small>{t("app.legacyChoice")}</small>
                      </div>
                    </span>
                  </label>
                  <label>
                    <input
                      checked={mode === "componentsV2"}
                      name="mode"
                      onChange={() => setMode("componentsV2")}
                      type="radio"
                    />
                    <span>
                      <LayoutGrid
                        fill="currentColor"
                        strokeWidth={1.5}
                        aria-hidden="true"
                        size={17}
                      />
                      <div>
                        {t("app.componentsV2")}
                        <small>{t("app.v2Choice")}</small>
                      </div>
                    </span>
                  </label>
                </fieldset>
              ) : (
                <div className="form-field">
                  <label htmlFor="kit-json">{t("app.importJson")}</label>
                  <textarea
                    id="kit-json"
                    onChange={(event) => setRaw(event.target.value)}
                    placeholder={t("app.importJsonPlaceholder")}
                    required
                    value={raw}
                  />
                </div>
              )}
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                className="button primary"
                disabled={!contextReady}
                type="submit"
              >
                <Plus aria-hidden="true" size={16} />{" "}
                {kind === "new" ? t("app.createKit") : t("app.importKit")}
              </button>
            </form>
          </section>
          {library}
        </div>
      )}
    </div>
  );
}
