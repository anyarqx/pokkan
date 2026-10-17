import type { Placeholder } from "../editor/placeholders";

export const componentsV2Flag = 1 << 15;
export const kitNameLimit = 160;
export const settableMessageFlags = (1 << 2) | (1 << 12) | componentsV2Flag;
const webhookMessageFlags = settableMessageFlags;

export type MessageFormat = "legacy" | "componentsV2";
export type KitArgumentType =
  "string" | "integer" | "number" | "boolean" | "snowflake" | "color" | "url";
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export interface DiscordComponent {
  readonly type: number;
  readonly components?: DiscordComponent[];
  readonly accessory?: DiscordComponent;
  readonly [key: string]:
    JsonValue | DiscordComponent | DiscordComponent[] | undefined;
}

export interface DiscordMessagePayload {
  readonly [key: string]: JsonValue | DiscordComponent[] | undefined;
}

export interface KitArgument {
  readonly name: string;
  readonly type: KitArgumentType;
  readonly required: boolean;
  readonly default?: string | null;
}

export interface Kit {
  readonly id: string;
  readonly name: string;
  readonly arguments: readonly KitArgument[];
  readonly message: DiscordMessagePayload;
  readonly placeholders: readonly Placeholder[];
  readonly guild_id?: string | null;
  readonly creator_id?: string;
  readonly revision?: number;
  readonly can_edit?: boolean;
  readonly can_manage_sharing?: boolean;
  readonly sharing_restricted?: boolean;
  readonly sharing_restriction_reason?: string | null;
}

export function messageFormat(message: DiscordMessagePayload): MessageFormat {
  return (numberValue(message.flags) & componentsV2Flag) !== 0
    ? "componentsV2"
    : "legacy";
}

export type ImportErrorCode =
  "kitInvalid" | "kitVersionUnsupported" | "discordObjectRequired";
export class ImportError extends Error {
  constructor(readonly code: ImportErrorCode) {
    super(code);
  }
}

export class WebhookPayloadError extends Error {
  constructor(
    readonly code:
      "unsupportedFields" | "multipartRequired" | "interactiveUnsupported",
    readonly fields: readonly string[] = [],
  ) {
    super(code);
  }
}

/** Normalize supported sendable fields, without retaining response metadata. */
export function toDiscordJson(
  message: DiscordMessagePayload,
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const field of legacyRequestFields) {
    const value = message[field];
    if (value === undefined) continue;
    const serialized = serializeMessageField(field, value);
    if (serialized !== undefined) result[field] = serialized;
  }
  const flags = numberValue(result.flags) & settableMessageFlags;
  if (flags) result.flags = flags;
  else delete result.flags;
  result.allowed_mentions ??= { parse: [] };
  return result;
}

export function toWebhookJson(
  message: DiscordMessagePayload,
): Record<string, JsonValue> {
  const payload = toDiscordJson(message);
  const supported = new Set([
    "content",
    "tts",
    "embeds",
    "allowed_mentions",
    "components",
    "attachments",
    "flags",
    "poll",
  ]);
  const unsupported = Object.keys(payload).filter(
    (field) => !supported.has(field),
  );
  if (unsupported.length)
    throw new WebhookPayloadError("unsupportedFields", unsupported);
  if (
    typeof payload.flags === "number" &&
    (payload.flags & ~webhookMessageFlags) !== 0
  ) {
    throw new WebhookPayloadError("unsupportedFields", ["flags"]);
  }
  if (Array.isArray(payload.attachments) && payload.attachments.length) {
    throw new WebhookPayloadError("multipartRequired");
  }
  if (hasInteractiveWebhookComponent(payload.components)) {
    throw new WebhookPayloadError("interactiveUnsupported");
  }
  return payload;
}

/** The browser transport has narrower limits than Discord's message contract. */
export function webhookCompatibility(
  message: DiscordMessagePayload,
): WebhookPayloadError | undefined {
  try {
    toWebhookJson(message);
    return undefined;
  } catch (error) {
    return error instanceof WebhookPayloadError ? error : undefined;
  }
}

