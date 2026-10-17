import { ArrowRight, Check, LogOut, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router";
import { defaultLocale, isLocale, localeOptions } from "../app/i18n";
import {
  apiMutation,
  discordInstallUrl,
  discordLoginUrl,
  rememberAuthFragment,
  resetCsrfToken,
} from "../shared/api";
import { DiscordIdentityImage, GuildImage } from "../shared/ContextImages";
import {
  loadContexts,
  selectContext,
  useContexts,
  type GuildContext,
} from "../shared/contexts";
import { PageMeta } from "../shared/PageMeta";
import { refreshSession, useSession } from "../shared/session";
import {
  loadServerMetadata,
  useServerMetadata,
} from "../shared/serverMetadata";

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const { locale = defaultLocale } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [installationResult] = useState(() =>
    new URLSearchParams(location.search).get("installation"),
  );
  const [authorizationResult] = useState(() =>
    new URLSearchParams(location.search).get("authorization"),
  );
  const session = useSession();
  const contexts = useContexts(session.account?.id);
  const metadata = useServerMetadata(
    session.account?.id,
    contexts.selected_context_id,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(id: string) {
    if (!session.account) return;
    try {
      setBusy(true);
      setError("");
      await selectContext(session.account.id, id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("contexts.unavailable"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      setBusy(true);
      resetCsrfToken();
      await apiMutation("/api/v1/auth/session", { method: "DELETE" });
      await refreshSession(true);
      navigate(`/${locale}/kits`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("app.signOutFailed"));
    } finally {
      setBusy(false);
    }
  }

  function changeLocale(next: string) {
    if (!isLocale(next)) return;
    void i18n.changeLanguage(next);
    navigate(`/${next}/account${location.hash}`);
  }

  const guilds = contexts.guilds;
  const installed = guilds.filter((guild) => guild.status === "installed");
  const invite = guilds.filter((guild) => guild.status === "invite");
  const unavailable = guilds.filter((guild) => guild.status === "unavailable");
  const account = session.account;

  return (
    <main className="account-page">
      <PageMeta
        title={t("contexts.accountPage")}
        description={t("contexts.accountDescription")}
        indexable={false}
      />
      <h1>{t("contexts.accountPage")}</h1>
      {session.loading ? (
        <p aria-busy="true">{t("contexts.loading")}</p>
      ) : !account ? (
        <div className="account-signin">
          <p>{t("contexts.signInToManage")}</p>
          <a
            className="button primary"
            href={discordLoginUrl()}
            onClick={() => rememberAuthFragment()}
          >
            {t("app.signIn")} <ArrowRight aria-hidden="true" size={16} />
          </a>
        </div>
      ) : (
        <div className="account-page-layout">
          <section
            className="account-profile"
            aria-label={t("contexts.personal")}
          >
            {account.banner && (
              <img
                alt=""
                className="account-profile-banner"
                referrerPolicy="no-referrer"
                src={`https://cdn.discordapp.com/banners/${account.id}/${encodeURIComponent(account.banner)}.webp?size=512`}
              />
            )}
            <div className="account-profile-body">
              <div className="account-profile-head">
                <div className="account-profile-identity">
                  <DiscordIdentityImage account={account} />
                  <div>
                    <h2>{account.global_name || account.username}</h2>
                    <p>@{account.username}</p>
                  </div>
                </div>
                {contexts.selected_context_id === "personal" ? (
                  <span
                    className="account-profile-selection"
                    role="img"
                    aria-label={t("contexts.current")}
                    title={t("contexts.current")}
                  >
                    <Check aria-hidden="true" size={16} />
                  </span>
                ) : (
                  <button
                    className="button quiet"
                    disabled={busy}
                    onClick={() => void choose("personal")}
                    type="button"
                  >
                    {t("contexts.switchPersonal")}
                  </button>
                )}
              </div>
              <div className="account-preferences">
                <label htmlFor="account-language">{t("app.language")}</label>
                <select
                  id="account-language"
                  onChange={(event) => changeLocale(event.target.value)}
                  value={locale}
                >
                  {localeOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="button quiet"
                  disabled={busy}
                  onClick={() => void signOut()}
                  type="button"
                >
                  <LogOut aria-hidden="true" size={16} /> {t("app.signOut")}
                </button>
              </div>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </section>

          <section className="account-servers" id="servers">
            <div className="account-section-head">
              <h2>{t("contexts.servers")}</h2>
              <button
                aria-label={t("contexts.refresh")}
                className="icon-button"
                disabled={busy || contexts.refreshing}
                onClick={() => void loadContexts(account.id, true)}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={17} />
              </button>
            </div>
            {installationResult &&
              ["installed", "unverified", "cancelled"].includes(
                installationResult,
              ) && (
                <p role="status">
                  {t(`contexts.installation.${installationResult}`)}
                </p>
              )}
            {authorizationResult &&
              ["denied", "failed"].includes(authorizationResult) && (
                <p role="status">
                  {t(`contexts.authorization.${authorizationResult}`)}
                </p>
              )}
            {contexts.authorization_required && (
              <p>
                {t("contexts.authorizeDetail")}{" "}
                <a
                  className="text-link"
                  href={discordLoginUrl()}
                  onClick={() => rememberAuthFragment()}
                >
                  {t("contexts.authorize")} →
                </a>
              </p>
            )}
            {contexts.error && (
              <p className="form-error" role="alert">
                {contexts.error}
              </p>
            )}
            {contexts.loading && (
              <p aria-busy="true">{t("contexts.loading")}</p>
            )}

            {(installed.length > 0 || invite.length > 0) && (
              <div className="account-context-list">
                {installed.map((guild) => (
                  <AccountGuildRow
                    busy={busy}
                    guild={guild}
                    key={guild.id}
                    locale={locale}
                    onSelect={() => void choose(guild.id)}
                    selected={contexts.selected_context_id === guild.id}
                  />
                ))}
                {invite.map((guild) => (
                  <AccountGuildRow
                    busy={busy}
                    guild={guild}
                    key={guild.id}
                    locale={locale}
                    selected={false}
                  />
                ))}
              </div>
            )}

            {contexts.selected_context_id !== "personal" && (
              <div className="account-metadata">
                <span role="status">
                  {metadata.loading
                    ? t("contexts.metadata_updating")
                    : metadata.error ||
                      t(
                        `contexts.metadata_${metadata.data?.error || metadata.data?.status || "unavailable"}`,
                      )}
                </span>
                <button
                  aria-label={t("contexts.refreshMetadata")}
                  className="icon-button"
                  disabled={
                    metadata.loading ||
                    busy ||
                    metadata.denied ||
                    Boolean(metadata.retryAt && metadata.retryAt > Date.now())
                  }
                  onClick={() =>
                    account &&
                    void loadServerMetadata(
                      account.id,
                      contexts.selected_context_id,
                      true,
                    )
                  }
                  title={t("contexts.refreshMetadata")}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={16} />
                </button>
              </div>
            )}

            {unavailable.length > 0 && (
              <details className="account-other-servers">
                <summary>
                  {t("contexts.otherServers", { count: unavailable.length })}
                </summary>
                <div className="account-context-list">
                  {unavailable.map((guild) => (
                    <AccountGuildRow
                      busy={busy}
                      guild={guild}
                      key={guild.id}
                      locale={locale}
                      selected={false}
                    />
                  ))}
                </div>
              </details>
            )}

            {!contexts.loading &&
              !contexts.authorization_required &&
              guilds.length === 0 &&
              !contexts.error && (
                <p className="account-empty">{t("contexts.none")}</p>
              )}
          </section>
        </div>
      )}
    </main>
  );
}

function AccountGuildRow({
  busy,
  guild,
  locale,
  onSelect,
  selected,
}: {
  readonly busy: boolean;
  readonly guild: GuildContext;
  readonly locale: string;
  readonly onSelect?: () => void;
  readonly selected: boolean;
}) {
  const { t } = useTranslation();
  const content = (
    <>
      <GuildImage guild={guild} />
      <span className="account-context-name">
        <strong>{guild.name}</strong>
        {guild.status === "unavailable" && (
          <small>{t("contexts.notEligible")}</small>
        )}
      </span>
      {guild.banner && (
        <img
          alt=""
          className="account-guild-banner"
          referrerPolicy="no-referrer"
          src={`https://cdn.discordapp.com/banners/${guild.id}/${encodeURIComponent(guild.banner)}.webp?size=256`}
        />
      )}
    </>
  );

  if (guild.status === "installed")
    return (
      <button
        aria-pressed={selected}
        className="account-context-row"
        disabled={busy}
        onClick={onSelect}
        type="button"
      >
        {content}
        <span
          className="account-context-action"
          title={selected ? t("contexts.current") : undefined}
        >
          {selected ? (
            <Check aria-hidden="true" size={16} />
          ) : (
            t("contexts.select")
          )}
        </span>
      </button>
    );
  if (guild.status === "invite")
    return (
      <a
        aria-label={`${t("contexts.add")}: ${guild.name}`}
        className="account-context-row"
        onClick={() =>
          rememberAuthFragment(
            `${window.location.origin}/${locale}/account#servers`,
          )
        }
        href={discordInstallUrl(
          guild.id,
          `${window.location.origin}/${locale}/account#servers`,
        )}
      >
        {content}
        <span className="account-context-action">
          <Plus aria-hidden="true" size={16} />
          {t("contexts.add")}
        </span>
      </a>
    );
  return <div className="account-context-row is-unavailable">{content}</div>;
}
