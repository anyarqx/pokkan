import {
  LayoutGrid,
  Copy,
  MessageSquare,
  MoreHorizontal,
  Pen,
  Eye,
  Trash2,
  Share2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate, useParams } from "react-router";
import { defaultLocale } from "../../app/i18n";
import { kitsPath } from "../../app/routes";
import { FloatingSurface } from "../../shared/FloatingSurface";
import { useNotice } from "../../shared/notifications";
import { deleteKit } from "./api";
import { messageFormat, type Kit } from "./domain";
import { kitStore } from "./store";
import { KitNameInput } from "./KitNameInput";
import { ShareSheet } from "./ShareSheet";
import { ConfirmAction } from "../editor/ConfirmAction";

export function KitList({
  kits,
  onRename,
}: Readonly<{ kits: readonly Kit[]; onRename?(): void }>) {
  const { locale = defaultLocale } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotice();
  const [kitMenu, setKitMenu] = useState<{
    kitId: string;
    x: number;
    y: number;
    atPointer?: boolean;
  }>();
  const [renaming, setRenaming] = useState<string>();
  const [sharing, setSharing] = useState<Kit>();
  const [deleting, setDeleting] = useState<Kit>();
  const menuTrigger = useRef<HTMLElement | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const menuKit = kits.find((kit) => kit.id === kitMenu?.kitId);
  const menuKitId = menuKit?.id;
  function rename(id: string) {
    onRename?.();
    setRenaming(id);
    setKitMenu(undefined);
  }
  useEffect(() => setKitMenu(undefined), [location.key]);
  useEffect(() => {
    if (!menuKitId) {
      setKitMenu(undefined);
      return;
    }
    const close = (event?: Event) => {
      if (
        event?.type === "pointerdown" &&
        event.target instanceof Node &&
        menuTrigger.current?.contains(event.target)
      )
        return;
      setKitMenu(undefined);
      menuTrigger.current?.focus();
    };
    document.querySelector<HTMLElement>(".site-context-menu button")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", close);
    };
  }, [menuKitId]);

  const openKitMenu = (kitId: string, event: ReactMouseEvent) => {
    event.preventDefault();
    if (event.type !== "contextmenu" && kitMenu?.kitId === kitId) {
      setKitMenu(undefined);
      return;
    }
    menuTrigger.current = event.currentTarget as HTMLElement;
    const rect = event.currentTarget.getBoundingClientRect();
    setKitMenu({
      kitId,
      x: event.type === "contextmenu" ? event.clientX : rect.right,
      y: event.type === "contextmenu" ? event.clientY : rect.bottom,
      atPointer: event.type === "contextmenu",
    });
  };

  const removeKit = async () => {
    if (!deleting) return;
    const id = deleting.id;
    const kit = kitStore.find(id);
    try {
      if (kitStore.isSaved(id)) await deleteKit(id, kit?.revision);
      kitStore.remove(id);
      setKitMenu(undefined);
      if (kit && location.pathname.includes(`/kits/${kit.id}`))
        navigate(kitsPath(locale));
    } catch (error) {
      notify(
        error instanceof Error ? error.message : t("app.kitDeleteFailed"),
        "error",
      );
      return false;
    }
  };

  return (
    <>
      <div className="kit-list" ref={list}>
        {kits.map((kit) => (
          <div className="kit-list-item" key={kit.id}>
            {renaming === kit.id ? (
              <KitNameInput
                kit={kit}
                close={(changed, restoreFocus) => {
                  setRenaming(undefined);
                  if (changed) navigate(kitsPath(locale, kit.id));
                  if (restoreFocus)
                    requestAnimationFrame(() =>
                      list.current
                        ?.querySelector<HTMLAnchorElement>(
                          `a[href="${kitsPath(locale, kit.id)}"]`,
                        )
                        ?.focus(),
                    );
                }}
              />
            ) : (
              <NavLink
                aria-label={kit.name}
                title={kit.name}
                onContextMenu={(event) => openKitMenu(kit.id, event)}
                onKeyDown={(event) => {
                  if (event.key === "F2" && kit.can_edit !== false) {
                    event.preventDefault();
                    rename(kit.id);
                  }
                }}
                to={kitsPath(locale, kit.id)}
              >
                {messageFormat(kit.message) === "legacy" ? (
                  <MessageSquare
                    fill="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                    size={16}
                  />
                ) : (
                  <LayoutGrid
                    fill="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                    size={16}
                  />
                )}
                <span>{kit.name}</span>
              </NavLink>
            )}
            <button
              className="icon-button kit-menu-trigger"
              aria-label={t("app.kitActions", { name: kit.name })}
              aria-haspopup="menu"
              aria-expanded={kitMenu?.kitId === kit.id}
              onClick={(event) => openKitMenu(kit.id, event)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
            >
              <MoreHorizontal aria-hidden="true" size={17} />
            </button>
          </div>
        ))}
      </div>
      {kitMenu ? (
        <FloatingSurface
          className="site-context-menu"
          gap={0}
          portal
          anchorRef={kitMenu.atPointer ? undefined : menuTrigger}
          onPointerDown={(event) => event.stopPropagation()}
          point={kitMenu.atPointer ? kitMenu : undefined}
          role="menu"
          onKeyDown={(event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              setKitMenu(undefined);
              menuTrigger.current?.focus();
              return;
            }
            const items = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button",
              ),
            ];
            const index = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "ArrowDown"
                ? (index + 1) % items.length
                : event.key === "ArrowUp"
                  ? (index + items.length - 1) % items.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : undefined;
            if (next !== undefined) {
              event.preventDefault();
              items[next]?.focus();
            }
          }}
        >
          <button
            onClick={() => {
              const kit = kitStore.find(kitMenu.kitId);
              if (kit) navigate(kitsPath(locale, kit.id));
              setKitMenu(undefined);
            }}
            role="menuitem"
            type="button"
          >
            {menuKit?.can_edit === false ? (
              <Eye aria-hidden="true" size={15} />
            ) : (
              <Pen strokeWidth={1.5} aria-hidden="true" size={15} />
            )}
            {menuKit?.can_edit === false ? t("app.view") : t("app.edit")}
          </button>
          <button
            onClick={() => {
              const copy = kitStore.duplicate(kitMenu.kitId);
              setKitMenu(undefined);
              if (copy) navigate(kitsPath(locale, copy.id));
            }}
            role="menuitem"
            type="button"
          >
            <Copy aria-hidden="true" size={15} />
            {t("app.duplicate")}
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setSharing(kitStore.find(kitMenu.kitId));
              setKitMenu(undefined);
            }}
          >
            <Share2 aria-hidden="true" size={15} />
            {t("sharing.title")}
          </button>
          {menuKit?.can_edit !== false ? (
            <>
              <button
                onClick={() => {
                  rename(kitMenu.kitId);
                }}
                role="menuitem"
                type="button"
              >
                <Pen aria-hidden="true" size={15} />
                {t("app.renameKit")}
              </button>
              <div className="menu-separator" />
              <button
                className="danger"
                onClick={() => {
                  setDeleting(menuKit);
                  setKitMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <Trash2 aria-hidden="true" size={15} />
                {t("app.delete")}
              </button>
            </>
          ) : null}
        </FloatingSurface>
      ) : null}
      {sharing
        ? createPortal(
            <ShareSheet
              kit={sharing}
              close={() => {
                setSharing(undefined);
                menuTrigger.current?.focus();
              }}
            />,
            document.body,
          )
        : null}
      {deleting ? (
        <ConfirmAction
          title={t("app.confirmDeleteKit", { name: deleting.name })}
          description={t(
            kitStore.isSaved(deleting.id)
              ? "app.deleteSavedDescription"
              : "app.deleteLocalDescription",
          )}
          label={t("app.delete")}
          confirm={removeKit}
          close={() => {
            setDeleting(undefined);
            menuTrigger.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}