/** Whether normalized Discord JSON contains one of Discord's message-bearing fields. */
export function hasSendableDiscordContent(message: DiscordMessagePayload) {
  const payload = toDiscordJson(message);
  return (
    (typeof payload.content === "string" && payload.content.length > 0) ||
    (Array.isArray(payload.embeds) && payload.embeds.length > 0) ||
    (Array.isArray(payload.sticker_ids) && payload.sticker_ids.length > 0) ||
    (Array.isArray(payload.components) && payload.components.length > 0) ||
    isRecord(payload.poll) ||
    isRecord(payload.shared_client_theme) ||
    (isRecord(payload.message_reference) &&
      payload.message_reference.type === 1)
  );
}

function hasInteractiveWebhookComponent(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasInteractiveWebhookComponent);
  if (!isRecord(value)) return false;
  const type = numberValue(value.type as JsonValue | undefined);
  // Link and premium buttons do not produce component interactions. All selects
  // and custom-id buttons do, and need an application-owned webhook/bot.
  if (
    (type === 2 && numberValue(value.style as JsonValue | undefined) < 5) ||
    [3, 5, 6, 7, 8].includes(type)
  )
    return true;
  return (
    hasInteractiveWebhookComponent(value.components) ||
    hasInteractiveWebhookComponent(value.accessory)
  );
}

export function toPokkanKit(kit: Kit) {
  const { id, name, arguments: args, message, placeholders } = kit;
  return {
    schema: "pokkan-kit",
    version: 1,
    id,
    name,
    arguments: structuredClone(args),
    message: structuredClone(message),
    placeholders: structuredClone(placeholders),
  };
}

export function deserializePokkanKit(value: unknown): Kit {
  if (!isRecord(value) || value.schema !== "pokkan-kit")
    throw new ImportError("kitInvalid");
  if (value.version !== 1) throw new ImportError("kitVersionUnsupported");
  const { schema: _schema, version: _version, ...kit } = value;
  return readKit(kit);
}

export function readKit(value: unknown): Kit {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "name",
      "arguments",
      "message",
      "placeholders",
      "guild_id",
      "creator_id",
      "revision",
      "can_edit",
      "can_manage_sharing",
      "sharing_restricted",
      "sharing_restriction_reason",
    ]) ||
    typeof value.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value.id,
    ) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > kitNameLimit ||
    (value.guild_id !== undefined &&
      value.guild_id !== null &&
      (typeof value.guild_id !== "string" || !/^\d+$/.test(value.guild_id))) ||
    (value.creator_id !== undefined && typeof value.creator_id !== "string") ||
    (value.revision !== undefined &&
      (!Number.isSafeInteger(value.revision) || Number(value.revision) < 0)) ||
    (value.can_edit !== undefined && typeof value.can_edit !== "boolean") ||
    (value.can_manage_sharing !== undefined &&
      typeof value.can_manage_sharing !== "boolean") ||
    (value.sharing_restricted !== undefined && typeof value.sharing_restricted !== "boolean") ||
    (value.sharing_restriction_reason !== undefined && value.sharing_restriction_reason !== null && typeof value.sharing_restriction_reason !== "string") ||
    !isRecord(value.message) ||
    !Array.isArray(value.placeholders) ||
    value.placeholders.length > 256 ||
    !value.placeholders.every(isPlaceholder) ||
    JSON.stringify(value).length > 512_000
  )
    throw new ImportError("kitInvalid");
  return {
    id: value.id,
    name: value.name,
    arguments: deserializeArguments(value.arguments),
    message: normalizePlaceholders(
      value.message as DiscordMessagePayload,
    ) as DiscordMessagePayload,
    placeholders: structuredClone(value.placeholders),
    ...(value.guild_id !== undefined
      ? { guild_id: value.guild_id as string | null }
      : {}),
    ...(value.creator_id !== undefined
      ? { creator_id: value.creator_id as string }
      : {}),
    ...(value.revision !== undefined
      ? { revision: value.revision as number }
      : {}),
    ...(value.can_edit !== undefined
      ? { can_edit: value.can_edit as boolean }
      : {}),
    ...(value.can_manage_sharing !== undefined
      ? { can_manage_sharing: value.can_manage_sharing as boolean }
      : {}),
    ...(value.sharing_restricted !== undefined ? { sharing_restricted: value.sharing_restricted as boolean, sharing_restriction_reason: value.sharing_restriction_reason as string | null } : {}),
  };
}

