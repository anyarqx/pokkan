import { emojiText, validEmoji, type PartialEmoji } from "./Emoji";
import { maskedLinkAt } from "./markdownLinks";

export function uniqueCustomEmoji(
  name: string,
  items: readonly PartialEmoji[],
) {
  return customEmojiNames(items).get(name);
}

function customEmojiNames(items: readonly PartialEmoji[]) {
  const names = new Map<string, PartialEmoji | undefined>();
  for (const item of items) {
    if (!item.id || !item.name || !validEmoji(item)) continue;
    if (!names.has(item.name) || names.get(item.name)?.id === item.id)
      names.set(item.name, item);
    else names.set(item.name, undefined);
  }
  return names;
}

/** Preserve imported identities independently of the current server catalog. */
export function emojiBindings(source: string) {
  const bindings = new Map<string, PartialEmoji>();
  const ambiguous = new Set<string>();
  outsideCode(source, (token) => {
    const match = /^<(a?):([\w-]+):(\d{1,20})>$/.exec(token);
    if (!match || ambiguous.has(match[2])) return token;
    const previous = bindings.get(match[2]);
    if (previous && previous.id !== match[3]) {
      bindings.delete(match[2]);
      ambiguous.add(match[2]);
    } else
      bindings.set(match[2], {
        name: match[2],
        id: match[3],
        animated: match[1] === "a",
      });
    return token;
  });
  return bindings;
}

export function resolveEmojiNames(
  source: string,
  bindings: ReadonlyMap<string, PartialEmoji>,
  server: readonly PartialEmoji[],
) {
  if (!source.includes(":")) return source;
  const names = customEmojiNames(server);
  return outsideCode(source, (token) => {
    const name = /^:([\w-]+):$/.exec(token)?.[1];
    if (!name) return token;
    const emoji = bindings.get(name) ?? names.get(name);
    return emoji ? emojiText(emoji) : token;
  });
}

function outsideCode(source: string, replace: (token: string) => string) {
  let fence = 0;
  const tokens =
    /\\[\s\S]|`+|\[|[a-z][a-z0-9+.-]*:\/\/[^\s<>`\\]+|<(?:a?):[\w-]+:\d+>|:[\w-]+:/gi;
  let result = "";
  let cursor = 0;
  for (const match of source.matchAll(tokens)) {
    const offset = match.index;
    if (offset < cursor) continue;
    const token = match[0];
    result += source.slice(cursor, offset);
    cursor = offset + token.length;
    if (token[0] === "`") {
      if (!fence) fence = token.length;
      else if (fence === token.length) fence = 0;
    } else if (!fence && token === "[") {
      const link = maskedLinkAt(source, offset);
      if (link) {
        result +=
          source.slice(offset, link.labelStart) +
          outsideCode(link.label, replace) +
          source.slice(link.labelEnd, link.end);
        cursor = link.end;
        continue;
      }
    }
    result +=
      !fence && (token[0] === ":" || /^<a?:/.test(token))
        ? replace(token)
        : token;
  }
  return result + source.slice(cursor);
}
