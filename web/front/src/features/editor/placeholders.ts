export type PlaceholderType =
  "string" | "number" | "boolean" | "url" | "color" | "snowflake";

export interface Placeholder {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly category: string;
  readonly type: PlaceholderType;
  readonly example: string;
  readonly previewValue?: string;
}

const builtIns = [
  ["user.name", "userName", "user", "string", "ExampleUser"],
  ["user.id", "userId", "user", "snowflake", "123456789012345678"],
  ["user.mention", "userMention", "user", "string", "<@123456789012345678>"],
  [
    "user.avatar",
    "userAvatar",
    "user",
    "url",
    "https://cdn.discordapp.com/avatars/...",
  ],
  ["guild.name", "guildName", "guild", "string", "My Server"],
  ["guild.id", "guildId", "guild", "snowflake", "123456789012345678"],
  ["channel.name", "channelName", "channel", "string", "general"],
  ["channel.id", "channelId", "channel", "snowflake", "123456789012345678"],
  ["message.id", "messageId", "message", "snowflake", "123456789012345678"],
  ["bot.name", "botName", "bot", "string", "Pokkan"],
] as const;

export function builtInPlaceholders(): readonly Placeholder[] {
  return builtIns.map(([key, name, category, type, example]) => ({
    key,
    label: i18n.t(`editor.placeholderBuiltIns.${name}.label`),
    description: i18n.t(`editor.placeholderBuiltIns.${name}.description`),
    category: i18n.t(`editor.placeholderCategories.${category}`),
    type,
    example,
  }));
}

export function placeholderCatalog(
  custom: readonly Placeholder[] | undefined,
  guild?: { readonly id: string; readonly name: string },
) {
  const byKey = new Map(builtInPlaceholders().map((item) => [item.key, item]));
  if (guild) {
    const name = byKey.get("guild.name");
    const id = byKey.get("guild.id");
    if (name) byKey.set("guild.name", { ...name, previewValue: guild.name });
    if (id) byKey.set("guild.id", { ...id, previewValue: guild.id });
  }
  custom?.forEach((item) => byKey.set(item.key, { ...item, previewValue: item.example }));
  return [...byKey.values()];
}

export function matchingPlaceholders(
  items: readonly Placeholder[],
  query: string,
) {
  const needle = query.toLocaleLowerCase().replace(/\s+/g, "");
  if (!needle) return items;
  return items.filter(
    (item) =>
      fuzzy(item.key.toLocaleLowerCase(), needle) ||
      fuzzy(item.label.toLocaleLowerCase(), needle),
  );
}

function fuzzy(value: string, query: string) {
  let cursor = 0;
  for (const character of value) if (character === query[cursor]) cursor += 1;
  return cursor === query.length;
}
import i18n from "../../app/i18n";
