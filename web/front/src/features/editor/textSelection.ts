export function selectionOffsets(element: HTMLElement) {
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

export function restoreSelection(
  element: HTMLElement,
  start: number,
  end: number,
  backward = false,
) {
  if (!element.firstChild) element.append(document.createTextNode(""));
  const locate = (offset: number): [Node, number] => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    let last: Node = element.firstChild!;
    while ((node = walker.nextNode())) {
      last = node;
      const size = node.textContent?.length ?? 0;
      if (offset <= size) return [node, offset];
      offset -= size;
    }
    return [last, last.textContent?.length ?? 0];
  };
  const range = document.createRange();
  range.setStart(...locate(start));
  range.setEnd(...locate(end));
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  if (backward)
    selection?.setBaseAndExtent(
      range.endContainer,
      range.endOffset,
      range.startContainer,
      range.startOffset,
    );
}

/** Map a rendered leaf back to Markdown, including escaped punctuation and emoji. */
export function markdownSelection(root: HTMLElement, x: number, y: number) {
  const caret = document.caretPositionFromPoint?.(x, y);
  const fallback = !caret ? document.caretRangeFromPoint?.(x, y) : undefined;
  const node = caret?.offsetNode ?? fallback?.startContainer;
  const offset = caret?.offset ?? fallback?.startOffset ?? 0;
  return node ? sourceOffset(root, node, offset) : undefined;
}

export function markdownRange(root: HTMLElement) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return undefined;
  const range = selection.getRangeAt(0);
  const start = sourceOffset(root, range.startContainer, range.startOffset);
  const end = sourceOffset(root, range.endContainer, range.endOffset);
  return start === undefined || end === undefined ? undefined : { start, end };
}

export function sourceOffset(
  root: HTMLElement,
  node: Node,
  offset: number,
  source = "",
) {
  if (!root.contains(node)) return undefined;
  if (node === root && offset === 0) return 0;
  if (node === root && offset === node.childNodes.length)
    return source.length || Number(root.dataset.sourceLength ?? 0);
  const mapped = (
    node instanceof Element ? node : node?.parentElement
  )?.closest<HTMLElement>("[data-source-start]");
  if (!mapped || !root.contains(mapped)) {
    if (node instanceof Element) {
      const previous = node.childNodes[offset - 1];
      // The boundary after a formatted envelope belongs to its end, before
      // any source-only line break leading to the next rendered paragraph.
      if (previous instanceof HTMLElement && previous.dataset.sourceEnd)
        return Number(previous.dataset.sourceEnd);
      const next = node.childNodes[offset];
      const leaf =
        next instanceof Element
          ? next.matches("[data-source-start]")
            ? next
            : next.querySelector("[data-source-start]")
          : null;
      if (leaf instanceof HTMLElement) return Number(leaf.dataset.sourceStart);
      const leaves =
        previous instanceof Element
          ? [previous, ...previous.querySelectorAll("[data-source-start]")]
          : [];
      const last = leaves
        .filter((element) => element.hasAttribute("data-source-start"))
        .at(-1) as HTMLElement | undefined;
      if (last)
        return (
          Number(last.dataset.sourceStart) +
          (
            last.dataset.sourceToken ??
            last.dataset.sourceRaw ??
            last.textContent ??
            ""
          ).length
        );
    }
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(node, offset);
    return range.toString().length;
  }
  const range = document.createRange();
  range.selectNodeContents(mapped);
  range.setEnd(node, offset);
  // An image represents its alt text, not an empty DOM range.
  const fragment = range.cloneContents();
  fragment.querySelectorAll("img").forEach((img) => img.replaceWith(img.alt));
  let length = fragment.textContent?.length ?? 0;
  if (mapped.dataset.sourcePositions) {
    const positions = JSON.parse(mapped.dataset.sourcePositions) as number[];
    return positions[Math.min(length, positions.length - 1)];
  }
  if (mapped.dataset.sourceContentStart) {
    if (mapped.hasAttribute("data-source-visible"))
      return Number(mapped.dataset.sourceStart) + length;
    if (mapped.tagName === "PRE")
      return Number(mapped.dataset.sourceContentStart) + length;
    if (node === mapped)
      return offset
        ? Number(mapped.dataset.sourceEnd)
        : Number(mapped.dataset.sourceStart);
    return Number(mapped.dataset.sourceContentStart) + length;
  }
  const token = mapped.dataset.sourceToken;
  if (token) length = length ? token.length : 0;
  const raw = mapped.dataset.sourceRaw;
  if (raw) {
    let rawOffset = 0;
    while (length > 0 && rawOffset < raw.length) {
      if (
        raw[rawOffset] === "\\" &&
        /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(raw[rawOffset + 1] ?? "")
      )
        rawOffset++;
      rawOffset++;
      length--;
    }
    length = rawOffset;
  }
  return Number(mapped.dataset.sourceStart) + length;
}

