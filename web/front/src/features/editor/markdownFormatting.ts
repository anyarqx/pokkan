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

export function formatMarkdown(
  kind: Exclude<MarkdownFormat, "link">,
  value: string,
  start: number,
  end: number,
) {
  if (kind === "codeBlock") {
    const selected = value.slice(start, end);
    const fenced = /^```[^\n]*\n([\s\S]*?)\n?```$/.exec(selected);
    if (fenced)
      return {
        text: value.slice(0, start) + fenced[1] + value.slice(end),
        start,
        end: start + fenced[1].length,
      };
    const before = value.slice(0, start),
      after = value.slice(end);
    const open = `${before && !before.endsWith("\n") ? "\n" : ""}\`\`\`\n`;
    const close = `\n\`\`\`${after && !after.startsWith("\n") ? "\n" : ""}`;
    return {
      text: before + open + selected + close + after,
      start: start + open.length,
      end: end + open.length,
    };
  }
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
  };
  const [open, close] = wrappers[kind] ?? ["", ""];
  const selected = value.slice(start, end);
  if (
    open &&
    close &&
    value.slice(start - open.length, start) === open &&
    value.slice(end, end + close.length) === close
  ) {
    return {
      text:
        value.slice(0, start - open.length) +
        selected +
        value.slice(end + close.length),
      start: start - open.length,
      end: end - open.length,
    };
  }
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
  const first = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
  // A selection ending at the start of a line does not include that line.
  const boundary = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const after = value.indexOf("\n", boundary);
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
