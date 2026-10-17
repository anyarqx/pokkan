import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { CanvasActions } from "./EditorCanvas";
import type { ComponentPath } from "./schema";
import { matchingPlaceholders, type Placeholder } from "./placeholders";
import { DiscordMarkdown, type MarkdownContext } from "./DiscordMarkdown";
import {
  PlaceholderContext,
  ReadOnlyContext,
  PlaceholderPreviewContext,
  InteractionContext,
} from "./CanvasContext";
import { FloatingSurface } from "../../shared/FloatingSurface";
import { UnicodeEmojiText, emojiText, type PartialEmoji } from "./Emoji";
import { EmojiPicker } from "./QuickControls";
import { useBuiltInEmojis } from "../../shared/emojis";
import { ServerReferencesContext } from "./serverReferences";
import { useDiagnosticProps } from "./CanvasIssues";
import { markdownRange, markdownSelection } from "./textSelection";
import { emojiBindings, resolveEmojiNames } from "./emojiAuthoring";
import { useInlineEditing } from "./useInlineEditing";
import { FormattingTools } from "./FormattingTools";
import { formatMarkdown, type MarkdownFormat } from "./markdownFormatting";
import { maskedLinkForSelection } from "./markdownLinks";
import { Check, Unlink } from "lucide-react";

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
  const { t, i18n } = useTranslation();
  const multiline = props.multiline ?? Boolean(props.format);
  const field = useRef<HTMLSpanElement>(null);
  const previewAnchor = useRef<HTMLSpanElement>(null);
  const activation = useRef<{ start: number; end: number } | undefined>(
    undefined,
  );
  const authoring = useRef(emojiBindings(props.value));
  const emojiMenu = useRef<HTMLDivElement>(null);
  const suggestionId = useId();
  const lastSelection = useRef<
    { start: number; end: number; backward?: boolean } | undefined
  >(undefined);
  const placeholders = useContext(PlaceholderContext);
  const previewPlaceholders = useContext(PlaceholderPreviewContext);
  const interaction = useContext(InteractionContext);
  const references = useContext(ServerReferencesContext);
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
    kind: "channel" | "role";
    active: number;
  }>();
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [linkState, setLinkState] = useState<{
    source: string;
    start: number;
    end: number;
    label: string;
    url: string;
    linked: boolean;
  }>();
  const live = useInlineEditing(
    field,
    props.value,
    focused && !readOnly,
    Boolean(props.format),
  );
  const [emojiState, setEmojiState] = useState<{
    start: number;
    end: number;
    query: string;
  }>();
  const builtInEmoji = useBuiltInEmojis(Boolean(emojiState));
  const automaticPair = useRef<
    | { start: number; opening: string; closing: string; pristine: boolean }
    | undefined
  >(undefined);
  const suggestions = useMemo(
    () =>
      placeholderState
        ? matchingPlaceholders(placeholders, placeholderState.query).slice(0, 8)
        : [],
    [placeholderState, placeholders],
  );
  const matchingReferences = useMemo(() => {
    if (!referenceState) return [];
    const items = references
      .filter((item) => item.kind === referenceState.kind)
      .map((item) => ({
        id: item.id,
        name: item.name,
        value: item.kind === "channel" ? `<#${item.id}>` : `<@&${item.id}>`,
      }));
    if (referenceState.kind === "role")
      items.push(
        ...["everyone", "here"].map((name) => ({
          id: name,
          name,
          value: `@${name}`,
        })),
      );
    return items
      .filter((item) =>
        item.name
          .toLocaleLowerCase()
          .includes(referenceState.query.toLocaleLowerCase()),
      )
      .slice(0, 8);
  }, [referenceState, references]);
  const activeSuggestion =
    referenceState && matchingReferences.length
      ? `${suggestionId}-reference-${referenceState.active}`
      : placeholderState && suggestions.length
        ? `${suggestionId}-placeholder-${placeholderState.active}`
        : undefined;
  useEffect(() => {
    if (activeSuggestion)
      document
        .getElementById(activeSuggestion)
        ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeSuggestion]);

  const commit = (
    text: string,
    selection?: { start: number; end: number; backward?: boolean },
  ) => {
    if (selection) live.prepare(text, selection);
    const raw = text;
    const server = references.filter((item) => item.kind === "emoji");
    if (props.format && automaticPair.current?.opening !== ":")
      text = resolveEmojiNames(text, authoring.current, server);
    if (props.format) {
      const range = live.selection();
      live.prepare(
        text,
        range
          ? {
              backward: range.backward,
              start:
                text === raw
                  ? range.start
                  : resolveEmojiNames(
                      raw.slice(0, range.start),
                      authoring.current,
                      server,
                    ).length,
              end:
                text === raw
                  ? range.end
                  : resolveEmojiNames(
                      raw.slice(0, range.end),
                      authoring.current,
                      server,
                    ).length,
            }
          : undefined,
      );
    }
    for (const [name, emoji] of emojiBindings(text))
      if (!authoring.current.has(name)) authoring.current.set(name, emoji);
    live.prepare(text);
    if (props.message) props.actions.updateMessage(props.field, text, true);
    else if (props.path)
      props.actions.updateNode(props.path, props.field, text, true);
    else props.setValue?.(text);
  };

  const commitAction: typeof commit = (text, selection) => {
    props.actions.endEdit();
    props.actions.beginEdit();
    commit(text, selection);
    props.actions.endEdit();
    props.actions.beginEdit();
  };

  const applyFormat = (kind: MarkdownFormat) => {
    const element = field.current;
    if (!element) return;
    const offsets = live.selection() ?? lastSelection.current;
    if (!offsets) return;
    if (kind === "link") {
      const source = live.source();
      const link = maskedLinkForSelection(source, offsets.start, offsets.end);
      setLinkState({
        source,
        start: link?.start ?? offsets.start,
        end: link?.end ?? offsets.end,
        label: link?.label ?? source.slice(offsets.start, offsets.end),
        url: link?.url ?? "",
        linked: Boolean(link),
      });
      return;
    }
    const selection = window.getSelection();
    const block = selection?.anchorNode?.parentElement?.closest<HTMLElement>(
      "pre[data-source-content-start]",
    );
    const range =
      kind === "codeBlock" && block && element.contains(block)
        ? {
            start: Number(block.dataset.sourceStart),
            end: Number(block.dataset.sourceEnd),
          }
        : offsets;
    const next = formatMarkdown(kind, live.source(), range.start, range.end);
    element.focus();
    commitAction(next.text, { ...next, backward: offsets.backward });
  };

  const updateSuggestions = () => {
    lastSelection.current = live.selection();
    const trigger = placeholderTrigger(live.source(), live.selection());
    setPlaceholderState(trigger ? { ...trigger, active: 0 } : undefined);
    const reference =
      props.format === "message"
        ? referenceTrigger(live.source(), live.selection())
        : undefined;
    setReferenceState(reference ? { ...reference, active: 0 } : undefined);
    const offsets = live.selection();
    const source = live.source();
    const before = offsets ? source.slice(0, offsets.start) : "";
    const emoji = /(?:^|\s):([\p{L}\p{N}_+-]*)$/u.exec(before);
    const inCode = (before.match(/`/g)?.length ?? 0) % 2 !== 0;
    setEmojiState(
      emoji && offsets && offsets.start === offsets.end && !inCode
        ? {
            start: offsets.start - emoji[1].length - 1,
            end: offsets.start + (source[offsets.start] === ":" ? 1 : 0),
            query: emoji[1],
          }
        : undefined,
    );
  };

  const insertEmoji = (item: PartialEmoji) => {
    const element = field.current;
    if (!element || !emojiState) return;
    const text = live.source();
    const replacement = emojiText(item);
    const next =
      text.slice(0, emojiState.start) +
      replacement +
      text.slice(emojiState.end);
    const cursor = emojiState.start + replacement.length;
    element.focus();
    automaticPair.current = undefined;
    setLinkState(undefined);
    commitAction(next, { start: cursor, end: cursor });
    setEmojiState(undefined);
  };

  useLayoutEffect(() => {
    const element = field.current;
    if (!focused || !element || readOnly) return;
    const pair = (event: InputEvent) => {
      if (!event.cancelable) return;
      if (event.isComposing) {
        automaticPair.current = undefined;
        return;
      }
      const offsets = live.selection();
      if (!offsets || offsets.start !== offsets.end) {
        automaticPair.current = undefined;
        return;
      }
      const text = live.source();
      const cursor = offsets.start;
      const tracked = automaticPair.current;
      if (
        event.inputType === "deleteContentBackward" &&
        tracked?.pristine &&
        cursor === tracked.start + 1 &&
        text.slice(tracked.start, cursor + 1) ===
          tracked.opening + tracked.closing
      ) {
        event.preventDefault();
        const next = text.slice(0, tracked.start) + text.slice(cursor + 1);
        commit(next, { start: tracked.start, end: tracked.start });
        automaticPair.current = undefined;
        updateSuggestions();
        return;
      }
      automaticPair.current = undefined;
      if (
        tracked &&
        cursor > tracked.start &&
        text[tracked.start] === tracked.opening &&
        text[cursor] === tracked.closing &&
        event.data !== tracked.opening
      ) {
        automaticPair.current = { ...tracked, pristine: false };
      }
      if (event.inputType !== "insertText") return;
      if (
        tracked &&
        event.data === tracked.closing &&
        cursor > tracked.start &&
        text[cursor] === tracked.closing
      ) {
        event.preventDefault();
        automaticPair.current = undefined;
        live.select({ start: cursor + 1, end: cursor + 1 });
        commit(text);
        updateSuggestions();
        return;
      }
      if (event.data !== "{" && event.data !== ":") return;
      if (props.maxLength && text.length + 2 > props.maxLength) return;
      const before = text.slice(0, cursor);
      if ((before.match(/`/g)?.length ?? 0) % 2 !== 0) return;
      if (event.data === ":" && before && !/\s$/.test(before)) return;
      event.preventDefault();
      const closing = event.data === "{" ? "}" : ":";
      const next =
        text.slice(0, cursor) + event.data + closing + text.slice(cursor);
      automaticPair.current = {
        start: cursor,
        opening: event.data,
        closing,
        pristine: true,
      };
      commit(next, { start: cursor + 1, end: cursor + 1 });
      updateSuggestions();
    };
    const abandon = () => {
      automaticPair.current = undefined;
      live.moved();
    };
    const reposition = () => {
      abandon();
      props.actions.endEdit();
      props.actions.beginEdit();
    };
    const moveCaret = () => {
      if (document.activeElement !== element) return;
      const offsets = live.selection();
      if (
        !offsets ||
        (offsets.start === lastSelection.current?.start &&
          offsets.end === lastSelection.current?.end)
      )
        return;
      if (
        automaticPair.current &&
        (offsets.start !== automaticPair.current.start + 1 ||
          offsets.start !== offsets.end)
      )
        abandon();
      updateSuggestions();
    };
    const beforeInput = (event: InputEvent) => {
      setTyping(true);
      if (
        !multiline &&
        ["insertParagraph", "insertLineBreak"].includes(event.inputType) &&
        !event.isComposing
      ) {
        event.preventDefault();
        element.blur();
        return;
      }
      if (
        (event.inputType === "historyUndo" ||
          event.inputType === "historyRedo") &&
        props.actions.undo
      ) {
        event.preventDefault();
        if (event.inputType === "historyRedo") props.actions.redo?.();
        else props.actions.undo();
        return;
      }
      pair(event);
      if (
        !event.defaultPrevented &&
        live.beforeInput(event, commit, props.maxLength)
      )
        updateSuggestions();
    };
    element.addEventListener("beforeinput", beforeInput);
    element.addEventListener("pointerdown", reposition);
    element.addEventListener("paste", abandon);
    document.addEventListener("selectionchange", moveCaret);
    return () => {
      element.removeEventListener("beforeinput", beforeInput);
      element.removeEventListener("pointerdown", reposition);
      element.removeEventListener("paste", abandon);
      document.removeEventListener("selectionchange", moveCaret);
    };
  });

  const insertReference = (item: { readonly value: string }) => {
    const element = field.current;
    if (!element || !referenceState) return;
    const text = live.source();
    const replacement = item.value;
    const next = `${text.slice(0, referenceState.start)}${replacement}${text.slice(referenceState.end)}`;
    const cursor = referenceState.start + replacement.length;
    commitAction(next, { start: cursor, end: cursor });
    setReferenceState(undefined);
  };

  const startReference = (kind: "channel" | "role") => {
    const element = field.current;
    if (!element) return;
    const offsets = live.selection() ?? lastSelection.current;
    if (!offsets) return;
    const prefix = kind === "channel" ? "<#" : "<@&";
    const source = live.source();
    const next = `${source.slice(0, offsets.start)}${prefix}${source.slice(offsets.end)}`;
    const end = offsets.start + prefix.length;
    element.focus();
    commitAction(next, { start: end, end });
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
    const text = live.source();
    const replacement = `{${item.key}}`;
    const next = `${text.slice(0, placeholderState.start)}${replacement}${text.slice(placeholderState.end)}`;
    const cursor = placeholderState.start + replacement.length;
    commitAction(next, { start: cursor, end: cursor });
    setPlaceholderState(undefined);
  };

  useLayoutEffect(() => {
    if (!focused || !props.format) return;
    const element = field.current;
    if (!element) return;
    element.focus();
    const length = props.value.length;
    const range = activation.current ?? { start: length, end: length };
    live.select(range);
    activation.current = undefined;
  }, [focused]);

  const startEditing = () => {
    if (readOnly) return;
    if (props.path) props.actions.select(props.path);
    props.actions.beginEdit();
    authoring.current = emojiBindings(props.value);
    setFocused(true);
  };

  const finishEditing = () => {
    if (live.isComposing()) return;
    setFocused(false);
    setTyping(false);
    props.actions.endEdit();
    setPlaceholderState(undefined);
    setReferenceState(undefined);
    setEmojiState(undefined);
    automaticPair.current = undefined;
    setLinkState(undefined);
  };

  if ((readOnly || !focused) && props.format) {
    if (readOnly && !props.value) return null;
    return (
      <span className={`inline-editor${props.compact ? " compact" : ""}`}>
        <span
          key="preview"
          ref={previewAnchor}
          {...diagnosticProps}
          data-source-length={props.value.length}
          className={`inline-preview${props.compact ? " compact" : ""}${props.value ? "" : " is-empty"}`}
          role={readOnly ? undefined : "textbox"}
          tabIndex={readOnly ? undefined : 0}
          aria-label={
            props.label ??
            (props.compact
              ? t("editor.componentText")
              : t("editor.messageContent"))
          }
          onClick={(event) => {
            if (readOnly) return;
            event.stopPropagation();
            const offset = markdownSelection(
              event.currentTarget,
              event.clientX,
              event.clientY,
            );
            activation.current =
              markdownRange(event.currentTarget) ??
              (offset === undefined
                ? undefined
                : { start: offset, end: offset });
            startEditing();
          }}
          onKeyDown={(event) => {
            if (!readOnly && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              event.stopPropagation();
              startEditing();
            }
          }}
        >
          {props.value ? (
            <DiscordMarkdown
              source={props.value}
              context={props.format}
              sourceMap={!readOnly}
              placeholders={placeholders}
              previewPlaceholders={previewPlaceholders}
              readOnly={readOnly}
              onToggleSpoiler={interaction?.toggleSpoilerKey}
              revealedSpoilers={interaction?.revealed}
            />
          ) : (
            <span className="inline-preview-placeholder">
              {props.placeholder ?? t("editor.writeHere")}
            </span>
          )}
        </span>
      </span>
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

  const editor = (
    <span
      className={`inline-editor${props.compact ? " compact" : ""}${props.format ? " can-format" : ""}`}
    >
      <span
        key="editable"
        {...diagnosticProps}
        aria-label={
          props.label ??
          (props.compact
            ? t("editor.componentText")
            : t("editor.messageContent"))
        }
        className={`inline-edit${props.compact ? " compact" : ""}`}
        aria-autocomplete={activeSuggestion ? "list" : undefined}
        aria-multiline={multiline}
        aria-describedby={
          diagnosticProps.title ? `${suggestionId}-issue` : undefined
        }
        aria-controls={
          activeSuggestion
            ? `${suggestionId}-${referenceState && matchingReferences.length ? "reference" : "placeholder"}`
            : undefined
        }
        aria-activedescendant={activeSuggestion}
        contentEditable
        data-source-length={props.format ? props.value.length : undefined}
        data-empty={props.value.length === 0 || undefined}
        data-typing={typing || undefined}
        data-placeholder={props.placeholder ?? t("editor.writeHere")}
        role="textbox"
        ref={field}
        suppressContentEditableWarning
        onContextMenu={(event) => event.stopPropagation()}
        onBlur={(event) => {
          lastSelection.current = live.selection() ?? lastSelection.current;
          if (
            event.relatedTarget instanceof Node &&
            document
              .getElementById(`${suggestionId}-link`)
              ?.contains(event.relatedTarget)
          )
            return;
          if (
            event.relatedTarget instanceof Node &&
            emojiMenu.current?.contains(event.relatedTarget)
          )
            return;
          if (
            event.relatedTarget instanceof Node &&
            [`${suggestionId}-format`, `${suggestionId}-format-styles`].some(
              (id) =>
                document
                  .getElementById(id)
                  ?.contains(event.relatedTarget as Node),
            )
          )
            return;
          if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.parentElement?.contains(event.relatedTarget)
          )
            return;
          finishEditing();
        }}
        onFocus={() => {
          if (props.path) props.actions.select(props.path);
          props.actions.beginEdit();
          setFocused(true);
        }}
        onInput={(event) => {
          live.input(commit, props.maxLength);
          if (!live.isComposing()) updateSuggestions();
        }}
        onCompositionStart={() => {
          setTyping(true);
          live.compositionStart();
          setEmojiState(undefined);
          setReferenceState(undefined);
          setPlaceholderState(undefined);
        }}
        onCompositionEnd={(event) => {
          live.compositionEnd(event.data, commit, props.maxLength);
          if (document.activeElement === event.currentTarget)
            updateSuggestions();
          else finishEditing();
        }}
        onPaste={(event) => {
          setTyping(true);
          event.preventDefault();
          const offsets = live.selection();
          if (!offsets) return;
          let pasted = event.clipboardData
            .getData("text/plain")
            .replace(/\r\n?/g, "\n");
          if (!multiline) pasted = pasted.replace(/\n/g, " ");
          const next = live.replacement(pasted, offsets, props.maxLength);
          commitAction(next.text, next);
          updateSuggestions();
        }}
        onCopy={(event) => {
          if (!props.format) return;
          const selected = live.selection();
          if (!selected || selected.start === selected.end) return;
          const range = live.completeRange(selected);
          event.preventDefault();
          event.clipboardData.setData(
            "text/plain",
            live.source().slice(range.start, range.end),
          );
        }}
        onCut={(event) => {
          if (!props.format) return;
          const selected = live.selection();
          if (!selected || selected.start === selected.end) return;
          const range = live.completeRange(selected);
          event.preventDefault();
          const source = live.source();
          event.clipboardData.setData(
            "text/plain",
            source.slice(range.start, range.end),
          );
          const next = source.slice(0, range.start) + source.slice(range.end);
          commitAction(next, { start: range.start, end: range.start });
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            live.navigateBlock(event.key, event.shiftKey)
          ) {
            event.preventDefault();
            props.actions.endEdit();
            props.actions.beginEdit();
            return;
          }
          if (
            props.format &&
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "a"
          ) {
            event.preventDefault();
            live.select({ start: 0, end: live.source().length });
            return;
          }
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "s" &&
            props.actions.save
          ) {
            event.preventDefault();
            props.actions.save();
            return;
          }
          if (
            (event.ctrlKey || event.metaKey) &&
            ["z", "y"].includes(event.key.toLowerCase()) &&
            props.actions.undo
          ) {
            event.preventDefault();
            const offsets = live.selection();
            activation.current = offsets;
            if (event.key.toLowerCase() === "y" || event.shiftKey)
              props.actions.redo?.();
            else props.actions.undo();
            return;
          }
          if (
            event.key === "Enter" &&
            multiline &&
            !activeSuggestion &&
            !emojiState
          ) {
            event.preventDefault();
            const offsets = live.selection();
            if (offsets) {
              const next = live.replacement("\n", offsets, props.maxLength);
              commit(next.text, next);
            }
            return;
          }
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
            ].includes(event.key)
          ) {
            automaticPair.current = undefined;
            live.moved();
            props.actions.endEdit();
            props.actions.beginEdit();
          }
          if (emojiState && event.key === "Escape") {
            event.preventDefault();
            setEmojiState(undefined);
            automaticPair.current = undefined;
            return;
          }
          if (emojiState && event.key === "ArrowDown") {
            const first =
              emojiMenu.current?.querySelector<HTMLButtonElement>(
                ".emoji-grid button",
              );
            if (first) {
              event.preventDefault();
              automaticPair.current = undefined;
              first.focus();
              return;
            }
          }
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
          if (event.key === "Escape") {
            event.currentTarget.blur();
            requestAnimationFrame(() => previewAnchor.current?.focus());
          }
          if (!multiline && event.key === "Enter") {
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
        <span ref={live.staging} hidden aria-hidden="true">
          {props.value ? (
            <DiscordMarkdown
              source={props.value}
              context={props.format}
              sourceMap
              editing
              placeholders={placeholders}
              previewPlaceholders={previewPlaceholders}
              readOnly={false}
              revealedSpoilers={interaction?.revealed}
            />
          ) : null}
        </span>
      ) : null}
      {diagnosticProps.title ? (
        <span
          id={`${suggestionId}-issue`}
          className={`inline-field-issue${diagnosticProps["aria-invalid"] ? " is-error" : ""}`}
          role="status"
        >
          {diagnosticProps.title}
        </span>
      ) : null}
      {props.format ? (
        <FormattingTools
          id={`${suggestionId}-format`}
          apply={applyFormat}
          context={props.format}
          anchorRef={field}
          finish={finishEditing}
          relatedSurfaceId={`${suggestionId}-link`}
          insertReference={
            props.format === "message" &&
            references.some((item) => item.kind !== "emoji")
              ? startReference
              : undefined
          }
          hasChannels={references.some((item) => item.kind === "channel")}
          hasRoles={references.some((item) => item.kind === "role")}
        />
      ) : null}
      {linkState ? (
        <FloatingSurface
          portal
          id={`${suggestionId}-link`}
          anchorRef={field}
          className="editor-popover media-address-popover inline-link-popover"
          placement="top-start"
          role="dialog"
          aria-label={t("editor.link")}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            setLinkState(undefined);
            field.current?.focus();
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setLinkState(undefined);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const input = event.currentTarget.querySelector("input")!;
              const url = linkState.url.trim();
              input.setCustomValidity(
                /^https?:\/\//i.test(url) ? "" : t("editor.invalidLinkUrl"),
              );
              if (!input.reportValidity()) return;
              const label = linkState.label || url;
              const destination = url.replace(/[()]/g, (character) =>
                character === "(" ? "%28" : "%29",
              );
              const result = live.replacement(
                `[${label}](${destination})`,
                linkState,
                undefined,
                linkState.source,
              );
              if (props.maxLength && result.text.length > props.maxLength) {
                input.setCustomValidity(
                  t("editor.linkLimit", { limit: props.maxLength }),
                );
                input.reportValidity();
                return;
              }
              field.current?.focus();
              commitAction(result.text, result);
              setLinkState(undefined);
            }}
          >
            <input
              autoFocus
              required
              type="url"
              aria-label={t("editor.url")}
              placeholder="https://"
              value={linkState.url}
              onChange={(event) => {
                event.currentTarget.setCustomValidity("");
                setLinkState({ ...linkState, url: event.target.value });
              }}
            />
            <button
              type="submit"
              className="icon-button"
              aria-label={t("editor.applyLink")}
              title={t("editor.applyLink")}
            >
              <Check aria-hidden="true" size={16} />
            </button>
            {linkState.linked ? (
              <button
                type="button"
                className="icon-button"
                aria-label={t("editor.removeLink")}
                title={t("editor.removeLink")}
                onClick={() => {
                  const result = live.replacement(
                    linkState.label,
                    linkState,
                    undefined,
                    linkState.source,
                  );
                  field.current?.focus();
                  commitAction(result.text, result);
                  setLinkState(undefined);
                }}
              >
                <Unlink aria-hidden="true" size={16} />
              </button>
            ) : null}
          </form>
        </FloatingSurface>
      ) : null}
      {emojiState ? (
        <FloatingSurface
          portal
          anchorRef={field}
          className="editor-popover quick-popover inline-emoji-menu"
          role="dialog"
          aria-label={t("editor.chooseEmoji")}
          onMouseDown={(event) => {
            if ((event.target as Element).closest("button"))
              event.preventDefault();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setEmojiState(undefined);
              field.current?.focus();
            }
          }}
          onBlur={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget) &&
              event.relatedTarget !== field.current
            ) {
              setEmojiState(undefined);
              setFocused(false);
              props.actions.endEdit();
            }
          }}
        >
          <div ref={emojiMenu}>
            <EmojiPicker
              locale={i18n.resolvedLanguage ?? i18n.language}
              query={emojiState.query}
              autoFocus={false}
              select={insertEmoji}
              builtInEmoji={builtInEmoji}
              customEmoji={references.filter((item) => item.kind === "emoji")}
            />
          </div>
        </FloatingSurface>
      ) : null}
      {placeholderState && suggestions.length ? (
        <PlaceholderMenu
          id={`${suggestionId}-placeholder`}
          active={placeholderState.active}
          anchorRef={field}
          choose={insertPlaceholder}
          items={suggestions}
        />
      ) : null}
      {referenceState && matchingReferences.length ? (
        <FloatingSurface
          portal
          id={`${suggestionId}-reference`}
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
              id={`${suggestionId}-reference-${index}`}
              aria-selected={index === referenceState.active}
              key={item.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertReference(item)}
              role="option"
              type="button"
            >
              <strong>
                {referenceState.kind === "channel"
                  ? `#${item.name}`
                  : `@${item.name}`}
              </strong>
            </button>
          ))}
        </FloatingSurface>
      ) : null}
    </span>
  );
  return editor;
}

