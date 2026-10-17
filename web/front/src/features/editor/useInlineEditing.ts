import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  sourceOffset,
  restoreMarkdownSelection,
  restoreSelection,
  selectionOffsets,
  markdownTargetRange,
} from "./textSelection";

type TextRange = { start: number; end: number; backward?: boolean };

/** Native selection/composition over a source-preserving rendered Markdown projection. */
export function useInlineEditing(
  field: RefObject<HTMLElement | null>,
  source: string,
  active: boolean,
  formatted: boolean,
) {
  const staging = useRef<HTMLSpanElement>(null);
  const current = useRef(source);
  const rendered = useRef(source);
  const pending = useRef<TextRange | undefined>(undefined);
  const intent = useRef<TextRange | undefined>(undefined);
  const placed = useRef<
    | { start: Node; startOffset: number; end: Node; endOffset: number }
    | undefined
  >(undefined);
  const rememberSelection = () => {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
    placed.current = range
      ? {
          start: range.startContainer,
          startOffset: range.startOffset,
          end: range.endContainer,
          endOffset: range.endOffset,
        }
      : undefined;
  };
  const composition = useRef<{ source: string; range: TextRange } | undefined>(
    undefined,
  );
  const previous = useRef<
    | { source: string; text: string; range?: TextRange; insert?: string }
    | undefined
  >(undefined);
  const selection = (): TextRange | undefined => {
    if (pending.current) return pending.current;
    const selected = window.getSelection();
    if (!field.current || !selected?.rangeCount) return undefined;
    const range = selected.getRangeAt(0);
    const last = placed.current;
    if (
      intent.current &&
      last &&
      range.startContainer === last.start &&
      range.startOffset === last.startOffset &&
      range.endContainer === last.end &&
      range.endOffset === last.endOffset
    )
      return intent.current;
    intent.current = undefined;
    const backward =
      !range.collapsed &&
      selected.anchorNode === range.endContainer &&
      selected.anchorOffset === range.endOffset;
    if (!formatted) {
      const offsets = selectionOffsets(field.current);
      return offsets ? { ...offsets, backward } : undefined;
    }
    const start = sourceOffset(
      field.current,
      range.startContainer,
      range.startOffset,
      current.current,
    );
    const end = sourceOffset(
      field.current,
      range.endContainer,
      range.endOffset,
      current.current,
    );
    return start === undefined || end === undefined
      ? undefined
      : { start, end, backward };
  };
  const prepare = (next: string, range?: TextRange) => {
    current.current = next;
    if (range) {
      pending.current = range;
    }
    // A cancelled composition or a same-value native correction may not cause
    // React to render. Reconcile its DOM from the existing projection as well.
    if (next === rendered.current) sync();
  };
  const completeRange = (range: TextRange) => {
    let { start, end } = range;
    let changed = true;
    const wrappers = [
      ...(field.current?.querySelectorAll<HTMLElement>(
        "[data-source-content-start]",
      ) ?? []),
    ];
    while (changed && start < end) {
      changed = false;
      for (const wrapper of wrappers)
        if (
          !wrapper.hasAttribute("data-source-visible") &&
          start <= Number(wrapper.dataset.sourceContentStart) &&
          end >= Number(wrapper.dataset.sourceContentEnd) &&
          (start > Number(wrapper.dataset.sourceStart) ||
            end < Number(wrapper.dataset.sourceEnd))
        ) {
          start = Math.min(start, Number(wrapper.dataset.sourceStart));
          end = Math.max(end, Number(wrapper.dataset.sourceEnd));
          changed = true;
        }
    }
    return { start, end };
  };
  const replacementRange = (range: TextRange) => {
    let { start, end } = range;
    // Keep a code block when replacing its body. A selection extending beyond
    // its body also owns the fence, so no orphaned opening/closing marker remains.
    if (end > start)
      for (const block of field.current?.querySelectorAll<HTMLElement>(
        "pre[data-source-content-start]",
      ) ?? []) {
        const from = Number(block.dataset.sourceContentStart);
        const to = Number(block.dataset.sourceContentEnd);
        if (start <= from && end >= to && (start < from || end > to)) {
          start = Math.min(start, Number(block.dataset.sourceStart));
          end = Math.max(end, Number(block.dataset.sourceEnd));
        }
      }
    return { start, end };
  };
  const replacement = (
    insert: string,
    range: TextRange,
    limit?: number,
    text = current.current,
  ) => {
    const { start, end } = replacementRange(range);
    if (limit !== undefined)
      insert = insert.slice(0, Math.max(0, limit - text.length + end - start));
    const cursor = start + insert.length;
    return {
      text: text.slice(0, start) + insert + text.slice(end),
      start: cursor,
      end: cursor,
    };
  };
  const sync = () => {
    const element = field.current,
      template = staging.current;
    if (!active || !element || (formatted && !template) || composition.current)
      return;
    const range = pending.current ?? selection();
    const changed = formatted
      ? reconcile(element, template!)
      : element.textContent !== current.current;
    if (!formatted && changed) element.textContent = current.current;
    element
      .querySelectorAll<HTMLElement>("[data-source-token]")
      .forEach((token) => {
        token.contentEditable = "false";
      });
    element.querySelectorAll<HTMLElement>("[tabindex]").forEach((control) => {
      control.tabIndex = -1;
    });
    if (
      document.activeElement === element &&
      range &&
      (changed || pending.current)
    ) {
      intent.current = {
        start: Math.min(range.start, current.current.length),
        end: Math.min(range.end, current.current.length),
        backward: range.backward,
      };
      if (formatted)
        restoreMarkdownSelection(
          element,
          range.start,
          range.end,
          current.current,
          range.backward,
        );
      else restoreSelection(element, range.start, range.end, range.backward);
      rememberSelection();
    }
    pending.current = undefined;
  };
  useLayoutEffect(() => {
    if (!active) {
      current.current = source;
      rendered.current = source;
      pending.current = undefined;
      intent.current = undefined;
      if (!formatted && field.current && field.current.textContent !== source)
        field.current.textContent = source;
      return;
    }
    const changed = rendered.current !== source;
    current.current = source;
    rendered.current = source;
    // Plain fields are already editable at rest. Focusing them must not restore
    // the old value over a native edit that has just started in the same event.
    if (formatted || changed || pending.current) sync();
  }, [source, active, formatted]);
  useLayoutEffect(() => {
    if (!active || !formatted || !staging.current) return;
    // Syntax highlighting and failed media may finish after the parent rendered.
    const observer = new MutationObserver(sync);
    observer.observe(staging.current, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
    });
    return () => observer.disconnect();
  }, [active, formatted]);

  return {
    staging,
    isComposing: () => Boolean(composition.current),
    source: () => current.current,
    selection,
    prepare,
    completeRange,
    replacement,
    select(range: TextRange) {
      pending.current = range;
      // A same-source action (for example skipping an automatically paired
      // delimiter) does not cause React to render, so place it immediately.
      if (current.current === rendered.current) sync();
    },
    moved() {
      intent.current = undefined;
    },
    navigateBlock(key: string, extend: boolean) {
      if (!/^Arrow(?:Left|Right|Up|Down)$/.test(key)) return false;
      const element = field.current;
      const selected = window.getSelection();
      const range = selection();
      if (
        !formatted ||
        !element ||
        !range ||
        !selected?.focusNode ||
        composition.current
      )
        return false;
      const focus = range.backward ? range.start : range.end;
      const anchor = range.backward ? range.end : range.start;
      const focusNode = selected.focusNode;
      const inside = (
        focusNode instanceof Element ? focusNode : focusNode.parentElement
      )?.closest<HTMLElement>("pre[data-source-content-start]");
      let target: number | undefined;
      if (inside && element.contains(inside)) {
        const start = Number(inside.dataset.sourceContentStart),
          end = Number(inside.dataset.sourceContentEnd);
        if (
          (key === "ArrowLeft" && focus === start) ||
          (key === "ArrowUp" &&
            !inside.previousElementSibling &&
            !current.current.slice(start, focus).includes("\n"))
        )
          target = Number(inside.dataset.sourceStart);
        else if (
          (key === "ArrowRight" && focus === end) ||
          (key === "ArrowDown" &&
            !inside.nextElementSibling &&
            !current.current.slice(focus, end).includes("\n"))
        )
          target = Number(inside.dataset.sourceEnd);
      } else if (
        focusNode instanceof Element &&
        (key === "ArrowLeft" || key === "ArrowRight")
      ) {
        const adjacent =
          focusNode.childNodes[
            selected.focusOffset + (key === "ArrowLeft" ? -1 : 0)
          ];
        if (
          adjacent instanceof HTMLElement &&
          adjacent.matches("pre[data-source-content-start]")
        )
          target = Number(
            key === "ArrowLeft"
              ? adjacent.dataset.sourceContentEnd
              : adjacent.dataset.sourceContentStart,
          );
      }
      if (target === undefined || (!extend && range.start !== range.end))
        return false;
      pending.current = extend
        ? {
            start: Math.min(anchor, target),
            end: Math.max(anchor, target),
            backward: target < anchor,
          }
        : { start: target, end: target };
      sync();
      return true;
    },
    beforeInput(
      event: InputEvent,
      commit: (next: string) => void,
      limit?: number,
    ) {
      if (event.isComposing || composition.current || !field.current)
        return false;
      let range = selection();
      const targets = event.getTargetRanges?.();
      if (
        targets?.length &&
        (event.inputType.startsWith("delete") ||
          event.inputType === "insertReplacementText" ||
          !event.cancelable) &&
        range?.start === range?.end
      ) {
        const target = targets[0];
        const targetRange = formatted
          ? markdownTargetRange(field.current, target, current.current)
          : {
              start: sourceOffset(
                field.current,
                target.startContainer,
                target.startOffset,
                current.current,
              ),
              end: sourceOffset(
                field.current,
                target.endContainer,
                target.endOffset,
                current.current,
              ),
            };
        const start = targetRange?.start;
        const end = targetRange?.end;
        // A collapsed native deletion range means there is no rendered text
        // to delete. Hidden Markdown delimiters must not become its fallback.
        if (
          event.cancelable &&
          event.inputType.startsWith("delete") &&
          start !== undefined &&
          start === end
        ) {
          event.preventDefault();
          previous.current = undefined;
          return true;
        }
        if (
          event.cancelable &&
          event.inputType.startsWith("delete") &&
          start !== undefined &&
          end !== undefined
        ) {
          // Joining a paragraph and a fenced block is a change of block format,
          // not deletion of an arbitrary character in the hidden fence.
          for (const block of field.current.querySelectorAll<HTMLElement>(
            "pre[data-source-content-start]",
          )) {
            const opening = Number(block.dataset.sourceStart),
              closing = Number(block.dataset.sourceEnd);
            const leading = start < opening && end === opening;
            const trailing = start === closing && end > closing;
            if (!leading && !trailing) continue;
            const text = current.current;
            const before = text.slice(0, start);
            if (
              leading &&
              /^(?:> )*$/.test(before.slice(before.lastIndexOf("\n") + 1))
            )
              continue;
            if (trailing && text[end] === "\n") continue;
            const body = text.slice(
              Number(block.dataset.sourceContentStart),
              Number(block.dataset.sourceContentEnd),
            );
            const next = leading
              ? text.slice(0, start) + body + text.slice(closing)
              : text.slice(0, opening) + body + text.slice(end);
            const cursor = leading ? start : opening + body.length;
            event.preventDefault();
            previous.current = undefined;
            prepare(next, { start: cursor, end: cursor });
            commit(next);
            return true;
          }
        }
        if (start !== undefined && end !== undefined && end > start)
          range = { start, end };
      }
      previous.current = {
        source: current.current,
        text: visibleText(field.current),
        range: range ? replacementRange(range) : undefined,
        insert: event.inputType.startsWith("insert")
          ? event.inputType === "insertParagraph" ||
            event.inputType === "insertLineBreak"
            ? "\n"
            : (event.data ?? undefined)
          : undefined,
      };
      if (!event.cancelable) return false;
      if (!range) return false;
      const type = event.inputType;
      if (
        ![
          "insertText",
          "insertReplacementText",
          "insertParagraph",
          "insertLineBreak",
        ].includes(type) &&
        !type.startsWith("delete")
      )
        return false;
      event.preventDefault();
      const text = current.current;
      let { start, end } = range;
      if (type.startsWith("delete") && end > start)
        ({ start, end } = completeRange(range));
      let insert = type.startsWith("delete")
        ? ""
        : type === "insertParagraph" || type === "insertLineBreak"
          ? "\n"
          : (event.data ?? "");
      if (type.startsWith("delete") && start === end) {
        const units = [
          ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
            text,
          ),
        ];
        if (type.endsWith("Backward"))
          start = units.filter((unit) => unit.index < start).at(-1)?.index ?? 0;
        else end = units.find((unit) => unit.index > end)?.index ?? text.length;
      }
      const next = replacement(insert, { start, end }, limit);
      previous.current = undefined;
      prepare(next.text, next);
      commit(next.text);
      return true;
    },
    compositionStart() {
      composition.current = {
        source: current.current,
        range: replacementRange(
          selection() ?? {
            start: current.current.length,
            end: current.current.length,
          },
        ),
      };
      intent.current = undefined;
    },
    compositionEnd(
      text: string,
      commit: (next: string) => void,
      limit?: number,
    ) {
      const pending = composition.current;
      composition.current = undefined;
      previous.current = undefined;
      if (!pending) return;
      const next = replacement(text, pending.range, limit, pending.source);
      prepare(next.text, next);
      commit(next.text);
    },
    input(commit: (next: string) => void, limit?: number) {
      if (composition.current || !field.current) return;
      const before = previous.current;
      previous.current = undefined;
      const text = visibleText(field.current);
      // Accessibility tools and browsers may insert text without a cancellable beforeinput.
      if (!formatted || !field.current.querySelector("[data-source-start]")) {
        const next = limit ? text.slice(0, limit) : text;
        const range = selectionOffsets(field.current);
        prepare(next, range ?? { start: next.length, end: next.length });
        commit(next);
        return;
      }
      if (!before) {
        // Native corrections can arrive without beforeinput. The React-owned
        // staging tree is still the previous authorized Markdown projection.
        // Patch only the changed range instead of flattening its formatting.
        const template = staging.current;
        if (!template) return;
        const oldText = template.textContent ?? "";
        const newText = field.current.textContent ?? "";
        // Some browsers emit a final input after compositionend. Its DOM has
        // already been committed, so it must not consume hidden closing syntax.
        if (oldText === newText) return;
        let start = 0,
          suffix = 0;
        while (start < oldText.length && oldText[start] === newText[start])
          start++;
        while (
          suffix < oldText.length - start &&
          suffix < newText.length - start &&
          oldText.at(-suffix - 1) === newText.at(-suffix - 1)
        )
          suffix++;
        const point = (offset: number) => {
          const walker = document.createTreeWalker(
            template,
            NodeFilter.SHOW_TEXT,
          );
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const length = node.textContent?.length ?? 0;
            if (offset <= length)
              return sourceOffset(template, node, offset, current.current) ?? 0;
            offset -= length;
          }
          return current.current.length;
        };
        const from = start === 0 ? 0 : point(start);
        const to =
          suffix === 0
            ? current.current.length
            : point(oldText.length - suffix);
        const insert = newText.slice(start, newText.length - suffix);
        const next =
          current.current.slice(0, from) + insert + current.current.slice(to);
        prepare(next, {
          start: from + insert.length,
          end: from + insert.length,
        });
        commit(next);
        return;
      }
      let prefix = 0;
      while (
        prefix < before.text.length &&
        before.text[prefix] === text[prefix]
      )
        prefix++;
      let suffix = 0;
      while (
        suffix < before.text.length - prefix &&
        suffix < text.length - prefix &&
        before.text.at(-suffix - 1) === text.at(-suffix - 1)
      )
        suffix++;
      const start = before.range?.start ?? prefix;
      const end = before.range?.end ?? before.source.length - suffix;
      let inserted = before.insert ?? text.slice(prefix, text.length - suffix);
      const next = replacement(inserted, { start, end }, limit, before.source);
      prepare(next.text, next);
      commit(next.text);
    },
  };
}

