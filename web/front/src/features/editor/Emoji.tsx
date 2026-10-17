import twemoji from "@discordapp/twemoji";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface PartialEmoji {
  readonly id?: string;
  readonly name?: string;
  readonly animated?: boolean;
}

export function partialEmoji(value: unknown): PartialEmoji | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as PartialEmoji)
    : undefined;
}

export function validEmoji(value: unknown) {
  const emoji = partialEmoji(value);
  return Boolean(
    emoji &&
    (emoji.id != null
      ? typeof emoji.id === "string" && /^\d{1,20}$/.test(emoji.id)
      : typeof emoji.name === "string" && isUnicodeEmoji(emoji.name)) &&
    (emoji.name == null || typeof emoji.name === "string") &&
    (emoji.animated === undefined || typeof emoji.animated === "boolean"),
  );
}

/** Native Unicode properties cover emoji sequences without shipping an emoji catalog. */
function isUnicodeEmoji(value: string) {
  return /^(?:\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?)*|\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3)$/u.test(
    value,
  );
}

export function parseEmoji(raw: string): PartialEmoji | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const custom = /^<(a?):([\w-]+):(\d{1,20})>$/.exec(value);
  if (custom)
    return { id: custom[3], name: custom[2], animated: custom[1] === "a" };
  if (/^\d{1,20}$/.test(value)) return { id: value };
  return { name: value };
}

export function emojiText(value: unknown) {
  const emoji = partialEmoji(value);
  if (!emoji) return "";
  return emoji.id
    ? emoji.name
      ? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
      : emoji.id
    : (emoji.name ?? "");
}

export function supportsUnicodeEmoji(value: string) {
  let supported = false;
  twemoji.replace(value, (match) => {
    supported ||= match === value;
    return match;
  });
  return supported;
}

/** Safe React rendering for Unicode emoji in Discord message content. */
export function UnicodeEmojiText({ value }: Readonly<{ value: string }>) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  twemoji.replace(value, (unicode, ...matches: unknown[]) => {
    // String.replace puts the offset after all regex capture groups.
    const offset = Number(matches.at(-2));
    if (cursor < offset) nodes.push(value.slice(cursor, offset));
    nodes.push(
      <img
        alt={unicode}
        className="discord-emoji unicode-emoji"
        draggable={false}
        key={`emoji-${offset}`}
        referrerPolicy="no-referrer"
        src={`${twemoji.base}svg/${twemoji.convert.toCodePoint(unicode.includes("\u200d") ? unicode : unicode.replace(/\ufe0f/g, ""))}.svg`}
      />,
    );
    cursor = offset + unicode.length;
    return unicode;
  });
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return <>{nodes}</>;
}

export function Emoji({ value }: Readonly<{ value: unknown }>) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState<string>();
  const emoji = partialEmoji(value);
  if (!emoji || !validEmoji(emoji)) return null;
  if (emoji.id) {
    const url = `https://cdn.discordapp.com/emojis/${emoji.id}.webp?size=64${emoji.animated === false ? "" : "&animated=true"}`;
    if (failed === url)
      return (
        <span
          aria-label={t("editor.emojiUnavailable")}
          className="discord-emoji is-unavailable"
          role="img"
          title={emoji.id}
        >
          ?
        </span>
      );
    return (
      <img
        className="discord-emoji"
        alt={emoji.name ? `:${emoji.name}:` : emoji.id}
        onError={() => setFailed(url)}
        referrerPolicy="no-referrer"
        src={url}
      />
    );
  }
  return <UnicodeEmojiText value={emoji.name ?? ""} />;
}