function PlaceholderMenu({
  id,
  active,
  anchorRef,
  choose,
  items,
}: Readonly<{
  id: string;
  active: number;
  anchorRef: React.RefObject<HTMLElement | null>;
  choose(item: Placeholder): void;
  items: readonly Placeholder[];
}>) {
  const { t } = useTranslation();
  return (
    <FloatingSurface
      portal
      id={id}
      anchorRef={anchorRef}
      aria-label={t("editor.placeholderSuggestions")}
      className="placeholder-menu"
      placement="bottom-start"
      role="listbox"
    >
      {items.map((item, index) => (
        <button
          id={`${id}-${index}`}
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

function placeholderTrigger(
  source: string,
  offsets?: { start: number; end: number },
) {
  if (!offsets || offsets.start !== offsets.end) return undefined;
  const before = source.slice(0, offsets.start);
  const found = /(?<!\{)\{([a-zA-Z0-9._-]*)$/.exec(before);
  return found
    ? {
        start: offsets.start - found[0].length,
        end: offsets.start + (source[offsets.start] === "}" ? 1 : 0),
        query: found[1],
      }
    : undefined;
}

function referenceTrigger(
  source: string,
  offsets?: { start: number; end: number },
) {
  if (!offsets || offsets.start !== offsets.end) return undefined;
  const before = source.slice(0, offsets.start);
  if ((before.match(/`/g)?.length ?? 0) % 2 !== 0) return undefined;
  const found = /(?:^|\s)(<#|<@&|#|@)([^<>\n@#{}]*)$/u.exec(before);
  if (!found || (/^[#@]$/.test(found[1]) && /^\s/.test(found[2])))
    return undefined;
  return {
    start: offsets.start - found[1].length - found[2].length,
    end:
      offsets.start +
      (found[1].startsWith("<") && source[offsets.start] === ">" ? 1 : 0),
    query: found[2].trim(),
    kind: found[1].endsWith("#") ? ("channel" as const) : ("role" as const),
  };
}
