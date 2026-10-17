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
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import type { CanvasActions } from "./EditorCanvas";
import type { ComponentPath } from "./schema";
import { matchingPlaceholders, type Placeholder } from "./placeholders";
import { DiscordMarkdown, type MarkdownContext } from "./DiscordMarkdown";
import {
  PlaceholderContext,
  PlaceholderPreviewContext,
  ReadOnlyContext,
  InteractionContext,
} from "./CanvasContext";
import { FloatingSurface } from "../../shared/FloatingSurface";
import { UnicodeEmojiText } from "./Emoji";
import {
  ServerReferencesContext,
  type ServerReference,
} from "./serverReferences";
import { useDiagnosticProps } from "./CanvasIssues";

export function InlineField(
  props: Readonly<{
    readonly actions: CanvasActions;
    readonly value: string;
    readonly field: string;
    readonly path?: ComponentPath;
    readonly message?: boolean;
    readonly compact?: boolean;
    readonly multiline?: boolean;
    readonly maxLength?: number;
    readonly label?: string;
    readonly placeholder?: string;
    readonly setValue?: (value: string) => void;
    readonly format?: MarkdownContext;
    readonly diagnosticPath?: ComponentPath;
  }>,
) {
  const { t } = useTranslation();
  const field = useRef<HTMLSpanElement>(null);
  const toolsAnchor = useRef<HTMLSpanElement>(null);
  const placeholders = useContext(PlaceholderContext);
  const references = useContext(ServerReferencesContext);
  const previewPlaceholders = useContext(PlaceholderPreviewContext);
  const interaction = useContext(InteractionContext);
  const readOnly = useContext(ReadOnlyContext);
  const diagnosticProps = useDiagnosticProps(
    props.diagnosticPath ??
      (props.message
        ? [props.field]
        : props.path
          ? [...props.path, props.field]
          : undefined),
  );
  const [placeholderState, setPlaceholderState] = useState<{
    start: number;
    end: number;
    query: string;
    active: number;
  }>();
  const [referenceState, setReferenceState] = useState<{
    start: number;
    end: number;
    query: string;
    kind: ServerReference["kind"];
    active: number;
  }>();
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(
    () =>
      placeholderState
        ? matchingPlaceholders(placeholders, placeholderState.query).slice(0, 8)
        : [],
    [placeholderState, placeholders],
  );
  const matchingReferences = useMemo(
    () =>
      referenceState
        ? references
            .filter(
              (item) =>
                item.kind === referenceState.kind &&
                item.name
                  .toLocaleLowerCase()
                  .includes(referenceState.query.toLocaleLowerCase()),
            )
            .slice(0, 8)
        : [],
    [referenceState, references],
  );

  const commit = (text: string) => {
    if (props.message) props.actions.updateMessage(props.field, text, true);
    else if (props.path)
      props.actions.updateNode(props.path, props.field, text, true);
    else props.setValue?.(text);
  };

  const applyFormat = (kind: MarkdownFormat) => {
    const element = field.current;
    if (!element) return;
    const offsets = selectionOffsets(element);
    if (!offsets) return;
    const next = formatMarkdown(
      kind,
      element.textContent ?? "",
      offsets.start,
      offsets.end,
    );
    element.textContent = next.text;
    restoreSelection(element, next.start, next.end);
    commit(next.text);
  };

  const updateSuggestions = (element: HTMLElement) => {
    const trigger = placeholderTrigger(element);
    setPlaceholderState(trigger ? { ...trigger, active: 0 } : undefined);
    const reference =
      props.format === "message" ? referenceTrigger(element) : undefined;
    setReferenceState(reference ? { ...reference, active: 0 } : undefined);
  };

  const insertReference = (item: ServerReference) => {
    const element = field.current;
    if (!element || !referenceState) return;
    const text = element.textContent ?? "";
    const replacement =
      item.kind === "channel" ? `<#${item.id}>` : `<@&${item.id}>`;
    const next = `${text.slice(0, referenceState.start)}${replacement}${text.slice(referenceState.end)}`;
    element.textContent = next;
    const cursor = referenceState.start + replacement.length;
    restoreSelection(element, cursor, cursor);
    commit(next);
    setReferenceState(undefined);
  };

  const startReference = (kind: ServerReference["kind"]) => {
    const element = field.current;
    if (!element) return;
    const offsets = selectionOffsets(element);
    if (!offsets) return;
    const prefix = kind === "channel" ? "<#" : "<@&";
    const source = element.textContent ?? "";
    const next = `${source.slice(0, offsets.start)}${prefix}${source.slice(offsets.end)}`;
    element.textContent = next;
    const end = offsets.start + prefix.length;
    restoreSelection(element, end, end);
    commit(next);
    setReferenceState({
      start: offsets.start,
      end,
      query: "",
      kind,
      active: 0,
    });
  };

  const insertPlaceholder = (item: Placeholder) => {
    const element = field.current;
    if (!element || !placeholderState) return;
    const text = element.textContent ?? "";
    const replacement = `{${item.key}}`;
    const next = `${text.slice(0, placeholderState.start)}${replacement}${text.slice(placeholderState.end)}`;
    element.textContent = next;
    const cursor = placeholderState.start + replacement.length;
    restoreSelection(element, cursor, cursor);
    commit(next);
    setPlaceholderState(undefined);
  };

  useLayoutEffect(() => {
    const element = field.current;
    if (
      !element ||
      window.document.activeElement === element ||
      element.textContent === props.value
    )
      return;
    element.textContent = props.value;
    // The editable source node only exists in the DOM while focused (formatted
    // fields render a live Discord preview at rest), so a fresh node mounts on
    // every focus transition and must be resynced even when the value itself
    // has not changed.
  }, [focused, props.value]);

  useEffect(() => {
    if (!focused) return;
    const element = field.current;
    if (!element) return;
    element.focus();
    const range = window.document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [focused]);

  const startEditing = () => {
    if (readOnly) return;
    if (props.path) props.actions.select(props.path);
    props.actions.beginEdit();
    setFocused(true);
  };

  if (!focused && props.format) {
    const empty = props.value.length === 0;
    if (readOnly && empty) return null;
    const preview = empty ? (
      <span className="inline-preview-placeholder">
        {props.placeholder ?? t("editor.writeHere")}
      </span>
    ) : (
      <DiscordMarkdown
        context={props.format}
        onToggleSpoiler={interaction?.toggleSpoilerKey}
        placeholders={placeholders}
        previewPlaceholders={previewPlaceholders}
        readOnly={readOnly}
        revealedSpoilers={interaction?.revealed}
        source={props.value}
      />
    );
    const previewProps = {
      ...diagnosticProps,
      className: `inline-preview${props.compact ? " compact" : ""}${empty ? " is-empty" : ""}`,
      ...(readOnly
        ? {}
        : {
            "aria-label":
              props.label ??
              (props.compact
                ? t("editor.componentText")
                : t("editor.messageContent")),
            onClick: (event: React.MouseEvent) => {
              event.stopPropagation();
              startEditing();
            },
            onFocus: startEditing,
            role: "textbox",
            tabIndex: 0,
          }),
    };
    return props.format !== "inline" ? (
      <div {...previewProps}>{preview}</div>
    ) : (
      <span {...previewProps}>{preview}</span>
    );
  }

  if (readOnly && !props.value) return null;
  if (readOnly)
    return (
      <span className={`inline-editor${props.compact ? " compact" : ""}`}>
        <span
          className={`inline-preview${props.compact ? " compact" : ""}${props.value ? "" : " is-empty"}`}
        >
          {props.value ? (
            <UnicodeEmojiText value={props.value} />
          ) : (
            <span className="inline-preview-placeholder">
              {props.placeholder ?? t("editor.writeHere")}
            </span>
          )}
        </span>
      </span>
    );

  return (
    <span
      className={`inline-editor${props.compact ? " compact" : ""}${props.format ? " can-format" : ""}`}
    >
      <span
        {...diagnosticProps}
        aria-label={
          props.label ??
          (props.compact
            ? t("editor.componentText")
            : t("editor.messageContent"))
        }
        className={`inline-edit${props.compact ? " compact" : ""}`}
        contentEditable
        data-empty={props.value.length === 0 || undefined}
        data-placeholder={props.placeholder ?? t("editor.writeHere")}
        role="textbox"
        ref={field}
        suppressContentEditableWarning
        onBlur={() => {
          setFocused(false);
          props.actions.endEdit();
          setPlaceholderState(undefined);
          setReferenceState(undefined);
        }}
        onFocus={() => {
          if (props.path) props.actions.select(props.path);
          props.actions.beginEdit();
          setFocused(true);
        }}
        onInput={(event) => {
          const raw = props.multiline
            ? editorText(event.currentTarget)
            : (event.currentTarget.textContent ?? "");
          const text = props.maxLength ? raw.slice(0, props.maxLength) : raw;
          if (text !== raw) event.currentTarget.textContent = text;
          commit(text);
          updateSuggestions(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (referenceState && matchingReferences.length) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setReferenceState({
                ...referenceState,
                active:
                  (referenceState.active +
                    (event.key === "ArrowDown"
                      ? 1
                      : matchingReferences.length - 1)) %
                  matchingReferences.length,
              });
              return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              insertReference(
                matchingReferences[referenceState.active] ??
                  matchingReferences[0],
              );
              return;
            }
          }
          if (referenceState && event.key === "Escape") {
            event.preventDefault();
            setReferenceState(undefined);
            return;
          }
          if (placeholderState && suggestions.length) {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setPlaceholderState({
                ...placeholderState,
                active: (placeholderState.active + 1) % suggestions.length,
              });
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setPlaceholderState({
                ...placeholderState,
                active:
                  (placeholderState.active + suggestions.length - 1) %
                  suggestions.length,
              });
              return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              insertPlaceholder(
                suggestions[placeholderState.active] ?? suggestions[0],
              );
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setPlaceholderState(undefined);
              return;
            }
          }
          if (event.key === "Escape") event.currentTarget.blur();
          if (!props.multiline && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (!props.format || !(event.ctrlKey || event.metaKey)) return;
          const shortcut = event.key.toLowerCase();
          const kind =
            shortcut === "b"
              ? "bold"
              : shortcut === "i"
                ? "italic"
                : shortcut === "`"
                  ? "code"
                  : event.shiftKey && shortcut === "x"
                    ? "strike"
                    : undefined;
          if (kind) {
            event.preventDefault();
            applyFormat(kind);
          }
        }}
      />
      {props.format ? (
        <FormattingTools
          apply={applyFormat}
          context={props.format}
          anchorRef={toolsAnchor}
          insertReference={
            props.format === "message" && references.length
              ? startReference
              : undefined
          }
          hasChannels={references.some((item) => item.kind === "channel")}
          hasRoles={references.some((item) => item.kind === "role")}
        />
      ) : null}
      {placeholderState && suggestions.length ? (
        <PlaceholderMenu
          active={placeholderState.active}
          anchorRef={
            props.format && props.format !== "message" ? toolsAnchor : field
          }
          choose={insertPlaceholder}
          items={suggestions}
        />
      ) : null}
      {referenceState && matchingReferences.length ? (
        <FloatingSurface
          anchorRef={field}
          aria-label={t(
            referenceState.kind === "channel"
              ? "editor.insertChannel"
              : "editor.insertRole",
          )}
          className="placeholder-menu"
          placement="bottom-start"
          role="listbox"
        >
          {matchingReferences.map((item, index) => (
            <button
              aria-selected={index === referenceState.active}
              key={item.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertReference(item)}
              role="option"
              type="button"
            >
              <strong>{item.name}</strong>
              <small>
                {item.kind === "channel" ? `#${item.name}` : `@${item.name}`}
              </small>
            </button>
          ))}
        </FloatingSurface>
      ) : null}
    </span>
  );
}

