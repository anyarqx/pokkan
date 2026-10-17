import { ExternalLink, Search, Smile, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FloatingSurface } from "../../shared/FloatingSurface";
import {
  Emoji,
  emojiText,
  parseEmoji,
  supportsUnicodeEmoji,
  validEmoji,
  type PartialEmoji,
} from "./Emoji";

export function colorHex(value: unknown) {
  return typeof value === "number"
    ? `#${value.toString(16).padStart(6, "0")}`
    : undefined;
}

function ColorInput({
  value,
  change,
}: Readonly<{ value: unknown; change(value: number | undefined): void }>) {
  const { t } = useTranslation();
  const color = colorHex(value);
  const [hex, setHex] = useState(color ?? "");
  useEffect(() => setHex(color ?? ""), [color]);
  const set = (raw: string) => {
    setHex(raw);
    if (!raw) change(undefined);
    else if (/^#[\da-f]{6}$/i.test(raw))
      change(Number.parseInt(raw.slice(1), 16));
  };
  return (
    <div className="color-input">
      <div className="color-editor">
        <input
          aria-label={t("editor.color")}
          onChange={(event) => set(event.target.value)}
          type="color"
          value={color ?? "#000000"}
        />
        <input
          aria-label={t("editor.colorHex")}
          maxLength={7}
          onChange={(event) => set(event.target.value)}
          onBlur={() => setHex(color ?? "")}
          value={hex}
        />
      </div>
      <button
        aria-label={t("editor.clearColor")}
        className="icon-button"
        disabled={!color}
        onClick={() => set("")}
        title={t("editor.clearColor")}
        type="button"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

type PickerEmoji =
  (typeof import("emojibase-data/en/compact.json"))["default"][number];
type EmojiGroup = NonNullable<PickerEmoji["group"]>;
const emojiGroups: readonly EmojiGroup[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function EmojiInput({
  value,
  change,
  poll = false,
  customEmoji = [],
}: Readonly<{
  value: unknown;
  change(value: PartialEmoji | undefined): void;
  poll?: boolean;
  customEmoji?: readonly PartialEmoji[];
}>) {
  const { i18n, t } = useTranslation();
  const text = emojiText(value);
  const [input, setInput] = useState(text);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerButton = useRef<HTMLButtonElement>(null);
  useEffect(() => setInput(text), [text]);
  const set = (raw: string) => {
    setInput(raw);
    if (raw === text) return;
    const emoji = parseEmoji(raw);
    change(poll && emoji?.id ? { id: emoji.id } : emoji);
  };
  const choose = (emoji: PartialEmoji) => {
    setInput(emojiText(emoji));
    change(poll && emoji.id ? { id: emoji.id } : emoji);
    setPickerOpen(false);
    pickerButton.current?.focus();
  };
  return (
    <div className="emoji-input">
      <div className="emoji-current">
        {input ? (
          <Emoji value={input === text ? value : parseEmoji(input)} />
        ) : (
          <Smile aria-hidden="true" size={24} />
        )}
      </div>
      <input
        aria-label={t("editor.emoji")}
        onChange={(event) => setInput(event.target.value)}
        onBlur={() => set(input)}
        onKeyDown={(event) => {
          if (event.key === "Enter") set(input);
        }}
        placeholder={t("editor.emojiEntry")}
        value={input}
      />
      <div className="emoji-input-actions">
        <button
          aria-expanded={pickerOpen}
          ref={pickerButton}
          className="button"
          onClick={() => setPickerOpen((open) => !open)}
          type="button"
        >
          {t("editor.chooseEmoji")}
        </button>
        <button
          className="button"
          disabled={!value}
          onClick={() => set("")}
          type="button"
        >
          {t("editor.clearEmoji")}
        </button>
      </div>
      {pickerOpen ? (
        <EmojiPicker
          customEmoji={customEmoji}
          locale={i18n.resolvedLanguage ?? i18n.language}
          select={choose}
        />
      ) : null}
    </div>
  );
}

function EmojiPicker({
  locale,
  select,
  customEmoji,
}: Readonly<{
  locale: string;
  select(emoji: PartialEmoji): void;
  customEmoji: readonly PartialEmoji[];
}>) {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<readonly PickerEmoji[]>();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<EmojiGroup>(0);

  useEffect(() => {
    let active = true;
    void loadEmojiCatalog(locale).then((data) => {
      if (active)
        setCatalog(
          data.filter(
            (emoji) =>
              validEmoji({ name: emoji.unicode }) &&
              supportsUnicodeEmoji(emoji.unicode),
          ),
        );
    });
    return () => {
      active = false;
    };
  }, [locale]);

  const visible = useMemo(() => {
    if (!catalog) return [];
    const query = search.trim().toLocaleLowerCase(locale);
    return catalog.filter((emoji) => {
      if (!query) return emoji.group === group;
      return [emoji.label, ...(emoji.tags ?? [])].some((term) =>
        term.toLocaleLowerCase(locale).includes(query),
      );
    });
  }, [catalog, group, locale, search]);

  return (
    <section aria-label={t("editor.chooseEmoji")} className="emoji-picker">
      <label className="emoji-search">
        <Search aria-hidden="true" size={15} />
        <input
          autoFocus
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("editor.searchEmoji")}
          type="search"
          value={search}
        />
      </label>
      {customEmoji.length ? (
        <div className="emoji-grid emoji-custom-grid">
          {customEmoji.map((emoji) => (
            <button
              aria-label={emojiText(emoji)}
              key={emojiText(emoji)}
              onClick={() => select(emoji)}
              title={emojiText(emoji)}
              type="button"
            >
              <Emoji value={emoji} />
            </button>
          ))}
        </div>
      ) : null}
      <div
        aria-label={t("editor.emojiCategories")}
        className="emoji-categories"
        role="group"
      >
        {emojiGroups.map((item) => (
          <button
            aria-pressed={group === item}
            key={item}
            onClick={() => {
              setGroup(item);
              setSearch("");
            }}
            type="button"
          >
            {t(`editor.emojiGroups.${item}`)}
          </button>
        ))}
      </div>
      {!catalog ? (
        <p className="emoji-picker-status">{t("editor.emojiLoading")}</p>
      ) : visible.length ? (
        <div className="emoji-grid">
          {visible.map((emoji) => (
            <button
              aria-label={emoji.label}
              key={emoji.unicode}
              onClick={() => select({ name: emoji.unicode })}
              title={emoji.label}
              type="button"
            >
              <Emoji value={{ name: emoji.unicode }} />
            </button>
          ))}
        </div>
      ) : (
        <p className="emoji-picker-status">{t("editor.emojiNoResults")}</p>
      )}
    </section>
  );
}

async function loadEmojiCatalog(
  locale: string,
): Promise<readonly PickerEmoji[]> {
  switch (locale) {
    case "pt-BR":
      return (await import("emojibase-data/pt/compact.json")).default;
    case "es":
      return (await import("emojibase-data/es/compact.json")).default;
    case "ja":
      return (await import("emojibase-data/ja/compact.json")).default;
    default:
      return (await import("emojibase-data/en/compact.json")).default;
  }
}

export function QuickColor({
  value,
  change,
}: Readonly<{ value: unknown; change(value: number | undefined): void }>) {
  const { t } = useTranslation();
  return (
    <QuickControl
      label={t("editor.color")}
      icon={
        <span
          className={`color-chip${colorHex(value) ? "" : " is-unset"}`}
          style={{ backgroundColor: colorHex(value) }}
        />
      }
    >
      <ColorInput value={value} change={change} />
    </QuickControl>
  );
}

export function QuickEmoji({
  value,
  change,
  poll,
}: Readonly<{
  value: unknown;
  change(value: PartialEmoji | undefined): void;
  poll?: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <QuickControl
      label={t("editor.emoji")}
      icon={value ? <Emoji value={value} /> : <Smile size={14} />}
    >
      <EmojiInput value={value} change={change} poll={poll} />
    </QuickControl>
  );
}

const buttonStyles = [
  "primary",
  "secondary",
  "success",
  "danger",
  "link",
  "premium",
] as const;

export function ButtonStyleControl({
  value,
  change,
}: Readonly<{ value: number; change(style: number): void }>) {
  const { t } = useTranslation();
  return (
    <QuickControl
      label={`${t("editor.style")}: ${t(`editor.${buttonStyles[value - 1] ?? "primary"}`)}`}
      icon={
        <span
          className={`button-style-swatch style-${value}`}
          aria-hidden="true"
        >
          {value === 5 ? <ExternalLink size={12} /> : value === 6 ? "◆" : null}
        </span>
      }
    >
      {(close) => (
        <div
          className="button-style-picker"
          role="group"
          aria-label={t("editor.style")}
          onKeyDown={(event) => {
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button",
              ),
            ];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const offset = {
              ArrowRight: 1,
              ArrowLeft: -1,
              ArrowDown: 2,
              ArrowUp: -2,
            }[event.key];
            if (
              offset !== undefined ||
              event.key === "Home" ||
              event.key === "End"
            ) {
              event.preventDefault();
              event.stopPropagation();
              buttons[
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (index + offset! + buttons.length) % buttons.length
              ]?.focus();
            }
          }}
        >
          {buttonStyles.map((name, index) => (
            <button
              key={name}
              className={`discord-button style-${index + 1}`}
              type="button"
              aria-pressed={value === index + 1}
              onClick={() => {
                change(index + 1);
                close();
              }}
            >
              {t(`editor.${name}`)}
            </button>
          ))}
        </div>
      )}
    </QuickControl>
  );
}

function QuickControl({
  label,
  icon,
  children,
}: Readonly<{
  label: string;
  icon: ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
}>) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const nodeAnchor = useRef<HTMLElement | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      (
        surface.current?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
        surface.current?.querySelector<HTMLElement>("input, button")
      )?.focus();
    });
    const close = (event: PointerEvent) => {
      if (
        !anchor.current?.contains(event.target as Node) &&
        !surface.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        anchor.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <>
      <button
        aria-label={label}
        title={label}
        aria-expanded={open}
        className="node-control"
        onClick={(event) => {
          event.stopPropagation();
          nodeAnchor.current =
            anchor.current?.closest(".editor-node") ?? anchor.current;
          setOpen(!open);
        }}
        ref={anchor}
        type="button"
      >
        {icon}
      </button>
      {open
        ? createPortal(
            <div ref={surface}>
              <FloatingSurface
                anchorRef={nodeAnchor}
                aria-label={label}
                className="editor-popover quick-popover"
                placement="bottom-start"
                onClick={(event) => event.stopPropagation()}
                onBlur={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget) &&
                    event.relatedTarget !== anchor.current &&
                    event.relatedTarget !== null
                  )
                    setOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setOpen(false);
                    anchor.current?.focus();
                  }
                }}
                role="dialog"
              >
                {typeof children === "function"
                  ? children(() => {
                      setOpen(false);
                      anchor.current?.focus();
                    })
                  : children}
              </FloatingSurface>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
