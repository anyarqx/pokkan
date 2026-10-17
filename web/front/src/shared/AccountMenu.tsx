import { Check, ChevronDown, Languages, LogIn, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { defaultLocale, isLocale, localeOptions } from "../app/i18n";
import { discordLoginUrl, rememberAuthFragment } from "./api";
import { loadContexts, selectContext, useContexts } from "./contexts";
import { DiscordIdentityImage, GuildImage } from "./ContextImages";
import { FloatingSurface } from "./FloatingSurface";
import { useSession } from "./session";

export function AccountMenu() {
  const { t, i18n } = useTranslation();
  const { locale = defaultLocale } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const contexts = useContexts(session.account?.id);
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const languageTrigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session.loading) return;
    const search = new URLSearchParams(location.search);
    const choose = search.has("choose_context");
    const installed = search.has("installation");
    const authorization = search.has("authorization");
    if (!choose && !installed && !authorization) return;
    search.delete("choose_context");
    search.delete("installation");
    search.delete("authorization");
    navigate(
      {
        pathname: location.pathname,
        search: search.toString(),
        hash: location.hash,
      },
      { replace: true },
    );
    if (session.account) {
      if (choose) setOpen(true);
      if (installed) void loadContexts(session.account.id);
    }
  }, [
    location.hash,
    location.pathname,
    location.search,
    navigate,
    session.account,
    session.loading,
  ]);

  useEffect(() => {
    if (!open && !languageOpen) return;
    if (open)
      root.current
        ?.querySelector<HTMLElement>(".context-popover button")
        ?.focus();
    if (languageOpen)
      root.current
        ?.querySelector<HTMLElement>('[role="menuitemradio"]')
        ?.focus();
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setOpen(false);
        setLanguageOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      (languageOpen ? languageTrigger : trigger).current?.focus();
      setLanguageOpen(false);
      setOpen(false);
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [languageOpen, open]);

  function changeLocale(next: string) {
    if (!isLocale(next)) return;
    void i18n.changeLanguage(next);
    const parts = location.pathname.split("/").filter(Boolean);
    parts[0] = next;
    navigate(`/${parts.join("/")}${location.search}${location.hash}`);
    setLanguageOpen(false);
  }

  if (!session.account)
    return !session.loading ? (
      <div className="public-account-actions" ref={root}>
        <button
          aria-expanded={languageOpen}
          aria-label={t("app.language")}
          className="icon-button"
          onClick={() => setLanguageOpen((value) => !value)}
          ref={languageTrigger}
          type="button"
        >
          <Languages aria-hidden="true" size={17} />
        </button>
        {languageOpen && (
          <FloatingSurface
            anchorRef={languageTrigger}
            aria-label={t("app.language")}
            className="account-language-menu"
            onKeyDown={(event) => {
              const items = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  'button[role="menuitemradio"]',
                ),
              ];
              const index = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === "ArrowDown"
                  ? (index + 1) % items.length
                  : event.key === "ArrowUp"
                    ? (index - 1 + items.length) % items.length
                    : undefined;
              if (next !== undefined) {
                event.preventDefault();
                items[next]?.focus();
              }
            }}
            placement="bottom-end"
            role="menu"
          >
            {localeOptions.map((option) => (
              <button
                aria-checked={locale === option.code}
                key={option.code}
                lang={option.code}
                onClick={() => changeLocale(option.code)}
                role="menuitemradio"
                type="button"
              >
                {option.label}
              </button>
            ))}
          </FloatingSurface>
        )}
        <a
          aria-label={t("app.signIn")}
          className="icon-button"
          href={discordLoginUrl()}
          onClick={() => rememberAuthFragment()}
          title={t("app.signIn")}
        >
          <LogIn aria-hidden="true" size={18} />
        </a>
      </div>
    ) : null;

  const account = session.account;
  const selectedGuild = contexts.guilds.find(
    (guild) => guild.id === contexts.selected_context_id,
  );
  const selectedName = selectedGuild?.name || t("contexts.personalShort");
  async function choose(id: string) {
    try {
      setActionError("");
      await selectContext(account.id, id);
      setOpen(false);
      trigger.current?.focus();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("contexts.unavailable"),
      );
    }
  }

  return (
    <div className="account-menu" ref={root}>
      <button
        aria-expanded={open}
        aria-label={`${t("contexts.choose")}: ${selectedName}`}
        className="account-trigger"
        onClick={() => setOpen((value) => !value)}
        ref={trigger}
        type="button"
      >
        <span>{selectedName}</span>
        <ChevronDown aria-hidden="true" size={15} />
      </button>
      <Link
        aria-label={t("contexts.accountPage")}
        className="account-avatar-link"
        onClick={() => setOpen(false)}
        title={t("contexts.accountPage")}
        to={`/${locale}/account`}
      >
        <DiscordIdentityImage account={account} />
      </Link>
      {open && (
        <FloatingSurface
          anchorRef={trigger}
          aria-label={t("contexts.choose")}
          className="context-popover"
          onBlur={(event) => {
            if (!root.current?.contains(event.relatedTarget)) setOpen(false);
          }}
          onKeyDown={(event) => {
            const items = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                "button:not(:disabled), a[href]",
              ),
            ];
            const index = items.indexOf(document.activeElement as HTMLElement);
            const next =
              event.key === "ArrowDown"
                ? (index + 1) % items.length
                : event.key === "ArrowUp"
                  ? (index - 1 + items.length) % items.length
                  : undefined;
            if (next !== undefined) {
              event.preventDefault();
              items[next]?.focus();
            }
          }}
          placement="bottom-end"
          role="dialog"
        >
          <div className="context-popover-list">
            <button
              aria-current={
                contexts.selected_context_id === "personal" ? "true" : undefined
              }
              className="context-option"
              onClick={() => void choose("personal")}
              type="button"
            >
              <DiscordIdentityImage account={account} />
              <span>
                <strong>{account.global_name || account.username}</strong>
                <small>{t("contexts.personal")}</small>
              </span>
              {contexts.selected_context_id === "personal" && (
                <Check aria-hidden="true" size={16} />
              )}
            </button>
            {contexts.loading && (
              <p className="context-note">{t("contexts.loading")}</p>
            )}
            {contexts.guilds.length > 0 && (
              <div className="context-option-group">
                <p className="context-group-label">{t("contexts.servers")}</p>
                {contexts.guilds.map((guild) => (
                  <button
                    aria-current={
                      contexts.selected_context_id === guild.id
                        ? "true"
                        : undefined
                    }
                    className="context-option"
                    key={guild.id}
                    onClick={() => void choose(guild.id)}
                    type="button"
                  >
                    <GuildImage guild={guild} />
                    <span>
                      <strong>{guild.name}</strong>
                    </span>
                    {contexts.selected_context_id === guild.id && (
                      <Check aria-hidden="true" size={16} />
                    )}
                  </button>
                ))}
              </div>
            )}
            <div className="context-option-group">
              <Link
                className="context-option context-add"
                onClick={() => setOpen(false)}
                to={`/${locale}/account#servers`}
              >
                <Plus aria-hidden="true" size={17} />
                <span>{t("contexts.add")}</span>
              </Link>
            </div>
            {contexts.error && (
              <p className="context-note" role="alert">
                {contexts.error}
              </p>
            )}
            {actionError && (
              <p className="context-note" role="alert">
                {actionError}
              </p>
            )}
          </div>
        </FloatingSurface>
      )}
    </div>
  );
}
