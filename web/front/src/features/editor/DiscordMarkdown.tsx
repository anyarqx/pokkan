import { lazy, memo, Suspense, useContext, type ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { Placeholder } from "./placeholders";
import { Emoji, UnicodeEmojiText } from "./Emoji";
import { isSafeLink } from "../../shared/urls";
import { maskedLinkAt } from "./markdownLinks";
import {
  ServerReferencesContext,
  type ServerReference,
} from "./serverReferences";

const HighlightedCode = lazy(() => import("./HighlightedCode"));

export type MarkdownContext = "message" | "inline";

export interface DiscordMarkdownProps {
  readonly source: string;
  readonly placeholders?: readonly Placeholder[];
  readonly previewPlaceholders?: boolean;
  readonly context?: MarkdownContext;
  readonly onToggleSpoiler?: (key: string) => void;
  readonly revealedSpoilers?: ReadonlySet<string>;
  readonly readOnly?: boolean;
  readonly sourceMap?: boolean;
  readonly editing?: boolean;
}

const revealedWhileEditing = { has: () => true };

/**
 * A deliberately small, source-preserving Discord formatter. It produces React
 * nodes (never HTML strings), so source text cannot execute in the preview.
 */
export const DiscordMarkdown = memo(function DiscordMarkdown(
  props: DiscordMarkdownProps,
) {
  const { i18n, t } = useTranslation();
  const references = useContext(ServerReferencesContext);
  const placeholders = new Map(
    (props.placeholders ?? []).map((item) => [item.key, item]),
  );
  const inline = (source: string, key: string, start: number) =>
    inlineNodes(
      source,
      key,
      placeholders,
      Boolean(props.previewPlaceholders),
      props.onToggleSpoiler,
      props.editing ? revealedWhileEditing : props.revealedSpoilers,
      Boolean(props.readOnly),
      t,
      i18n.resolvedLanguage ?? i18n.language,
      props.context !== "inline",
      references,
      props.sourceMap ? start : undefined,
      Boolean(props.editing),
    );
  if (!props.context || props.context === "inline")
    return (
      <span className="discord-markdown">
        {inline(props.source, "inline", 0)}
      </span>
    );
  return (
    <div className="discord-markdown">
      {blockNodes(
        markdownLines(props.source),
        inline,
        "block",
        props.sourceMap,
      )}
    </div>
  );
});

interface MarkdownLine {
  readonly text: string;
  readonly start: number;
}

function markdownLines(source: string): MarkdownLine[] {
  let start = 0;
  return source.split("\n").map((raw) => {
    const line = { text: raw.replace(/\r/g, ""), start };
    start += raw.length + 1;
    return line;
  });
}

function blockNodes(
  input: readonly MarkdownLine[],
  inline: (source: string, key: string, start: number) => ReactNode[],
  prefix: string,
  sourceMap = false,
  quoted = false,
): ReactNode[] {
  const rows = [...input];
  const nodes: ReactNode[] = [];
  let index = 0;
  while (index < rows.length) {
    const line = rows[index];
    const row = line.text;
    const key = `${prefix}-${index}`;
    const fence = /^```(.*)$/.exec(row);
    if (fence) {
      const close = fence[1].indexOf("```");
      if (close !== -1) {
        const body = fence[1].slice(0, close);
        nodes.push(
          <pre
            className="discord-code-block"
            key={key}
            data-source-start={sourceMap ? line.start : undefined}
            data-source-end={sourceMap ? line.start + 3 + close + 3 : undefined}
            data-source-content-start={sourceMap ? line.start + 3 : undefined}
            data-source-content-end={
              sourceMap ? line.start + 3 + close : undefined
            }
          >
            <code>
              <UnicodeEmojiText value={body} />
            </code>
            {sourceMap ? (
              <span
                data-source-start={line.start + 3 + close}
                data-editor-caret
                aria-hidden="true"
              >
                <br />
              </span>
            ) : null}
          </pre>,
        );
        const tail = fence[1].slice(close + 3);
        if (tail)
          rows.splice(index + 1, 0, {
            text: tail,
            start: line.start + 3 + close + 3,
          });
        index += 1;
        continue;
      }
      const language = /^[\w+#.-]+$/.test(fence[1]) ? fence[1] : undefined;
      const body: MarkdownLine[] =
        language || !fence[1]
          ? []
          : [{ text: fence[1], start: line.start + 3 }];
      index += 1;
      while (index < rows.length && !rows[index].text.includes("```"))
        body.push(rows[index++]);
      let end = body.at(-1)
        ? body.at(-1)!.start + body.at(-1)!.text.length
        : line.start + row.length + 1;
      let emptyStart = line.start + row.length + 1;
      if (index < rows.length) {
        const closing = rows[index];
        const fenceAt = closing.text.indexOf("```");
        emptyStart = closing.start + fenceAt;
        const last = closing.text.slice(0, fenceAt);
        if (last) body.push({ text: last, start: closing.start });
        end = closing.start + fenceAt + 3;
        const tail = closing.text.slice(fenceAt + 3);
        if (tail) rows.splice(index + 1, 0, { text: tail, start: end });
        index += 1;
      }
      // Even an empty fenced block needs an actual insertion position.
      if (!body.length) body.push({ text: "", start: emptyStart });
      const text = body.map((part) => part.text).join("\n");
      const positions: number[] = [];
      if (sourceMap) {
        body.forEach((part, bodyIndex) => {
          for (let offset = 0; offset < part.text.length; offset++)
            positions.push(part.start + offset);
          if (bodyIndex < body.length - 1)
            positions.push(part.start + part.text.length);
        });
        const last = body.at(-1)!;
        positions.push(last.start + last.text.length);
      }
      nodes.push(
        <pre
          className="discord-code-block"
          key={key}
          data-source-start={sourceMap ? line.start : undefined}
          data-source-end={sourceMap ? end : undefined}
          data-source-content-start={sourceMap ? positions[0] : undefined}
          data-source-content-end={sourceMap ? positions.at(-1) : undefined}
          data-source-positions={
            sourceMap &&
            positions.some(
              (position, offset) => position !== positions[0] + offset,
            )
              ? JSON.stringify(positions)
              : undefined
          }
        >
          <Suspense fallback={<code>{text}</code>}>
            <HighlightedCode language={language} source={text} />
          </Suspense>
          {sourceMap ? (
            <span
              data-source-start={positions.at(-1)}
              data-editor-caret
              aria-hidden="true"
            >
              <br />
            </span>
          ) : null}
        </pre>,
      );
      continue;
    }
    const heading = /^(#{1,3}) +(.+)$/.exec(row);
    if (heading) {
      const Heading = `h${heading[1].length}` as "h1" | "h2" | "h3";
      nodes.push(
        <Heading key={key}>
          {inline(heading[2], key, line.start + row.length - heading[2].length)}
        </Heading>,
      );
      index += 1;
      continue;
    }
    if (row.startsWith("-# ")) {
      nodes.push(
        <p className="discord-subtext" key={key}>
          {inline(row.slice(3), key, line.start + 3)}
        </p>,
      );
      index += 1;
      continue;
    }
    if (!quoted && row.startsWith(">>> ")) {
      nodes.push(
        <blockquote key={key}>
          {blockNodes(
            [
              { text: row.slice(4), start: line.start + 4 },
              ...rows.slice(index + 1),
            ],
            inline,
            key,
            sourceMap,
            true,
          )}
        </blockquote>,
      );
      break;
    }
    if (!quoted && row.startsWith("> ")) {
      const quote: MarkdownLine[] = [];
      while (index < rows.length && rows[index].text.startsWith("> ")) {
        const part = rows[index++];
        quote.push({ text: part.text.slice(2), start: part.start + 2 });
      }
      nodes.push(
        <blockquote key={key}>
          {blockNodes(quote, inline, key, sourceMap, true)}
        </blockquote>,
      );
      continue;
    }
    const list = /^( *)([-*]|\d+\.) +(.+)$/.exec(row);
    if (list) {
      const indent = list[1].length;
      const ordered = /\d/.test(list[2]);
      const items: ReactNode[] = [];
      while (index < rows.length) {
        const part = rows[index];
        const item = /^( *)([-*]|\d+\.) +(.+)$/.exec(part.text);
        if (
          !item ||
          item[1].length !== indent ||
          /\d/.test(item[2]) !== ordered
        )
          break;
        const itemKey = `${key}-${index++}`;
        const content: MarkdownLine[] = [
          {
            text: item[3],
            start: part.start + part.text.length - item[3].length,
          },
        ];
        while (
          index < rows.length &&
          rows[index].text.startsWith(" ".repeat(indent + 2))
        ) {
          const child = rows[index++];
          content.push({
            text: child.text.slice(indent + 2),
            start: child.start + indent + 2,
          });
        }
        items.push(
          <li key={itemKey}>
            {blockNodes(content, inline, itemKey, sourceMap, quoted)}
          </li>,
        );
      }
      nodes.push(
        ordered ? (
          <ol key={key} start={parseInt(list[2], 10)}>
            {items}
          </ol>
        ) : (
          <ul key={key}>{items}</ul>
        ),
      );
      continue;
    }
    nodes.push(
      <p
        key={key}
        data-source-start={sourceMap && !row ? line.start : undefined}
      >
        {row ? inline(row, key, line.start) : <br />}
      </p>,
    );
    index += 1;
  }
  return nodes;
}

function inlineNodes(
  source: string,
  key: string,
  placeholders: ReadonlyMap<string, Placeholder>,
  previewPlaceholders: boolean,
  onToggleSpoiler: DiscordMarkdownProps["onToggleSpoiler"],
  revealed: Pick<ReadonlySet<string>, "has"> | undefined,
  readOnly: boolean,
  t: TFunction,
  locale: string,
  links: boolean,
  references: readonly ServerReference[],
  sourceOffset?: number,
  editing = false,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let text = "";
  let textStart = 0;
  let index = 0;
  const flush = () => {
    if (!text) return;
    nodes.push(
      sourceOffset === undefined ? (
        <UnicodeEmojiText key={`${key}-text-${index}`} value={text} />
      ) : (
        <span
          key={`${key}-text-${index}`}
          data-source-start={sourceOffset + textStart}
          data-source-raw={source.slice(textStart, index)}
        >
          <UnicodeEmojiText value={text} />
        </span>
      ),
    );
    text = "";
  };
  const nested = (content: string, suffix: string, offset: number) =>
    inlineNodes(
      content,
      `${key}-${suffix}`,
      placeholders,
      previewPlaceholders,
      onToggleSpoiler,
      revealed,
      readOnly,
      t,
      locale,
      links,
      references,
      sourceOffset === undefined ? undefined : sourceOffset + offset,
      editing,
    );

  while (index < source.length) {
    if (!text) textStart = index;
    if (
      source[index] === "\\" &&
      /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(source[index + 1] ?? "")
    ) {
      if (editing) {
        flush();
        nodes.push(
          <span
            className="markdown-delimiter"
            key={`${key}-escape-${index}`}
            data-source-start={
              sourceOffset === undefined ? undefined : sourceOffset + index
            }
          >
            {"\\"}
          </span>,
          <span
            key={`${key}-escaped-${index}`}
            data-source-start={
              sourceOffset === undefined ? undefined : sourceOffset + index + 1
            }
          >
            {source[index + 1]}
          </span>,
        );
      } else text += source[index + 1];
      index += 2;
      continue;
    }
    const placeholder =
      source[index] === "{" ? source.indexOf("}", index + 1) : -1;
    if (placeholder > index) {
      const token = source.slice(index + 1, placeholder);
      const item = placeholders.get(token);
      if (item?.previewValue && previewPlaceholders) {
        flush();
        nodes.push(
          <span
            className="placeholder-preview"
            key={`${key}-placeholder-${index}`}
            title={t("editor.placeholderToken", { key: item.key })}
            data-source-start={
              sourceOffset === undefined ? undefined : sourceOffset + index
            }
            data-source-token={source.slice(index, placeholder + 1)}
          >
            {item.previewValue}
          </span>,
        );
        index = placeholder + 1;
        continue;
      }
    }
    const mention = source[index] === "<" ? source.indexOf(">", index + 1) : -1;
    if (mention > index) {
      const token = source.slice(index, mention + 1);
      const rendered = mentionNode(
        token,
        `${key}-mention-${index}`,
        t,
        locale,
        links,
        references,
      );
      if (rendered) {
        flush();
        nodes.push(
          sourceOffset === undefined ? (
            rendered
          ) : (
            <span
              key={`${key}-mapped-${index}`}
              data-source-start={sourceOffset + index}
              data-source-token={token}
            >
              {rendered}
            </span>
          ),
        );
        index = mention + 1;
        continue;
      }
    }
    const broadcast = links && /^@(everyone|here)\b/.exec(source.slice(index));
    if (broadcast) {
      flush();
      nodes.push(
        <span
          className="discord-mention"
          key={`${key}-broadcast-${index}`}
          data-source-start={
            sourceOffset === undefined ? undefined : sourceOffset + index
          }
        >
          {broadcast[0]}
        </span>,
      );
      index += broadcast[0].length;
      continue;
    }
    const masked = links ? maskedLinkAt(source, index) : undefined;
    if (masked) {
      const { label, url } = masked;
      flush();
      nodes.push(
        <a
          className="discord-markdown-link"
          href={readOnly && isSafeLink(url) ? url : undefined}
          key={`${key}-link-${index}`}
          rel="noreferrer"
          title={url}
          data-source-start={
            sourceOffset === undefined ? undefined : sourceOffset + masked.start
          }
          data-source-end={
            sourceOffset === undefined ? undefined : sourceOffset + masked.end
          }
          data-source-content-start={
            sourceOffset === undefined
              ? undefined
              : sourceOffset + masked.labelStart
          }
          data-source-content-end={
            sourceOffset === undefined
              ? undefined
              : sourceOffset + masked.labelEnd
          }
        >
          {nested(label, `link-${index}`, index + 1)}
        </a>,
      );
      index = masked.end;
      continue;
    }
    const auto =
      links &&
      /^(?:<(https?:\/\/[^>]+)>|(https?:\/\/[^\s<>]+))/.exec(
        source.slice(index),
      );
    if (auto) {
      const url = auto[1] ?? auto[2].replace(/[.,!?;:]+$/, "");
      flush();
      nodes.push(
        <a
          className="discord-markdown-link"
          href={readOnly && isSafeLink(url) ? url : undefined}
          key={`${key}-url-${index}`}
          rel="noreferrer"
          data-source-start={
            sourceOffset === undefined
              ? undefined
              : sourceOffset + index + (auto[1] ? 1 : 0)
          }
        >
          {url}
        </a>,
      );
      index += auto[1] ? auto[0].length : url.length;
      continue;
    }
    const marker = markerAt(source, index);
    if (marker) {
      let end = index + marker.value.length;
      while ((end = source.indexOf(marker.value, end)) !== -1) {
        let escapes = 0;
        for (let before = end - 1; source[before] === "\\"; before--) escapes++;
        // Backslashes are literal inside code. Outside it, an even run of
        // backslashes leaves the following delimiter available to close.
        if (marker.name === "code" || escapes % 2 === 0) {
          // The last two characters close bold in **bold *italic***.
          if (
            (marker.value === "**" || marker.value === "__") &&
            source[end + 2] === marker.value[0]
          )
            end += 1;
          break;
        }
        end += marker.value.length;
      }
      if (end > index + marker.value.length) {
        const content = source.slice(index + marker.value.length, end);
        flush();
        const tokenKey = `${key}-${marker.name}-${index}`;
        const firstNode = nodes.length;
        if (marker.name === "code")
          nodes.push(
            <code className="discord-inline-code" key={tokenKey}>
              <span
                data-source-start={
                  sourceOffset === undefined
                    ? undefined
                    : sourceOffset + index + marker.value.length
                }
              >
                {content}
              </span>
            </code>,
          );
        else if (marker.name === "spoiler") {
          const hidden = !revealed?.has(tokenKey);
          nodes.push(
            <span
              aria-label={
                hidden ? t("editor.revealSpoiler") : t("editor.hideSpoiler")
              }
              className={`discord-inline-spoiler${hidden ? " is-hidden" : ""}`}
              key={tokenKey}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                if (!(event.target as Element).closest("a[href]"))
                  onToggleSpoiler?.(tokenKey);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggleSpoiler?.(tokenKey);
                }
              }}
            >
              <span aria-hidden={hidden}>
                {nested(content, tokenKey, index + marker.value.length)}
              </span>
            </span>,
          );
        } else if (marker.name === "boldItalic")
          nodes.push(
            <strong key={tokenKey}>
              <em>{nested(content, tokenKey, index + marker.value.length)}</em>
            </strong>,
          );
        else if (marker.name === "underlineItalic")
          nodes.push(
            <u key={tokenKey}>
              <em>{nested(content, tokenKey, index + marker.value.length)}</em>
            </u>,
          );
        else if (marker.name === "bold")
          nodes.push(
            <strong key={tokenKey}>
              {nested(content, tokenKey, index + marker.value.length)}
            </strong>,
          );
        else if (marker.name === "underline")
          nodes.push(
            <u key={tokenKey}>
              {nested(content, tokenKey, index + marker.value.length)}
            </u>,
          );
        else if (marker.name === "strike")
          nodes.push(
            <s key={tokenKey}>
              {nested(content, tokenKey, index + marker.value.length)}
            </s>,
          );
        else
          nodes.push(
            <em key={tokenKey}>
              {nested(content, tokenKey, index + marker.value.length)}
            </em>,
          );
        if (sourceOffset !== undefined && nodes.length > firstNode) {
          const formatted = nodes.pop();
          nodes.push(
            <span
              key={`${tokenKey}-range`}
              data-source-start={sourceOffset + index}
              data-source-end={sourceOffset + end + marker.value.length}
              data-source-content-start={
                sourceOffset + index + marker.value.length
              }
              data-source-content-end={sourceOffset + end}
              data-source-visible={editing || undefined}
            >
              {editing ? (
                <span
                  className="markdown-delimiter"
                  data-source-start={sourceOffset + index}
                >
                  {marker.value}
                </span>
              ) : null}
              {formatted}
              {editing ? (
                <span
                  className="markdown-delimiter"
                  data-source-start={sourceOffset + end}
                >
                  {marker.value}
                </span>
              ) : null}
            </span>,
          );
        }
        index = end + marker.value.length;
        continue;
      }
    }
    text += source[index++];
  }
  flush();
  return nodes;
}

