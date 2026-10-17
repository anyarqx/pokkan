import { Menu, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { Brand } from "../shared/Brand";
import { defaultLocale, isLocale } from "./i18n";
import { AccountMenu } from "../shared/AccountMenu";
import { docsUrl, ResourceLinks, siteLinks } from "../shared/SiteLinks";
import { kitsPath } from "./routes";
import { takeAuthFragment } from "../shared/api";

export function SiteLayout() {
  const { locale } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    // Webhook capabilities no longer belong in cookies sent to static hosting.
    for (const path of [
      "/",
      "/en/kits",
      "/pt-BR/kits",
      "/es/kits",
      "/ja/kits",
    ]) {
      document.cookie = `pokkan-webhook=; Path=${path}; Max-Age=0; SameSite=Strict${window.location.protocol === "https:" ? "; Secure" : ""}`;
    }
  }, []);
  useEffect(() => {
    const hash = takeAuthFragment(location.pathname);
    if (hash && !location.hash)
      navigate(
        { pathname: location.pathname, search: location.search, hash },
        { replace: true },
      );
  }, [location.pathname, location.hash, location.search, navigate]);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const activeLocale = isLocale(locale) ? locale : defaultLocale;

  useEffect(() => {
    if (!open) return;
    navigation.current?.querySelector("a")?.focus();
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof PointerEvent &&
        event.target instanceof Node &&
        (navigation.current?.contains(event.target) ||
          menuButton.current?.contains(event.target))
      )
        return;
      setOpen(false);
      if (event instanceof KeyboardEvent) menuButton.current?.focus();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="site-shell">
      <header className="topbar">
        <Brand />
        <button
          aria-expanded={open}
          aria-controls="public-navigation"
          ref={menuButton}
          aria-label={t("app.menu")}
          className="icon-button mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <X aria-hidden="true" size={19} />
          ) : (
            <Menu aria-hidden="true" size={19} />
          )}
        </button>
        <nav
          id="public-navigation"
          ref={navigation}
          className={open ? "site-nav is-open" : "site-nav"}
          aria-label={t("app.primaryNavigation")}
          onClick={() => setOpen(false)}
          onBlur={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget) &&
              event.relatedTarget !== menuButton.current
            )
              setOpen(false);
          }}
        >
          <NavLink to={kitsPath(activeLocale)}>{t("app.kits")}</NavLink>
          <NavLink to={`/${activeLocale}/about`}>{t("app.about")}</NavLink>
          <a href={docsUrl(activeLocale)}>{t("app.guide")}</a>
        </nav>
        <div className="topbar-tools">
          <AccountMenu />
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <Brand />
            <p>{t("app.footer", { creator: siteLinks.creator })}</p>
            <Link
              className="button quiet footer-invite"
              title={t("contexts.add")}
              aria-label={t("contexts.add")}
              to={`/${activeLocale}/account#servers`}
            >
              <Plus aria-hidden="true" size={15} />
              {t("app.addToDiscord")}
            </Link>
          </div>
          <div className="footer-groups">
            <nav aria-label={t("app.footerLinks")}>
              <h2>Pokkan</h2>
              <Link to={`/${activeLocale}`}>{t("app.home")}</Link>
              <Link to={`/${activeLocale}/about`}>{t("app.about")}</Link>
              <Link to={kitsPath(activeLocale)}>{t("app.kits")}</Link>
              <Link to={`/${activeLocale}/privacy`}>{t("app.privacy")}</Link>
              <a href={docsUrl(activeLocale)}>{t("app.guide")}</a>
            </nav>
            <div className="footer-resources">
              <h2>{t("app.resources")}</h2>
              <ResourceLinks supportPath={`/${activeLocale}/report`} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
