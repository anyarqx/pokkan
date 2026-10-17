/** Shared source boundaries for displaying and editing a masked Markdown link. */
export function maskedLinkAt(source: string, start: number) {
  if (source[start] !== "[") return;
  const labelEnd = source.indexOf("](", start + 1);
  if (labelEnd < 0) return;
  const urlStart = labelEnd + 2;
  let end = urlStart,
    depth = 1;
  for (; end < source.length; end++) {
    if (source[end] === "\\") {
      end++;
      continue;
    }
    if (source[end] === "(") depth++;
    if (source[end] === ")" && --depth === 0) break;
  }
  if (end >= source.length) return;
  return {
    start,
    end: end + 1,
    labelStart: start + 1,
    labelEnd,
    label: source.slice(start + 1, labelEnd),
    url: source
      .slice(urlStart, end)
      .replace(/^<(.*)>$/, "$1")
      .replace(/\\([()\\])/g, "$1"),
  };
}

export function maskedLinkForSelection(
  source: string,
  start: number,
  end: number,
) {
  for (
    let index = source.indexOf("[");
    index >= 0 && index <= start;
    index = source.indexOf("[", index + 1)
  ) {
    const link = maskedLinkAt(source, index);
    if (link && start >= link.start && start < link.end && end <= link.end)
      return link;
  }
}