// Normalize older Kit text at the persistence/import boundary. The editor only
// writes single-brace tokens; a subsequent save/export retains that spelling.
function normalizePlaceholders(value: JsonValue): JsonValue {
  if (typeof value === "string")
    return value.replace(/\{\{([a-zA-Z0-9._-]+)\}\}/g, "{$1}");
  if (Array.isArray(value)) return value.map(normalizePlaceholders);
  if (
    isRecord(value) &&
    typeof value.type === "number" &&
    !sendableComponent(value)
  )
    return structuredClone(value) as JsonValue;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        item === undefined ? item : normalizePlaceholders(item),
      ]),
    );
  return value;
}

export function deserializeDiscordJson(value: unknown): DiscordMessagePayload {
  if (!isRecord(value)) throw new ImportError("discordObjectRequired");
  const message = toDiscordJson(value as DiscordMessagePayload);
  if (Array.isArray(value.components))
    message.components = value.components
      .map(normalizeImportedComponent)
      .filter(defined);
  if (messageFormat(message) === "componentsV2") {
    for (const field of [
      "content",
      "embeds",
      "poll",
      "sticker_ids",
      "shared_client_theme",
    ])
      delete message[field];
  }
  if (Array.isArray(value.attachments))
    message.attachments = value.attachments.filter(isRecord).map((item) => ({
      ...(serializeAttachment(item) as Record<string, JsonValue>),
      ...pick(item, [
        "url",
        "proxy_url",
        "content_type",
        "size",
        "width",
        "height",
      ]),
    }));
  return message;
}

/** Creates a Discord message shape from caller-provided content; it has no UI locale knowledge. */
export function messageWithContent(
  format: MessageFormat,
  content: string,
): DiscordMessagePayload {
  return format === "legacy"
    ? { content, allowed_mentions: { parse: [] } }
    : {
        flags: componentsV2Flag,
        components: [{ type: 10, content }],
        allowed_mentions: { parse: [] },
      };
}

function deserializeArguments(value: unknown): KitArgument[] {
  if (!Array.isArray(value) || value.length > 32)
    throw new ImportError("kitInvalid");
  const names = new Set<string>();
  return value.map((item) => {
    if (
      !isRecord(item) ||
      !hasOnlyKeys(item, ["name", "type", "required", "default"]) ||
      typeof item.name !== "string" ||
      !/^[a-z][a-z0-9_]{0,31}$/.test(item.name) ||
      names.has(item.name) ||
      ![
        "string",
        "integer",
        "number",
        "boolean",
        "snowflake",
        "color",
        "url",
      ].includes(String(item.type)) ||
      typeof item.required !== "boolean" ||
      (item.required && item.default != null) ||
      (item.default !== undefined &&
        item.default !== null &&
        typeof item.default !== "string")
    ) {
      throw new ImportError("kitInvalid");
    }
    names.add(item.name);
    return {
      name: item.name,
      type: item.type as KitArgumentType,
      required: item.required,
      ...(item.default !== undefined
        ? { default: item.default as string | null }
        : {}),
    };
  });
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key));
}

function media(value: unknown): JsonValue | undefined {
  return isRecord(value) ? pick(value, ["url"]) : undefined;
}

const legacyRequestFields = [
  "content",
  "tts",
  "embeds",
  "allowed_mentions",
  "components",
  "sticker_ids",
  "attachments",
  "poll",
  "message_reference",
  "flags",
  "nonce",
  "enforce_nonce",
  "shared_client_theme",
] as const;

function serializeMessageField(
  field: string,
  value: unknown,
): JsonValue | undefined {
  switch (field) {
    case "components":
      return Array.isArray(value) ? sendableComponents(value) : undefined;
    case "embeds":
      return Array.isArray(value)
        ? value.map(serializeEmbed).filter(defined)
        : undefined;
    case "attachments":
      return Array.isArray(value)
        ? value.map(serializeAttachment).filter(defined)
        : undefined;
    case "allowed_mentions":
      return serializeAllowedMentions(value);
    case "poll":
      return serializePoll(value);
    case "message_reference":
      return serializeMessageReference(value);
    case "sticker_ids":
      return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : undefined;
    case "shared_client_theme":
      return isRecord(value)
        ? pick(value, ["colors", "gradient_angle", "base_mix", "base_theme"])
        : undefined;
    case "content":
    case "nonce":
      return typeof value === "string" || typeof value === "number"
        ? value
        : undefined;
    case "tts":
    case "enforce_nonce":
      return typeof value === "boolean" ? value : undefined;
    case "flags":
      return typeof value === "number" ? value : undefined;
    default:
      return undefined;
  }
}

