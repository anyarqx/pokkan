import { lazy, Suspense, useContext, type ReactNode } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { Placeholder } from "./placeholders";
import { Emoji, UnicodeEmojiText } from "./Emoji";
import { isSafeLink } from "../../shared/urls";
import {
  ServerReferencesContext,
  type ServerReference,
} from "./serverReferences";

const HighlightedCode = lazy(() => import("./HighlightedCode"));

export type MarkdownContext = "message" | "embed" | "inline";

export interface DiscordMarkdownProps {
  readonly source: string;
  readonly placeholders?: readonly Placeholder[];
  readonly previewPlaceholders?: boolean;
  readonly context?: MarkdownContext;
  readonly onToggleSpoiler?: (key: string) => void;
  readonly revealedSpoilers?: ReadonlySet<string>;
  readonly readOnly?: boolean;
}

/**
 * A deliberately small, source-preserving Discord formatter. It produces React
 * nodes (never HTML strings), so source text cannot execute in the preview.
 */
export function DiscordMarkdown(props: DiscordMarkdownProps) {
  const { i18n, t } = useTranslation();
  const references = useContext(ServerReferencesContext);
  const placeholders = new Map(
    (props.placeholders ?? []).map((item) => [item.key, item]),
  );
  const inline = (source: string, key: string) =>
    inlineNodes(
      source,
      key,
      placeholders,
      Boolean(props.previewPlaceholders),
      props.onToggleSpoiler,
      props.revealedSpoilers,
      Boolean(props.readOnly),
      t,
      i18n.resolvedLanguage ?? i18n.language,
      props.context !== "inline",
      references,
    );
  if (!props.context || props.context === "inline")
    return (
      <span className="discord-markdown">{inline(props.source, "inline")}</span>
    );
  return (
    <div className="discord-markdown">
      {blockNodes(props.source, inline, props.context === "message")}
    </div>
  );
}