function markerAt(
  source: string,
  index: number,
):
  | {
      readonly value: string;
      readonly name:
        | "boldItalic"
        | "underlineItalic"
        | "bold"
        | "underline"
        | "strike"
        | "spoiler"
        | "code"
        | "italic";
    }
  | undefined {
  if (source.startsWith("***", index))
    return { value: "***", name: "boldItalic" };
  if (source.startsWith("___", index))
    return { value: "___", name: "underlineItalic" };
  if (source.startsWith("**", index)) return { value: "**", name: "bold" };
  if (source.startsWith("__", index)) return { value: "__", name: "underline" };
  if (source.startsWith("~~", index)) return { value: "~~", name: "strike" };
  if (source.startsWith("||", index)) return { value: "||", name: "spoiler" };
  if (source[index] === "`")
    return { value: source.startsWith("``", index) ? "``" : "`", name: "code" };
  if (source[index] === "*" || source[index] === "_")
    return { value: source[index], name: "italic" };
  return undefined;
}

function mentionNode(
  token: string,
  key: string,
  t: TFunction,
  locale: string,
  mentions: boolean,
  references: readonly ServerReference[],
) {
  const custom = /^<(a?):([\w-]+):(\d+)>$/.exec(token);
  if (custom)
    return (
      <Emoji
        key={key}
        value={{ id: custom[3], name: custom[2], animated: custom[1] === "a" }}
      />
    );
  if (!mentions) return undefined;
  if (
    /^<@\$\d+>$/.test(token) ||
    /^<id:(?:customize|browse|guide|linked-roles(?::\d+)?)>$/.test(token)
  ) {
    return (
      <span className="discord-mention" key={key}>
        {token.slice(1, -1)}
      </span>
    );
  }
  const command = /^<\/([\p{L}\p{N}_ -]+):\d+>$/u.exec(token);
  if (command)
    return (
      <span className="discord-mention" key={key}>
        /{command[1]}
      </span>
    );
  if (/^<@!?\d+>$/.test(token))
    return (
      <span className="discord-mention" key={key}>
        @{token.replace(/\D/g, "")}
      </span>
    );
  if (/^<@&\d+>$/.test(token))
    return (
      <span className="discord-mention" key={key}>
        @
        {references.find(
          (item) => item.kind === "role" && item.id === token.slice(3, -1),
        )?.name ?? token.slice(3, -1)}
      </span>
    );
  if (/^<#\d+>$/.test(token))
    return (
      <span className="discord-channel" key={key}>
        #
        {references.find(
          (item) => item.kind === "channel" && item.id === token.slice(2, -1),
        )?.name ?? token.slice(2, -1)}
      </span>
    );
  const timestamp = /^<t:(-?\d+)(?::([tTdDfFsSR]))?>$/.exec(token);
  if (
    timestamp &&
    !Number.isNaN(new Date(Number(timestamp[1]) * 1000).getTime())
  )
    return (
      <time
        className="discord-timestamp"
        dateTime={new Date(Number(timestamp[1]) * 1_000).toISOString()}
        key={key}
      >
        {formatTimestamp(
          Number(timestamp[1]),
          timestamp[2],
          locale,
          t("editor.invalidTimestamp"),
        )}
      </time>
    );
  return undefined;
}

export function formatTimestamp(
  seconds: number,
  style?: string,
  locale = "en",
  invalidLabel = "Invalid timestamp",
) {
  const date = new Date(seconds * 1_000);
  if (Number.isNaN(date.getTime())) return invalidLabel;
  if (style === "R") {
    const secondsDifference = Math.round((date.getTime() - Date.now()) / 1_000);
    const absolute = Math.abs(secondsDifference);
    const [value, unit] =
      absolute < 60
        ? ([secondsDifference, "second"] as const)
        : absolute < 3_600
          ? ([Math.round(secondsDifference / 60), "minute"] as const)
          : absolute < 86_400
            ? ([Math.round(secondsDifference / 3_600), "hour"] as const)
            : absolute < 2_592_000
              ? ([Math.round(secondsDifference / 86_400), "day"] as const)
              : absolute < 31_536_000
                ? ([
                    Math.round(secondsDifference / 2_592_000),
                    "month",
                  ] as const)
                : ([
                    Math.round(secondsDifference / 31_536_000),
                    "year",
                  ] as const);
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      value,
      unit,
    );
  }
  const options: Intl.DateTimeFormatOptions =
    style === "t"
      ? { timeStyle: "short" }
      : style === "T"
        ? { timeStyle: "medium" }
        : style === "d"
          ? { dateStyle: "short" }
          : style === "D"
            ? { dateStyle: "long" }
            : style === "s"
              ? { dateStyle: "short", timeStyle: "short" }
              : style === "S"
                ? { dateStyle: "short", timeStyle: "medium" }
                : {
                    dateStyle: style === "F" ? "full" : "long",
                    timeStyle: "short",
                  };
  return new Intl.DateTimeFormat(locale, options).format(date);
}