function visibleText(element: HTMLElement) {
  return (element.innerText ?? element.textContent ?? "").replace(/\r/g, "");
}

function reconcile(target: Node, template: Node): boolean {
  let changed = false;
  const children = [...template.childNodes];
  for (let index = 0; index < children.length; index++) {
    const next = children[index],
      current = target.childNodes[index];
    if (!current) {
      target.appendChild(next.cloneNode(true));
      changed = true;
      continue;
    }
    if (
      current.nodeType !== next.nodeType ||
      current.nodeName !== next.nodeName
    ) {
      target.replaceChild(next.cloneNode(true), current);
      changed = true;
      continue;
    }
    if (current.nodeType === Node.TEXT_NODE) {
      if (current.nodeValue !== next.nodeValue) {
        current.nodeValue = next.nodeValue;
        changed = true;
      }
    } else if (current instanceof Element && next instanceof Element) {
      for (const attribute of [...current.attributes])
        if (
          !next.hasAttribute(attribute.name) &&
          attribute.name !== "contenteditable"
        )
          current.removeAttribute(attribute.name);
      for (const attribute of [...next.attributes])
        if (current.getAttribute(attribute.name) !== attribute.value)
          current.setAttribute(attribute.name, attribute.value);
      changed = reconcile(current, next) || changed;
    }
  }
  while (target.childNodes.length > children.length) {
    target.lastChild?.remove();
    changed = true;
  }
  return changed;
}