/** Converts one known component into request JSON. Unknown components intentionally do not cross this boundary. */
export function sendableComponent(
  value: unknown,
): Record<string, JsonValue> | undefined {
  const serialized = serializeComponent(value);
  return isRecord(serialized)
    ? (serialized as Record<string, JsonValue>)
    : undefined;
}

/** Converts an array into exactly the component objects Discord JSON export will contain. */
export function sendableComponents(values: readonly unknown[]) {
  return values.map(sendableComponent).filter(defined);
}

function serializeComponent(value: unknown): JsonValue | undefined {
  if (!isRecord(value) || typeof value.type !== "number") return undefined;
  const identity = pick(value, ["type", "id"]);
  switch (value.type) {
    case 1:
      return merge(identity, {
        components: Array.isArray(value.components)
          ? value.components.map(serializeComponent).filter(defined)
          : [],
      });
    case 2:
      return serializeButton(value, identity);
    case 3:
      return merge(
        identity,
        pick(value, [
          "custom_id",
          "placeholder",
          "min_values",
          "max_values",
          "disabled",
        ]),
        {
          options: Array.isArray(value.options)
            ? value.options.map(serializeSelectOption).filter(defined)
            : [],
        },
      );
    case 5:
    case 6:
    case 7:
    case 8:
      return merge(
        identity,
        pick(value, [
          "custom_id",
          "placeholder",
          "min_values",
          "max_values",
          "disabled",
          "channel_types",
        ]),
        {
          default_values: Array.isArray(value.default_values)
            ? value.default_values
                .map((item) =>
                  isRecord(item) ? pick(item, ["id", "type"]) : undefined,
                )
                .filter(defined)
            : undefined,
        },
      );
    case 9:
      return merge(identity, {
        components: Array.isArray(value.components)
          ? value.components.map(serializeComponent).filter(defined)
          : [],
        accessory: serializeComponent(value.accessory),
      });
    case 10:
      return merge(identity, pick(value, ["content"]));
    case 11:
      return merge(identity, pick(value, ["description", "spoiler"]), {
        media: media(value.media),
      });
    case 12:
      return merge(identity, {
        items: Array.isArray(value.items)
          ? value.items
              .map((item) =>
                isRecord(item)
                  ? merge(pick(item, ["description", "spoiler"]), {
                      media: media(item.media),
                    })
                  : undefined,
              )
              .filter(defined)
          : [],
      });
    case 13:
      return merge(identity, pick(value, ["spoiler"]), {
        file: media(value.file),
      });
    case 14:
      return merge(identity, pick(value, ["divider", "spacing"]));
    case 17:
      return merge(identity, pick(value, ["accent_color", "spoiler"]), {
        components: Array.isArray(value.components)
          ? value.components.map(serializeComponent).filter(defined)
          : [],
      });
    default:
      return undefined;
  }
}

/**
 * Discord JSON import keeps unknown component objects inside the Kit so a later
 * Pokkan Kit export does not erase them. Known parents are still normalized,
 * but their unknown descendants remain in the preserved editor tree.
 */
function normalizeImportedComponent(value: unknown): JsonValue | undefined {
  if (!isRecord(value) || typeof value.type !== "number") return undefined;
  const normalized = sendableComponent(value);
  if (!normalized) return structuredClone(value) as JsonValue;
  if (Array.isArray(value.components))
    normalized.components = value.components
      .map(normalizeImportedComponent)
      .filter(defined);
  if (value.type === 9 && value.accessory !== undefined) {
    const accessory = normalizeImportedComponent(value.accessory);
    if (accessory !== undefined) normalized.accessory = accessory;
  }
  return normalized;
}