function PlaceholderMenu({
  active,
  anchorRef,
  choose,
  items,
}: Readonly<{
  active: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  choose(item: Placeholder): void;
  items: readonly Placeholder[];
}>) {
  const { t } = useTranslation();
  return (
    <FloatingSurface
      anchorRef={anchorRef}
      aria-label={t("editor.placeholderSuggestions")}
      className="placeholder-menu"
      placement="bottom-start"
      role="listbox"
    >
      {items.map((item, index) => (
        <button
          aria-selected={index === active}
          key={item.key}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(item)}
          role="option"
          type="button"
        >
          <strong>{`{${item.key}}`}</strong>
          <span>{item.label}</span>
          <small>
            {t(`editor.placeholderTypes.${item.type}`)} · {item.example}
          </small>
        </button>
      ))}
    </FloatingSurface>
  );
}

export type MarkdownFormat =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "codeBlock"
  | "quote"
  | "bullet"
  | "ordered"
  | "spoiler"
  | "heading1"
  | "heading2"
  | "heading3"
  | "subtext"
  | "link";

function FormattingTools({
  apply,
  context,
  anchorRef,
  insertReference,
  hasChannels,
  hasRoles,
}: Readonly<{
  apply(kind: MarkdownFormat): void;
  context: MarkdownContext;
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  insertReference?: (kind: ServerReference["kind"]) => void;
  hasChannels: boolean;
  hasRoles: boolean;
}>) {
  const { t } = useTranslation();
  const anchor = useRef<HTMLButtonElement>(null);
  const [stylesOpen, setStylesOpen] = useState(false);
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
  if (context === "message")
    tools.push(
      ["bullet", t("editor.bulletedList"), <List size={14} />],
      ["ordered", t("editor.numberedList"), <ListOrdered size={14} />],
    );
  return (
    <span
      aria-label={t("editor.formatting")}
      className="format-tools"
      ref={anchorRef}
      role="toolbar"
    >
      {tools.map(([kind, label, icon]) => (
        <button
          aria-label={label}
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
      {context === "message" ? (
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
    </span>
  );
}

export function formatMarkdown(
  kind: MarkdownFormat,
  value: string,
  start: number,
  end: number,
) {
  if (
    [
      "quote",
      "bullet",
      "ordered",
      "heading1",
      "heading2",
      "heading3",
      "subtext",
    ].includes(kind)
  )
    return prefixMarkdownLines(kind, value, start, end);
  const wrappers: Partial<Record<MarkdownFormat, readonly [string, string]>> = {
    bold: ["**", "**"],
    italic: ["*", "*"],
    underline: ["__", "__"],
    strike: ["~~", "~~"],
    code: ["`", "`"],
    spoiler: ["||", "||"],
    codeBlock: ["```\n", "\n```"],
    link: ["[", "](https://)"],
  };
  const [open, close] = wrappers[kind] ?? ["", ""];
  const selected = value.slice(start, end);
  if (
    selected.startsWith(open) &&
    selected.endsWith(close) &&
    selected.length >= open.length + close.length
  ) {
    const text = `${value.slice(0, start)}${selected.slice(open.length, selected.length - close.length)}${value.slice(end)}`;
    return { text, start, end: end - open.length - close.length };
  }
  const text = `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`;
  return { text, start: start + open.length, end: end + open.length };
}

function prefixMarkdownLines(
  kind: MarkdownFormat,
  value: string,
  start: number,
  end: number,
) {
  const first = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const after = value.indexOf("\n", end);
  const last = after === -1 ? value.length : after;
  const selected = value.slice(first, last);
  const prefix =
    kind === "quote"
      ? "> "
      : kind === "bullet"
        ? "- "
        : kind === "ordered"
          ? "1. "
          : kind === "heading2"
            ? "## "
            : kind === "heading3"
              ? "### "
              : kind === "subtext"
                ? "-# "
                : "# ";
  const rows = selected.split("\n");
  const remove = rows.every((row) => row.startsWith(prefix));
  const textStyle = kind.startsWith("heading") || kind === "subtext";
  const changed = rows.map((row) =>
    remove
      ? row.slice(prefix.length)
      : `${prefix}${textStyle ? row.replace(/^(#{1,3}|-#) /, "") : row}`,
  );
  const next = changed.join("\n");
  const delta = next.length - selected.length;
  return {
    text: `${value.slice(0, first)}${next}${value.slice(last)}`,
    start: Math.max(first, start + changed[0].length - rows[0].length),
    end: Math.max(first, end + delta),
  };
}

function selectionOffsets(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return undefined;
  const range = selection.getRangeAt(0);
  if (
    !element.contains(range.startContainer) ||
    !element.contains(range.endContainer)
  )
    return undefined;
  const before = range.cloneRange();
  before.selectNodeContents(element);
  before.setEnd(range.startContainer, range.startOffset);
  return {
    start: before.toString().length,
    end: before.toString().length + range.toString().length,
  };
}

function restoreSelection(element: HTMLElement, start: number, end: number) {
  const text = element.firstChild;
  if (!text) return;
  const range = document.createRange();
  range.setStart(text, Math.min(start, text.textContent?.length ?? 0));
  range.setEnd(text, Math.min(end, text.textContent?.length ?? 0));
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function editorText(element: HTMLElement) {
  return (element.innerText || element.textContent || "").replace(/\r/g, "");
}

function placeholderTrigger(element: HTMLElement) {
  const offsets = selectionOffsets(element);
  if (!offsets || offsets.start !== offsets.end) return undefined;
  const source = element.textContent ?? "";
  const before = source.slice(0, offsets.start);
  const found = /(?<!\{)\{([a-zA-Z0-9._-]*)$/.exec(before);
  return found
    ? {
        start: offsets.start - found[0].length,
        end: offsets.start,
        query: found[1],
      }
    : undefined;
}

function referenceTrigger(element: HTMLElement) {
  const offsets = selectionOffsets(element);
  if (!offsets || offsets.start !== offsets.end) return undefined;
  const source = element.textContent ?? "";
  const found = /(?:^|\s)(<#|<@&)([\p{L}\p{N}_ -]*)$/u.exec(
    source.slice(0, offsets.start),
  );
  if (!found) return undefined;
  return {
    start: offsets.start - found[1].length - found[2].length,
    end: offsets.start,
    query: found[2].trim(),
    kind: found[1] === "<#" ? ("channel" as const) : ("role" as const),
  };
}