export function restoreMarkdownSelection(
  root: HTMLElement,
  start: number,
  end: number,
  source: string,
  backward = false,
) {
  const leaves = [...root.querySelectorAll<HTMLElement>("[data-source-start]")];
  const locate = (offset: number): [Node, number] => {
    if (!leaves.length) return [root, 0];
    for (const wrapper of leaves) {
      if (
        !wrapper.hasAttribute("data-source-content-start") ||
        wrapper.hasAttribute("data-source-visible") ||
        !wrapper.parentNode
      )
        continue;
      const index = [...wrapper.parentNode.childNodes].indexOf(wrapper);
      if (
        offset === Number(wrapper.dataset.sourceStart) &&
        offset < Number(wrapper.dataset.sourceContentStart)
      )
        return [wrapper.parentNode, index];
      if (
        offset === Number(wrapper.dataset.sourceEnd) &&
        offset > Number(wrapper.dataset.sourceContentEnd)
      )
        return [wrapper.parentNode, index + 1];
    }
    let leaf = leaves[0];
    for (const candidate of leaves) {
      if (Number(candidate.dataset.sourceStart) <= offset) leaf = candidate;
      else break;
    }
    let length = Math.max(
      0,
      offset -
        Number(leaf.dataset.sourceContentStart ?? leaf.dataset.sourceStart),
    );
    if (!leaf.textContent && !leaf.querySelector("img")) return [leaf, 0];
    if (leaf.dataset.sourcePositions) {
      const positions = JSON.parse(leaf.dataset.sourcePositions) as number[];
      const index = positions.findIndex((position) => position >= offset);
      length = index < 0 ? positions.length - 1 : index;
    }
    if (leaf.dataset.sourceToken) {
      const index = [...leaf.parentNode!.childNodes].indexOf(leaf);
      return [leaf.parentNode!, index + (length ? 1 : 0)];
    }
    if (leaf.dataset.sourceRaw)
      length = leaf.dataset.sourceRaw
        .slice(0, length)
        .replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, "$1").length;
    const walker = document.createTreeWalker(
      leaf,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );
    let node: Node | null,
      last: Node = leaf;
    while ((node = walker.nextNode())) {
      if (node instanceof HTMLImageElement) {
        const index = [...node.parentNode!.childNodes].indexOf(node);
        if (length <= node.alt.length)
          return [node.parentNode!, index + (length ? 1 : 0)];
        length -= node.alt.length;
      } else if (node.nodeType === Node.TEXT_NODE) {
        last = node;
        const size = node.textContent?.length ?? 0;
        if (length <= size) return [node, length];
        length -= size;
      }
    }
    return [
      last,
      last.nodeType === Node.TEXT_NODE
        ? (last.textContent?.length ?? 0)
        : last.childNodes.length,
    ];
  };
  const range = document.createRange();
  range.setStart(...locate(Math.min(start, source.length)));
  range.setEnd(...locate(Math.min(end, source.length)));
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  if (backward)
    selection?.setBaseAndExtent(
      range.endContainer,
      range.endOffset,
      range.startContainer,
      range.startOffset,
    );
}

/** A browser deletion spans visible text, never adjacent hidden Markdown markers. */
export function markdownTargetRange(
  root: HTMLElement,
  target: Pick<
    StaticRange,
    "startContainer" | "startOffset" | "endContainer" | "endOffset"
  >,
  source: string,
) {
  let start = sourceOffset(
    root,
    target.startContainer,
    target.startOffset,
    source,
  );
  let end = sourceOffset(root, target.endContainer, target.endOffset, source);
  if (start === undefined || end === undefined) return undefined;
  const wrappers = [
    ...root.querySelectorAll<HTMLElement>("[data-source-content-start]"),
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of wrappers) {
      if (node.hasAttribute("data-source-visible")) continue;
      const from = Number(node.dataset.sourceStart),
        to = Number(node.dataset.sourceEnd);
      if (
        start === Number(node.dataset.sourceContentEnd) &&
        end > to &&
        to > start
      ) {
        start = to;
        changed = true;
      }
      if (
        end === Number(node.dataset.sourceContentStart) &&
        start < from &&
        from < end
      ) {
        end = from;
        changed = true;
      }
    }
  }
  return {
    start: Math.min(start, source.length),
    end: Math.min(end, source.length),
  };
}