function serializeButton(
  value: Record<string, unknown>,
  identity: Record<string, JsonValue>,
) {
  const style = typeof value.style === "number" ? value.style : 1;
  if (style === 5)
    return merge(
      identity,
      pick(value, ["style", "label", "emoji", "url", "disabled"]),
    );
  if (style === 6)
    return merge(identity, pick(value, ["style", "sku_id", "disabled"]));
  return merge(
    identity,
    pick(value, ["style", "label", "emoji", "custom_id", "disabled"]),
  );
}

function serializeSelectOption(value: unknown): JsonValue | undefined {
  return isRecord(value)
    ? pick(value, ["label", "value", "description", "emoji", "default"])
    : undefined;
}

function serializeEmbed(value: unknown): JsonValue | undefined {
  if (!isRecord(value)) return undefined;
  return merge(
    pick(value, ["title", "description", "url", "timestamp", "color"]),
    {
      footer: isRecord(value.footer)
        ? pick(value.footer, ["text", "icon_url"])
        : undefined,
    },
    { image: isRecord(value.image) ? pick(value.image, ["url"]) : undefined },
    {
      thumbnail: isRecord(value.thumbnail)
        ? pick(value.thumbnail, ["url"])
        : undefined,
    },
    {
      author: isRecord(value.author)
        ? pick(value.author, ["name", "url", "icon_url"])
        : undefined,
    },
    {
      fields: Array.isArray(value.fields)
        ? value.fields
            .map((field) =>
              isRecord(field)
                ? pick(field, ["name", "value", "inline"])
                : undefined,
            )
            .filter(defined)
        : undefined,
    },
  );
}

function serializeAttachment(value: unknown): JsonValue | undefined {
  return isRecord(value)
    ? pick(value, [
        "id",
        "filename",
        "title",
        "description",
        "duration_secs",
        "waveform",
        "is_spoiler",
      ])
    : undefined;
}

function serializeAllowedMentions(value: unknown): JsonValue | undefined {
  return isRecord(value)
    ? pick(value, ["parse", "users", "roles", "replied_user"])
    : undefined;
}

function serializePoll(value: unknown): JsonValue | undefined {
  if (!isRecord(value)) return undefined;
  return merge(
    {
      question: isRecord(value.question)
        ? pick(value.question, ["text"])
        : undefined,
    },
    {
      answers: Array.isArray(value.answers)
        ? value.answers
            .map((answer) => {
              if (!isRecord(answer) || !isRecord(answer.poll_media))
                return undefined;
              const emoji = answer.poll_media.emoji;
              return {
                poll_media: merge(pick(answer.poll_media, ["text"]), {
                  emoji: isRecord(emoji)
                    ? pick(emoji, [emoji.id != null ? "id" : "name"])
                    : undefined,
                }),
              };
            })
            .filter(defined)
        : undefined,
    },
    pick(value, ["duration", "allow_multiselect", "layout_type"]),
  );
}

function serializeMessageReference(value: unknown): JsonValue | undefined {
  return isRecord(value)
    ? pick(value, [
        "type",
        "message_id",
        "channel_id",
        "guild_id",
        "fail_if_not_exists",
      ])
    : undefined;
}

function pick(
  value: Record<string, unknown>,
  fields: readonly string[],
): Record<string, JsonValue> {
  return Object.fromEntries(
    fields.flatMap((field) =>
      value[field] === undefined
        ? []
        : [[field, structuredClone(value[field]) as JsonValue]],
    ),
  ) as Record<string, JsonValue>;
}

function merge(...values: readonly Record<string, JsonValue | undefined>[]) {
  return Object.fromEntries(
    values.flatMap((value) =>
      Object.entries(value).filter(([, item]) => item !== undefined),
    ),
  ) as Record<string, JsonValue>;
}

function defined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function numberValue(value: JsonValue | undefined) {
  return typeof value === "number" ? value : 0;
}

function isPlaceholder(value: unknown): value is Placeholder {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "key",
      "label",
      "description",
      "category",
      "type",
      "example",
    ]) &&
    Object.values(value).every(
      (item) => typeof item === "string" && item.length <= 4_000,
    ) &&
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    typeof value.description === "string" &&
    typeof value.category === "string" &&
    ["string", "number", "boolean", "url", "color", "snowflake"].includes(
      String(value.type),
    ) &&
    typeof value.example === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