function blockNodes(
  source: string,
  inline: (source: string, key: string) => ReactNode[],
  full: boolean,
  prefix = "block",
): ReactNode[] {
  const rows = source.replace(/\r/g, "").split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;
  while (index < rows.length) {
    const row = rows[index];
    const key = `${prefix}-${index}`;
    const fence = /^```(.*)$/.exec(row);
    if (fence) {
      const close = fence[1].indexOf("```");
      if (close !== -1) {
        nodes.push(
          <pre className="discord-code-block" key={key}>
            <code>
              <UnicodeEmojiText value={fence[1].slice(0, close)} />
            </code>
          </pre>,
        );
        const tail = fence[1].slice(close + 3);
        if (tail) rows.splice(index + 1, 0, tail);
        index += 1;
        continue;
      }
      const language = /^[\w+#.-]+$/.test(fence[1]) ? fence[1] : undefined;
      const body: string[] = language || !fence[1] ? [] : [fence[1]];
      index += 1;
      while (index < rows.length && !rows[index].includes("```"))
        body.push(rows[index++]);
      if (index < rows.length) {
        const [last, ...tail] = rows[index].split("```");
        if (last) body.push(last);
        if (tail.join("```")) rows.splice(index + 1, 0, tail.join("```"));
        index += 1;
      }
      nodes.push(
        <pre className="discord-code-block" key={key}>
          <Suspense fallback={<code>{body.join("\n")}</code>}>
            <HighlightedCode language={language} source={body.join("\n")} />
          </Suspense>
        </pre>,
      );
      continue;
    }
    const heading = full && /^(#{1,3}) +(.+)$/.exec(row);
    if (heading) {
      const Heading = `h${heading[1].length}` as "h1" | "h2" | "h3";
      nodes.push(<Heading key={key}>{inline(heading[2], key)}</Heading>);
      index += 1;
      continue;
    }
    if (full && row.startsWith("-# ")) {
      nodes.push(
        <p className="discord-subtext" key={key}>
          {inline(row.slice(3), key)}
        </p>,
      );
      index += 1;
      continue;
    }
    if (row.startsWith(">>> ")) {
      nodes.push(
        <blockquote key={key}>
          {blockNodes(
            [row.slice(4), ...rows.slice(index + 1)].join("\n"),
            inline,
            full,
            key,
          )}
        </blockquote>,
      );
      break;
    }
    if (row.startsWith("> ")) {
      const quote: string[] = [];
      while (index < rows.length && rows[index].startsWith("> "))
        quote.push(rows[index++].slice(2));
      nodes.push(
        <blockquote key={key}>
          {blockNodes(quote.join("\n"), inline, full, key)}
        </blockquote>,
      );
      continue;
    }
    const list = full && /^( *)([-*]|\d+\.) +(.+)$/.exec(row);
    if (list) {
      const indent = list[1].length;
      const ordered = /\d/.test(list[2]);
      const items: ReactNode[] = [];
      while (index < rows.length) {
        const item = /^( *)([-*]|\d+\.) +(.+)$/.exec(rows[index]);
        if (!item || item[1].length !== indent) break;
        const itemKey = `${key}-${index++}`;
        const content = [item[3]];
        while (
          index < rows.length &&
          rows[index].startsWith(" ".repeat(indent + 2))
        )
          content.push(rows[index++].slice(indent + 2));
        items.push(
          <li key={itemKey}>
            {blockNodes(content.join("\n"), inline, full, itemKey)}
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
    nodes.push(<p key={key}>{row ? inline(row, key) : <br />}</p>);
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
  revealed: DiscordMarkdownProps["revealedSpoilers"],
  readOnly: boolean,
  t: TFunction,
  locale: string,
  links: boolean,
  references: readonly ServerReference[],
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let text = "";
  let index = 0;
  const flush = () => {
    if (!text) return;
    nodes.push(<UnicodeEmojiText key={`${key}-text-${index}`} value={text} />);
    text = "";
  };
  const nested = (content: string, suffix: string) =>
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
    );

  while (index < source.length) {
    if (
      source[index] === "\\" &&
      /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(source[index + 1] ?? "")
    ) {
      text += source[index + 1];
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
        nodes.push(rendered);
        index = mention + 1;
        continue;
      }
    }
    const broadcast = links && /^@(everyone|here)\b/.exec(source.slice(index));
    if (broadcast) {
      flush();
      nodes.push(
        <span className="discord-mention" key={`${key}-broadcast-${index}`}>
          {broadcast[0]}
        </span>,
      );
      index += broadcast[0].length;
      continue;
    }
    if (
      links &&
      source[index] === "[" &&
      source.indexOf("](", index + 1) > index
    ) {
      const closeLabel = source.indexOf("](", index + 1);
      let closeUrl = closeLabel + 2;
      let depth = 1;
      for (; closeUrl < source.length; closeUrl += 1) {
        if (source[closeUrl] === "\\") {
          closeUrl += 1;
          continue;
        }
        if (source[closeUrl] === "(") depth += 1;
        if (source[closeUrl] === ")" && --depth === 0) break;
      }
      if (closeUrl > closeLabel && closeUrl < source.length) {
        const label = source.slice(index + 1, closeLabel);
        const url = source
          .slice(closeLabel + 2, closeUrl)
          .replace(/^<(.*)>$/, "$1");
        flush();
        nodes.push(
          <a
            className="discord-markdown-link"
            href={readOnly && isSafeLink(url) ? url : undefined}
            key={`${key}-link-${index}`}
            rel="noreferrer"
            title={url}
          >
            {nested(label, `link-${index}`)}
          </a>,
        );
        index = closeUrl + 1;
        continue;
      }
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
        if (source[end - 1] !== "\\") {
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
        if (marker.name === "code")
          nodes.push(
            <code className="discord-inline-code" key={tokenKey}>
              {content}
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
              <span aria-hidden={hidden}>{nested(content, tokenKey)}</span>
            </span>,
          );
        } else if (marker.name === "boldItalic")
          nodes.push(
            <strong key={tokenKey}>
              <em>{nested(content, tokenKey)}</em>
            </strong>,
          );
        else if (marker.name === "underlineItalic")
          nodes.push(
            <u key={tokenKey}>
              <em>{nested(content, tokenKey)}</em>
            </u>,
          );
        else if (marker.name === "bold")
          nodes.push(
            <strong key={tokenKey}>{nested(content, tokenKey)}</strong>,
          );
        else if (marker.name === "underline")
          nodes.push(<u key={tokenKey}>{nested(content, tokenKey)}</u>);
        else if (marker.name === "strike")
          nodes.push(<s key={tokenKey}>{nested(content, tokenKey)}</s>);
        else nodes.push(<em key={tokenKey}>{nested(content, tokenKey)}</em>);
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
