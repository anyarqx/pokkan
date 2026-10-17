import {
  AtSign,
  Bold,
  Code2,
  EyeOff,
  Heading1,
  Hash,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FloatingSurface } from "../../shared/FloatingSurface";
import type { MarkdownContext } from "./DiscordMarkdown";
import type { MarkdownFormat } from "./markdownFormatting";

export function FormattingTools({
  id,
  apply,
  context,
  anchorRef,
  insertReference,
  hasChannels,
  hasRoles,
  finish,
  relatedSurfaceId,
}: Readonly<{
  id: string;
  apply(kind: MarkdownFormat): void;
  context: MarkdownContext;
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  insertReference?: (kind: "channel" | "role") => void;
  hasChannels: boolean;
  hasRoles: boolean;
  finish(): void;
  relatedSurfaceId?: string;
}>) {
  const { t } = useTranslation();
  const anchor = useRef<HTMLButtonElement>(null);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost(
      anchorRef.current
        ?.closest(".editor-page")
        ?.querySelector<HTMLElement>(".editor-formatting-slot") ?? null,
    );
  }, [anchorRef]);
  useEffect(() => {
    if (!stylesOpen) return;
    document
      .getElementById(`${id}-styles`)
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !anchor.current?.contains(event.target) &&
        !document.getElementById(`${id}-styles`)?.contains(event.target)
      )
        setStylesOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [stylesOpen, id]);
  const tools: [MarkdownFormat, string, ReactNode][] = [
    ["bold", t("editor.bold"), <Bold size={14} />],
    ["italic", t("editor.italic"), <Italic size={14} />],
    ["underline", t("editor.underline"), <Underline size={14} />],
    ["strike", t("editor.strike"), <Strikethrough size={14} />],
    ["code", t("editor.inlineCode"), <Code2 size={14} />],
    ["spoiler", t("editor.spoiler"), <EyeOff size={14} />],
  ];
  if (context !== "inline")
    tools.push(
      ["codeBlock", t("editor.codeBlock"), <Code2 size={14} />],
      ["quote", t("editor.quote"), <Quote size={14} />],
      ["link", t("editor.link"), <LinkIcon size={14} />],
    );
  if (context !== "inline")
    tools.push(
      ["bullet", t("editor.bulletedList"), <List size={14} />],
      ["ordered", t("editor.numberedList"), <ListOrdered size={14} />],
    );
  const contains = (target: EventTarget | null) =>
    target instanceof Node &&
    (document.getElementById(id)?.contains(target) ||
      document.getElementById(`${id}-styles`)?.contains(target) ||
      (relatedSurfaceId &&
        document.getElementById(relatedSurfaceId)?.contains(target)));
  return createPortal(
    <div
      id={id}
      aria-label={t("editor.formatting")}
      className={`format-tools${host ? "" : " is-standalone"}`}
      role="toolbar"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (stylesOpen) {
            setStylesOpen(false);
            anchor.current?.focus();
          } else anchorRef.current?.focus();
        }
        const inMenu = (event.target as Element).closest('[role="menu"]');
        const keys = inMenu
          ? ["ArrowDown", "ArrowUp", "Home", "End"]
          : ["ArrowRight", "ArrowLeft", "Home", "End"];
        if (!keys.includes(event.key)) return;
        const buttons = [
          ...(
            inMenu ?? event.currentTarget
          ).querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
        ];
        const current = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const index =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (current + (event.key === keys[0] ? 1 : buttons.length - 1)) %
                buttons.length;
        event.preventDefault();
        buttons[index]?.focus();
      }}
      onBlur={(event) => {
        if (
          !contains(event.relatedTarget) &&
          event.relatedTarget !== anchorRef.current
        )
          finish();
      }}
    >
      {tools.map(([kind, label, icon]) => (
        <button
          aria-label={label}
          title={label}
          key={kind}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => apply(kind)}
          type="button"
        >
          {icon}
        </button>
      ))}
      {insertReference ? (
        <>
          {hasChannels ? (
            <button
              aria-label={t("editor.insertChannel")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertReference("channel")}
              type="button"
            >
              <Hash size={14} />
            </button>
          ) : null}
          {hasRoles ? (
            <button
              aria-label={t("editor.insertRole")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertReference("role")}
              type="button"
            >
              <AtSign size={14} />
            </button>
          ) : null}
        </>
      ) : null}
      {context !== "inline" ? (
        <button
          aria-label={t("editor.textStyle")}
          aria-expanded={stylesOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setStylesOpen(!stylesOpen)}
          ref={anchor}
          type="button"
        >
          <Heading1 size={14} />
        </button>
      ) : null}
      {stylesOpen ? (
        <FloatingSurface
          portal
          id={`${id}-styles`}
          anchorRef={anchor}
          className="editor-popover text-style-menu"
          placement="top-start"
          onMouseDown={(event) => event.preventDefault()}
          role="menu"
        >
          {(["heading1", "heading2", "heading3", "subtext"] as const).map(
            (kind) => (
              <button
                key={kind}
                onClick={() => {
                  apply(kind);
                  setStylesOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                {t(`editor.${kind}`)}
              </button>
            ),
          )}
        </FloatingSurface>
      ) : null}
    </div>,
    host ?? document.body,
  );
}
