import { ArrowBigLeft, ArrowBigRight, Plus, PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useParams } from "react-router";
import { KitList } from "../features/kits/KitList";
import { useKits } from "../shared/useKits";
import { listKits } from "../features/kits/api";
import { kitStore } from "../features/kits/store";
import { refreshSession, useSession } from "../shared/session";
import { loadContexts, useContexts } from "../shared/contexts";
import { clearServerMetadata } from "../shared/serverMetadata";
import { useNotice } from "../shared/notifications";
import { ApiError } from "../shared/api";
import { kitsPath } from "./routes";
import { defaultLocale } from "./i18n";
import { ACCESS_FRESH_FOR, onForeground } from "../shared/foreground";

export function WorkspaceLayout() {
  const { locale = defaultLocale } = useParams();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { notify } = useNotice();
  const kits = useKits();
  const session = useSession();
  const contexts = useContexts(session.account?.id);
  const contextId = contexts.selected_context_id;
  const contextAvailable =
    contextId === "personal" ||
    contexts.guilds.some((guild) => guild.id === contextId);
  const visibleKits = contextAvailable
    ? kits.filter((kit) => (kit.guild_id ?? "personal") === contextId)
    : [];
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(
    () => window.matchMedia?.("(max-width: 640px)").matches ?? false,
  );
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const closeMobile = () => {
    setMobileOpen(false);
    mobileTrigger.current?.focus();
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.key]);

  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 640px)");
    if (!query) return;
    const resize = () => {
      setCompact(query.matches);
      setMobileOpen(false);
    };
    query.addEventListener("change", resize);
    return () => query.removeEventListener("change", resize);
  }, []);

  useEffect(() => {
    if (!mobileOpen || !compact) return;
    const hidden = new Map<HTMLElement, boolean>();
    // Make the drawer modal without moving or remounting its navigation.
    let branch: HTMLElement | null = sidebar.current;
    while (branch?.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (
          sibling instanceof HTMLElement &&
          sibling !== branch &&
          !sibling.classList.contains("sidebar-backdrop")
        ) {
          hidden.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    sidebar.current?.querySelector<HTMLElement>("a")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (document.querySelector('[role="menu"]')) return;
      if (event.key === "Escape") closeMobile();
      if (event.key !== "Tab") return;
      const items = [
        ...(sidebar.current?.querySelectorAll<HTMLElement>(
          "a, button:not(:disabled), input:not(:disabled)",
        ) ?? []),
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
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      hidden.forEach((inert, element) => {
        element.inert = inert;
      });
      if (mobileTrigger.current?.getClientRects().length)
        mobileTrigger.current.focus();
      else sidebar.current?.querySelector<HTMLElement>("a")?.focus();
    };
  }, [mobileOpen, compact]);

  useEffect(() => {
    const owner = session.account?.id;
    if (!owner || contexts.loading) return;
    let active = true;
    const load = (attempt = 0): Promise<void> => {
      const startedAt = kitStore.savedVersion();
      return listKits(contextId, owner).then((items) => {
        if (
          active &&
          !kitStore.replaceSaved(items, owner, contextId, startedAt) &&
          attempt === 0
        )
          return load(1);
      });
    };
    let pending = false;
    let checkedAt = 0;
    const refresh = () => {
      if (
        pending ||
        Date.now() - checkedAt < ACCESS_FRESH_FOR ||
        document.visibilityState === "hidden"
      )
        return;
      checkedAt = Date.now();
      pending = true;
      void load()
        .catch((error: unknown) => {
          if (active) {
            if (
              error instanceof ApiError &&
              (error.status === 401 ||
                error.status === 403 ||
                error.status === 404)
            ) {
              kitStore.clearSavedContext(owner, contextId);
              clearServerMetadata();
              if (error.status === 401) void refreshSession();
              else void loadContexts(owner);
            }
            notify(
              error instanceof Error
                ? error.message
                : i18n.t("app.kitLoadFailed"),
              "error",
            );
          }
        })
        .finally(() => {
          pending = false;
        });
    };
    refresh();
    const stop = onForeground(refresh);
    return () => {
      active = false;
      stop();
    };
  }, [session.account?.id, contexts.loading, contextId, notify, i18n]);

  const workspaceClass = `workspace${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`;

  return (
    <div className={workspaceClass}>
      <button
        className="workspace-menu-trigger button"
        ref={mobileTrigger}
        aria-expanded={mobileOpen}
        aria-controls="workspace-sidebar"
        onClick={() => setMobileOpen(true)}
      >
        <PanelLeftOpen aria-hidden="true" size={17} /> {t("app.kits")}
      </button>
      <div
        className="sidebar-backdrop"
        aria-hidden="true"
        onClick={closeMobile}
      />
      <aside
        id="workspace-sidebar"
        ref={sidebar}
        className={`sidebar${mobileOpen ? " is-mobile-open" : ""}`}
        inert={compact && !mobileOpen}
        role={compact && mobileOpen ? "dialog" : undefined}
        aria-modal={compact && mobileOpen ? true : undefined}
        aria-label={compact ? t("app.kits") : undefined}
      >
        <div className="sidebar-top">
          <Link
            aria-label={t("app.createKit")}
            title={t("app.createKit")}
            onClick={closeMobile}
            to={kitsPath(locale)}
          >
            <Plus aria-hidden="true" size={17} />
            <span>{t("app.createKit")}</span>
          </Link>
          <button
            aria-label={
              !compact && collapsed
                ? t("app.openSidebar")
                : t("app.closeSidebar")
            }
            className="sidebar-collapse icon-button"
            onClick={() =>
              compact ? closeMobile() : setCollapsed((value) => !value)
            }
            type="button"
          >
            {!compact && collapsed ? (
              <ArrowBigRight aria-hidden="true" size={16} />
            ) : (
              <ArrowBigLeft aria-hidden="true" size={16} />
            )}
          </button>
        </div>
        <nav aria-label={t("app.kitNavigation")}>
          <div className="sidebar-group">
            <div className="sidebar-group-title">
              <span>{t("app.kits")}</span>
            </div>
            {visibleKits.length === 0 ? (
              <p className="sidebar-empty">{t("app.noKits")}</p>
            ) : (
              <KitList
                kits={visibleKits}
                onRename={() => setCollapsed(false)}
              />
            )}
          </div>
        </nav>
      </aside>
      <main className="workspace-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
