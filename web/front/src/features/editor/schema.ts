import {
  hasSendableDiscordContent,
  messageFormat,
  sendableComponent,
  sendableComponents,
} from "../kits/domain";
import { validEmoji } from "./Emoji";
import i18n from "../../app/i18n";
import {
  settableMessageFlags,
  type DiscordComponent,
  type MessageFormat,
  type DiscordMessagePayload,
} from "../kits/domain";

export type ComponentPath = readonly (string | number)[];
export type ComponentKind =
  | "actionRow"
  | "button"
  | "stringSelect"
  | "userSelect"
  | "roleSelect"
  | "mentionableSelect"
  | "channelSelect"
  | "section"
  | "textDisplay"
  | "thumbnail"
  | "mediaGallery"
  | "file"
  | "separator"
  | "container"
  | "unknown";

export type KnownComponentKind = Exclude<ComponentKind, "unknown">;

export type ParentKind = ComponentKind | "root" | "sectionAccessory";

export interface ComponentDefinition {
  readonly kind: KnownComponentKind;
  readonly type: number;
  readonly label: string;
  readonly modes: readonly MessageFormat[];
}

export interface EditorIssue {
  readonly path: ComponentPath;
  readonly code: string;
  readonly message: string;
  readonly level: "error" | "warning";
}

const definitions: readonly ComponentDefinition[] = [
  { kind: "container", type: 17, label: "Container", modes: ["componentsV2"] },
  { kind: "section", type: 9, label: "Section", modes: ["componentsV2"] },
  {
    kind: "textDisplay",
    type: 10,
    label: "Text Display",
    modes: ["componentsV2"],
  },
  { kind: "thumbnail", type: 11, label: "Thumbnail", modes: ["componentsV2"] },
  {
    kind: "mediaGallery",
    type: 12,
    label: "Media Gallery",
    modes: ["componentsV2"],
  },
  { kind: "file", type: 13, label: "File", modes: ["componentsV2"] },
  { kind: "separator", type: 14, label: "Separator", modes: ["componentsV2"] },
  {
    kind: "actionRow",
    type: 1,
    label: "Action Row",
    modes: ["legacy", "componentsV2"],
  },
  {
    kind: "button",
    type: 2,
    label: "Button",
    modes: ["legacy", "componentsV2"],
  },
  {
    kind: "stringSelect",
    type: 3,
    label: "String Select",
    modes: ["legacy", "componentsV2"],
  },
  {
    kind: "userSelect",
    type: 5,
    label: "User Select",
    modes: ["legacy", "componentsV2"],
  },
  {
    kind: "roleSelect",
    type: 6,
    label: "Role Select",
    modes: ["legacy", "componentsV2"],
  },
  {
    kind: "mentionableSelect",
    type: 7,
    label: "Mentionable Select",
    modes: ["legacy", "componentsV2"],
  },
  {
    kind: "channelSelect",
    type: 8,
    label: "Channel Select",
    modes: ["legacy", "componentsV2"],
  },
];

const byType = new Map(
  definitions.map((definition) => [definition.type, definition]),
);
const byKind = new Map(
  definitions.map((definition) => [definition.kind, definition]),
);
const selectKinds = new Set<KnownComponentKind>([
  "stringSelect",
  "userSelect",
  "roleSelect",
  "mentionableSelect",
  "channelSelect",
]);
const rowKinds = new Set<KnownComponentKind>(["button", ...selectKinds]);
const v2RootKinds = new Set<KnownComponentKind>([
  "container",
  "section",
  "textDisplay",
  "mediaGallery",
  "file",
  "separator",
  "actionRow",
]);
const v2ContainerKinds = new Set<KnownComponentKind>([
  "section",
  "textDisplay",
  "mediaGallery",
  "file",
  "separator",
  "actionRow",
]);

export function componentKind(value: unknown): ComponentKind {
  if (!isRecord(value) || typeof value.type !== "number") return "unknown";
  return byType.get(value.type)?.kind ?? "unknown";
}

export function componentDefinition(kind: ComponentKind) {
  return byKind.get(kind as Exclude<ComponentKind, "unknown">);
}

export function componentLabel(value: unknown) {
  const kind = componentKind(value);
  const definition = componentDefinition(kind);
  return definition
    ? i18n.t(`editor.components.${kind}`, { defaultValue: definition.label })
    : i18n.t("editor.unsupportedComponent");
}

export function allowedChildren(
  mode: MessageFormat,
  parent: ParentKind,
  children: readonly unknown[],
): KnownComponentKind[] {
  if (parent === "root")
    return mode === "legacy"
      ? children.length < 5
        ? ["actionRow"]
        : []
      : [...v2RootKinds];
  if (parent === "sectionAccessory") return ["thumbnail", "button"];
  if (parent === "container") return [...v2ContainerKinds];
  if (parent === "section") return children.length < 3 ? ["textDisplay"] : [];
  if (parent !== "actionRow") return [];

  const existing = children.map(componentKind);
  if (existing.length >= 5) return [];
  if (existing.some((kind) => kind !== "unknown" && selectKinds.has(kind)))
    return [];
  if (existing.some((kind) => kind === "button")) return ["button"];
  return [...rowKinds];
}

export function canAcceptChild(
  mode: MessageFormat,
  parent: ParentKind,
  children: readonly unknown[],
  kind: KnownComponentKind,
) {
  return allowedChildren(mode, parent, children).includes(kind);
}

export function createComponent(kind: KnownComponentKind): DiscordComponent {
  switch (kind) {
    case "container":
      return { type: 17, components: [] };
    case "section":
      return {
        type: 9,
        components: [{ type: 10, content: "" }],
      };
    case "textDisplay":
      return { type: 10, content: "" };
    case "thumbnail":
      return { type: 11, media: { url: "" } };
    case "mediaGallery":
      return { type: 12, items: [{ media: { url: "" } }] };
    case "file":
      return { type: 13, file: { url: "" } };
    case "separator":
      return { type: 14, divider: true, spacing: 1 };
    case "actionRow":
      return { type: 1, components: [] };
    case "button":
      return {
        type: 2,
        style: 1,
        label: i18n.t("app.defaultButtonLabel"),
        custom_id: uniqueId("button"),
      };
    case "stringSelect":
      return {
        type: 3,
        custom_id: uniqueId("select"),
        placeholder: i18n.t("editor.selectOption"),
        options: [{ label: i18n.t("editor.option"), value: "option" }],
      };
    case "userSelect":
    case "roleSelect":
    case "mentionableSelect":
    case "channelSelect":
      return {
        type: componentDefinition(kind)?.type ?? 3,
        custom_id: uniqueId("select"),
        placeholder: i18n.t("editor.selectOption"),
      };
  }
  throw new Error(`Unsupported component kind: ${kind}`);
}

export function validateMessage(
  document: DiscordMessagePayload,
): EditorIssue[] {
  const issues: EditorIssue[] = [];
  const payload = document as Record<string, unknown>;
  const components = asArray(payload.components);
  const customIds = new Set<string>();
  const componentIds = new Set<number>();
  validateAllowedMentions(payload.allowed_mentions, issues);
  validateRequestFields(payload, issues);

  if (messageFormat(document) === "componentsV2") {
    ["content", "embeds", "sticker_ids", "poll", "shared_client_theme"].forEach(
      (field) => {
        if (payload[field] !== undefined)
          addIssue(
            issues,
            "v2FieldForbidden",
            [field],
            `${field} is not valid in Components V2 messages.`,
            "error",
            { field },
          );
      },
    );
    const componentCount = sendableComponentCount(components);
    if (componentCount > 40)
      addIssue(
        issues,
        "v2ComponentLimit",
        ["components"],
        "Components V2 allows at most 40 components.",
      );
    if (componentCount + minimumCompletionReserve(document) > 40)
      addIssue(
        issues,
        "v2CompletionReserve",
        ["components"],
        "This message no longer has room to complete its required component structure.",
      );
  } else if (components.length > 5) {
    addIssue(
      issues,
      "legacyRowLimit",
      ["components"],
      "Legacy messages allow at most 5 action rows.",
    );
    validateLegacyMessage(payload, issues);
  } else {
    validateLegacyMessage(payload, issues);
  }

  walkComponents(components, ["components"], (component, path, parent) => {
    const kind = componentKind(component);
    if (kind === "unknown") {
      addIssue(
        issues,
        "unsupportedComponent",
        path,
        "Unsupported component kept in the Kit and omitted from Discord JSON.",
        "warning",
      );
      return;
    }

    const children = asArray(component.components);
    const sendableChildren = sendableComponents(children);
    if (!canAcceptChild(messageFormat(document), parent, [], kind)) {
      addIssue(
        issues,
        "invalidComponentParent",
        path,
        `${componentLabel(component)} is not valid inside ${parent}.`,
        "error",
        { component: componentLabel(component), parent: parentLabel(parent) },
      );
    }
    if (kind === "actionRow") {
      if (sendableChildren.length === 0)
        addIssue(
          issues,
          "actionRowChildrenMin",
          path,
          "An Action Row needs at least one sendable child.",
        );
      if (sendableChildren.length > 5)
        addIssue(
          issues,
          "actionRowChildrenMax",
          path,
          "An Action Row allows at most 5 children.",
        );
      const childKinds = sendableChildren.map(componentKind);
      if (
        childKinds.some(
          (child) => child !== "unknown" && selectKinds.has(child),
        ) &&
        sendableChildren.length !== 1
      )
        addIssue(
          issues,
          "actionRowComposition",
          path,
          "An Action Row can contain one select or up to five buttons.",
        );
    }
    if (kind === "section") {
      const textDisplays = sendableChildren.filter(
        (child) => componentKind(child) === "textDisplay",
      );
      if (textDisplays.length < 1)
        addIssue(
          issues,
          "sectionChildrenMin",
          path,
          "A Section needs at least one sendable Text Display.",
        );
      if (textDisplays.length > 3)
        addIssue(
          issues,
          "sectionChildrenMax",
          path,
          "A Section allows at most 3 Text Displays.",
        );
    }
    if (kind === "textDisplay" && !stringValue(component.content).trim())
      addIssue(
        issues,
        "textDisplayEmpty",
        [...path, "content"],
        "Text Display cannot be empty.",
      );
    if (kind === "button") validateButton(component, path, issues);
    if (selectKinds.has(kind)) validateSelect(component, path, issues);
    if (kind === "container") validateContainer(component, path, issues);
    if (kind === "section") {
      const accessory = sendableComponent(component.accessory);
      if (
        !accessory ||
        !["thumbnail", "button"].includes(componentKind(accessory))
      ) {
        addIssue(
          issues,
          "sectionAccessory",
          [...path, "accessory"],
          "A Section needs a sendable Button or Thumbnail accessory.",
        );
      }
    }
    if (kind === "thumbnail")
      validateMedia(
        component.media,
        [...path, "media"],
        i18n.t("editor.components.thumbnail"),
        issues,
      );
    if (
      kind === "thumbnail" &&
      stringValue(component.description).length > 1024
    )
      addIssue(
        issues,
        "attachmentDescriptionLimit",
        [...path, "description"],
        "Attachment descriptions are limited to 1024 characters.",
      );
    if (kind === "mediaGallery") validateGallery(component, path, issues);
    if (kind === "file")
      validateFile(component.file, [...path, "file"], issues);
    if (
      kind === "separator" &&
      component.spacing !== undefined &&
      component.spacing !== 1 &&
      component.spacing !== 2
    )
      addIssue(
        issues,
        "separatorSpacing",
        [...path, "spacing"],
        "Separator spacing must be 1 or 2.",
      );
    for (const field of ["spoiler", "disabled", "divider"]) {
      if (
        component[field] !== undefined &&
        typeof component[field] !== "boolean"
      )
        addIssue(
          issues,
          "componentBoolean",
          [...path, field],
          "{{field}} must be true or false.",
          "error",
          { field },
        );
    }
    const customId = stringValue(component.custom_id);
    if (customId) {
      if (customId.length > 100)
        addIssue(
          issues,
          "customIdLimit",
          [...path, "custom_id"],
          "custom_id is limited to 100 characters.",
        );
      if (customIds.has(customId))
        addIssue(
          issues,
          "customIdUnique",
          [...path, "custom_id"],
          "custom_id must be unique within a message.",
        );
      customIds.add(customId);
    }
    if (component.id !== undefined) {
      if (
        !Number.isInteger(component.id) ||
        (component.id as number) < 0 ||
        (component.id as number) > 2_147_483_647
      )
        addIssue(
          issues,
          "componentIdInteger",
          [...path, "id"],
          "Component ID must be a 32-bit integer.",
        );
      else if (component.id !== 0) {
        if (componentIds.has(component.id as number))
          addIssue(
            issues,
            "componentIdUnique",
            [...path, "id"],
            "Component ID must be unique within a message.",
          );
        componentIds.add(component.id as number);
      }
    }
  });

  return issues;
}

/** Export/send validation adds the Create Message requirement to the live draft checks. */
export function validateDiscordOutput(
  document: DiscordMessagePayload,
): EditorIssue[] {
  const issues = validateMessage(document);
  if (!hasSendableDiscordContent(document)) {
    addIssue(
      issues,
      "sendableMessageRequired",
      [],
      "Discord needs message content that Pokkan can serialize.",
    );
  }
  return issues;
}

function validateButton(
  component: Record<string, unknown>,
  path: ComponentPath,
  issues: EditorIssue[],
) {
  const style = component.style;
  if (
    typeof style !== "number" ||
    !Number.isInteger(style) ||
    style < 1 ||
    style > 6
  ) {
    addIssue(
      issues,
      "buttonStyle",
      [...path, "style"],
      "Button style must be 1–6.",
    );
    return;
  }
  const label = stringValue(component.label);
  if (component.emoji !== undefined && !validEmoji(component.emoji))
    addIssue(
      issues,
      "invalidEmoji",
      [...path, "emoji"],
      "Use a Unicode emoji or a valid custom emoji ID.",
    );
  if (label.length > 80)
    addIssue(
      issues,
      "buttonLabelLimit",
      [...path, "label"],
      "Button labels are limited to 80 characters.",
    );
  if (style === 5) {
    if (!stringValue(component.url))
      addIssue(issues, "linkButtonUrl", path, "A link button needs a URL.");
    if (component.custom_id !== undefined)
      addIssue(
        issues,
        "linkButtonCustomId",
        path,
        "A link button cannot have custom_id.",
      );
    if (component.sku_id !== undefined)
      addIssue(
        issues,
        "linkButtonSku",
        path,
        "A link button cannot have sku_id.",
      );
    if (stringValue(component.url).length > 512)
      addIssue(
        issues,
        "buttonUrlLimit",
        [...path, "url"],
        "Button URLs are limited to 512 characters.",
      );
  } else if (style === 6) {
    if (!stringValue(component.sku_id))
      addIssue(
        issues,
        "premiumButtonSku",
        path,
        "A premium button needs sku_id.",
      );
    ["custom_id", "label", "url", "emoji"].forEach((field) => {
      if (component[field] !== undefined)
        addIssue(
          issues,
          "premiumButtonField",
          [...path, field],
          `A premium button cannot have ${field}.`,
          "error",
          { field },
        );
    });
  } else {
    if (!stringValue(component.custom_id))
      addIssue(
        issues,
        "interactiveButtonCustomId",
        path,
        "An interactive button needs custom_id.",
      );
    if (component.url !== undefined || component.sku_id !== undefined)
      addIssue(
        issues,
        "interactiveButtonFields",
        path,
        "An interaction button cannot have url or sku_id.",
      );
  }
}

function validateSelect(
  component: Record<string, unknown>,
  path: ComponentPath,
  issues: EditorIssue[],
) {
  if (!stringValue(component.custom_id))
    addIssue(issues, "selectCustomId", path, "A select needs custom_id.");
  if (stringValue(component.placeholder).length > 150)
    addIssue(
      issues,
      "selectPlaceholderLimit",
      [...path, "placeholder"],
      "Select placeholder is limited to 150 characters.",
    );
  if (component.type === 3) {
    const options = asArray(component.options);
    if (options.length === 0)
      addIssue(
        issues,
        "stringSelectOptionsMin",
        [...path, "options"],
        "String Select needs at least one option.",
      );
    if (options.length > 25)
      addIssue(
        issues,
        "stringSelectOptionsMax",
        [...path, "options"],
        "String Select allows at most 25 options.",
      );
    options.forEach((option, index) => {
      if (!isRecord(option)) return;
      if (!stringValue(option.label) || stringValue(option.label).length > 100)
        addIssue(
          issues,
          "optionLabelLength",
          [...path, "options", index, "label"],
          "Option labels need 1–100 characters.",
        );
      if (!stringValue(option.value) || stringValue(option.value).length > 100)
        addIssue(
          issues,
          "optionValueLength",
          [...path, "options", index, "value"],
          "Option values need 1–100 characters.",
        );
    });
  }
  const min =
    typeof component.min_values === "number" ? component.min_values : undefined;
  const max =
    typeof component.max_values === "number" ? component.max_values : undefined;
  if (min !== undefined && (min < 1 || min > 25))
    addIssue(
      issues,
      "selectMin",
      [...path, "min_values"],
      "Message selects require 1–25 minimum selections.",
    );
  if (max !== undefined && (max < 1 || max > 25))
    addIssue(
      issues,
      "selectMax",
      [...path, "max_values"],
      "Maximum selections must be 1–25.",
    );
  if (min !== undefined && max !== undefined && min > max)
    addIssue(
      issues,
      "selectRange",
      path,
      "Minimum selections cannot exceed maximum selections.",
    );
  validateDefaultValues(component, path, min ?? 1, max ?? 1, issues);
}

function validateDefaultValues(
  component: Record<string, unknown>,
  path: ComponentPath,
  min: number,
  max: number,
  issues: EditorIssue[],
) {
  if (component.default_values === undefined) return;
  if (component.type === 3) {
    addIssue(
      issues,
      "stringSelectDefaults",
      [...path, "default_values"],
      "String Select uses option.default instead of default_values.",
    );
    return;
  }
  const values = asArray(component.default_values);
  if (values.length < min || values.length > max)
    addIssue(
      issues,
      "defaultValuesRange",
      [...path, "default_values"],
      "Default values must fit the selection range.",
    );
  const accepted =
    component.type === 5
      ? ["user"]
      : component.type === 6
        ? ["role"]
        : component.type === 8
          ? ["channel"]
          : ["user", "role"];
  const acceptedLabels = accepted
    .map((type) => i18n.t(`editor.entityTypes.${type}`))
    .join(" / ");
  values.forEach((value, index) => {
    if (
      !isRecord(value) ||
      !stringValue(value.id) ||
      !accepted.includes(stringValue(value.type))
    )
      addIssue(
        issues,
        "defaultValueInvalid",
        [...path, "default_values", index],
        `Default value must contain a valid ${acceptedLabels} ID.`,
        "error",
        { types: acceptedLabels },
      );
  });
}

function validateContainer(
  component: Record<string, unknown>,
  path: ComponentPath,
  issues: EditorIssue[],
) {
  if (
    component.accent_color != null &&
    (!Number.isInteger(component.accent_color) ||
      (component.accent_color as number) < 0 ||
      (component.accent_color as number) > 0xff_ff_ff)
  ) {
    addIssue(
      issues,
      "accentColor",
      [...path, "accent_color"],
      "Accent color must be a 24-bit integer.",
    );
  }
}

function validateMedia(
  value: unknown,
  path: ComponentPath,
  label: string,
  issues: EditorIssue[],
) {
  if (!isRecord(value) || !stringValue(value.url))
    addIssue(issues, "mediaUrl", path, `${label} needs a media URL.`, "error", {
      label,
    });
}

function validateFile(
  value: unknown,
  path: ComponentPath,
  issues: EditorIssue[],
) {
  validateMedia(value, path, i18n.t("editor.components.file"), issues);
  if (
    isRecord(value) &&
    stringValue(value.url) &&
    !stringValue(value.url).startsWith("attachment://")
  )
    addIssue(
      issues,
      "fileAttachmentUrl",
      [...path, "url"],
      "File components only accept attachment:// URLs.",
    );
}

function validateGallery(
  component: Record<string, unknown>,
  path: ComponentPath,
  issues: EditorIssue[],
) {
  const items = asArray(component.items);
  if (items.length === 0)
    addIssue(
      issues,
      "galleryItemsMin",
      [...path, "items"],
      "Media Gallery needs at least one item.",
    );
  if (items.length > 10)
    addIssue(
      issues,
      "galleryItemsMax",
      [...path, "items"],
      "Media Gallery allows at most 10 items.",
    );
  items.forEach((item, index) => {
    validateMedia(
      isRecord(item) ? item.media : undefined,
      [...path, "items", index, "media"],
      i18n.t("editor.galleryItem"),
      issues,
    );
    if (isRecord(item) && stringValue(item.description).length > 1024)
      addIssue(
        issues,
        "attachmentDescriptionLimit",
        [...path, "items", index, "description"],
        "Attachment descriptions are limited to 1024 characters.",
      );
    if (
      isRecord(item) &&
      item.spoiler !== undefined &&
      typeof item.spoiler !== "boolean"
    )
      addIssue(
        issues,
        "componentBoolean",
        [...path, "items", index, "spoiler"],
        "{{field}} must be true or false.",
        "error",
        { field: "spoiler" },
      );
  });
}

function validateLegacyMessage(
  payload: Record<string, unknown>,
  issues: EditorIssue[],
) {
  if (stringValue(payload.content).length > 2_000)
    addIssue(
      issues,
      "contentLimit",
      ["content"],
      "Message content is limited to 2000 characters.",
    );
  const embeds = asArray(payload.embeds);
  if (embeds.length > 10)
    addIssue(
      issues,
      "embedCount",
      ["embeds"],
      "A message allows up to 10 embeds.",
    );
  let embedText = 0;
  embeds.forEach((embed, index) => {
    if (!isRecord(embed)) return;
    if (
      embed.color !== undefined &&
      (!Number.isInteger(embed.color) ||
        (embed.color as number) < 0 ||
        (embed.color as number) > 0xffffff)
    )
      addIssue(
        issues,
        "embedColor",
        ["embeds", index, "color"],
        "Color must be a 24-bit integer.",
      );
    const strings: readonly [string, number][] = [
      ["title", 256],
      ["description", 4096],
    ];
    strings.forEach(([field, max]) => {
      const text = stringValue(embed[field]);
      embedText += text.length;
      if (text.length > max)
        addIssue(
          issues,
          "embedPropertyLimit",
          ["embeds", index, field],
          `Embed ${field} is limited to ${max} characters.`,
          "error",
          { field, limit: max },
        );
    });
    const author = isRecord(embed.author) ? embed.author : {};
    const footer = isRecord(embed.footer) ? embed.footer : {};
    embedText +=
      stringValue(author.name).length + stringValue(footer.text).length;
    if (stringValue(author.name).length > 256)
      addIssue(
        issues,
        "embedAuthorLimit",
        ["embeds", index, "author", "name"],
        "Embed author name is limited to 256 characters.",
      );
    if (stringValue(footer.text).length > 2048)
      addIssue(
        issues,
        "embedFooterLimit",
        ["embeds", index, "footer", "text"],
        "Embed footer text is limited to 2048 characters.",
      );
    const fields = asArray(embed.fields);
    if (fields.length > 25)
      addIssue(
        issues,
        "embedFieldsCount",
        ["embeds", index, "fields"],
        "An embed allows up to 25 fields.",
      );
    fields.forEach((field, fieldIndex) => {
      if (!isRecord(field)) return;
      ["name", "value"].forEach((key) => {
        embedText += stringValue(field[key]).length;
        if (!stringValue(field[key]).length)
          addIssue(issues, "embedFieldRequired", ["embeds", index, "fields", fieldIndex, key], "An embed field needs both a name and a value.");
      });
      if (stringValue(field.name).length > 256)
        addIssue(
          issues,
          "embedFieldName",
          ["embeds", index, "fields", fieldIndex, "name"],
          "Embed field names are limited to 256 characters.",
        );
      if (stringValue(field.value).length > 1024)
        addIssue(
          issues,
          "embedFieldValue",
          ["embeds", index, "fields", fieldIndex, "value"],
          "Embed field values are limited to 1024 characters.",
        );
    });
  });
  if (embedText > 6_000)
    addIssue(
      issues,
      "embedTextLimit",
      ["embeds"],
      "Combined embed text is limited to 6000 characters.",
    );
  const stickers = asArray(payload.sticker_ids);
  if (stickers.length > 3)
    addIssue(
      issues,
      "stickerLimit",
      ["sticker_ids"],
      "A message allows up to 3 stickers.",
    );
  asArray(payload.attachments).forEach((attachment, index) => {
    if (
      isRecord(attachment) &&
      stringValue(attachment.description).length > 1024
    )
      addIssue(
        issues,
        "attachmentDescriptionLimit",
        ["attachments", index, "description"],
        "Attachment descriptions are limited to 1024 characters.",
      );
  });
  validatePoll(payload.poll, issues);
}

function validateRequestFields(
  payload: Record<string, unknown>,
  issues: EditorIssue[],
) {
  if (
    payload.flags !== undefined &&
    (!Number.isInteger(payload.flags) ||
      ((payload.flags as number) & ~settableMessageFlags) !== 0)
  ) {
    addIssue(
      issues,
      "settableFlags",
      ["flags"],
      "Only message flags supported by Pokkan can be exported.",
    );
  }
  if (
    payload.nonce !== undefined &&
    typeof payload.nonce !== "string" &&
    typeof payload.nonce !== "number"
  ) {
    addIssue(
      issues,
      "nonceType",
      ["nonce"],
      "nonce must be a string or integer.",
    );
  }
  if (typeof payload.nonce === "string" && payload.nonce.length > 25) {
    addIssue(
      issues,
      "nonceLimit",
      ["nonce"],
      "nonce is limited to 25 characters.",
    );
  }
  validateMessageReference(payload.message_reference, issues);
}

function validateAllowedMentions(value: unknown, issues: EditorIssue[]) {
  if (!isRecord(value)) return;
  const parse = asArray(value.parse).filter(
    (item): item is string => typeof item === "string",
  );
  const users = asArray(value.users);
  const roles = asArray(value.roles);
  if (users.length > 100)
    addIssue(
      issues,
      "mentionUsersLimit",
      ["allowed_mentions", "users"],
      "Allowed mentions supports up to 100 users.",
    );
  if (roles.length > 100)
    addIssue(
      issues,
      "mentionRolesLimit",
      ["allowed_mentions", "roles"],
      "Allowed mentions supports up to 100 roles.",
    );
  if (parse.includes("users") && users.length)
    addIssue(
      issues,
      "mentionUsersConflict",
      ["allowed_mentions"],
      "allowed_mentions.parse users cannot be combined with explicit users.",
    );
  if (parse.includes("roles") && roles.length)
    addIssue(
      issues,
      "mentionRolesConflict",
      ["allowed_mentions"],
      "allowed_mentions.parse roles cannot be combined with explicit roles.",
    );
}

function validatePoll(value: unknown, issues: EditorIssue[]) {
  if (value === undefined) return;
  if (!isRecord(value)) {
    addIssue(issues, "pollObject", ["poll"], "Poll must be an object.");
    return;
  }
  const question = isRecord(value.question) ? value.question : {};
  if (!stringValue(question.text) || stringValue(question.text).length > 300)
    addIssue(
      issues,
      "pollQuestion",
      ["poll", "question", "text"],
      "Poll questions need 1–300 characters.",
    );
  const answers = asArray(value.answers);
  if (answers.length < 2)
    addIssue(
      issues,
      "pollAnswersMin",
      ["poll", "answers"],
      "Polls need at least 2 answers.",
    );
  if (answers.length > 10)
    addIssue(
      issues,
      "pollAnswersMax",
      ["poll", "answers"],
      "Polls allow at most 10 answers.",
    );
  answers.forEach((answer, index) => {
    const media =
      isRecord(answer) && isRecord(answer.poll_media) ? answer.poll_media : {};
    if (!stringValue(media.text) || stringValue(media.text).length > 55)
      addIssue(
        issues,
        "pollAnswerText",
        ["poll", "answers", index, "poll_media", "text"],
        "Poll answers need 1–55 characters.",
      );
    if (media.emoji !== undefined && !validEmoji(media.emoji))
      addIssue(
        issues,
        "invalidEmoji",
        ["poll", "answers", index, "poll_media", "emoji"],
        "Use a Unicode emoji or a valid custom emoji ID.",
      );
  });
  if (
    value.duration !== undefined &&
    (!Number.isInteger(value.duration) ||
      (value.duration as number) < 1 ||
      (value.duration as number) > 768)
  )
    addIssue(
      issues,
      "pollDuration",
      ["poll", "duration"],
      "Poll duration must be between 1 hour and 32 days.",
    );
  if (value.layout_type !== undefined && value.layout_type !== 1)
    addIssue(
      issues,
      "pollLayout",
      ["poll", "layout_type"],
      "Poll layout_type must be 1.",
    );
}

function validateMessageReference(value: unknown, issues: EditorIssue[]) {
  if (value === undefined) return;
  if (!isRecord(value)) {
    addIssue(
      issues,
      "referenceObject",
      ["message_reference"],
      "Message reference must be an object.",
    );
    return;
  }
  const type = value.type === undefined ? 0 : value.type;
  if (type !== 0 && type !== 1)
    addIssue(
      issues,
      "referenceType",
      ["message_reference", "type"],
      "Message reference type must be Reply (0) or Forward (1).",
    );
  if (typeof value.message_id !== "string" || !value.message_id)
    addIssue(
      issues,
      "referenceMessageId",
      ["message_reference", "message_id"],
      "A message reference requires message_id.",
    );
  if (type === 1 && (typeof value.channel_id !== "string" || !value.channel_id))
    addIssue(
      issues,
      "forwardChannelId",
      ["message_reference", "channel_id"],
      "A forward reference requires channel_id.",
    );
}

type IssueInterpolation = Readonly<Record<string, string | number>>;

function addIssue(
  issues: EditorIssue[],
  code: string,
  path: ComponentPath,
  fallback: string,
  level: EditorIssue["level"] = "error",
  values: IssueInterpolation = {},
) {
  issues.push({
    code,
    path,
    level,
    message: i18n.t(`editor.validation.${code}`, {
      defaultValue: fallback,
      ...values,
    }),
  });
}

function parentLabel(parent: ParentKind) {
  if (parent === "root" || parent === "sectionAccessory")
    return i18n.t(`editor.parents.${parent}`);
  return i18n.t(`editor.components.${parent}`);
}

function walkComponents(
  values: readonly unknown[],
  path: ComponentPath,
  visit: (
    component: Record<string, unknown>,
    path: ComponentPath,
    parent: ParentKind,
  ) => void,
  parent: ParentKind = "root",
) {
  values.forEach((value, index) =>
    walkComponent(value, [...path, index], visit, parent),
  );
}

/** Unsupported roots are preserved but omitted as complete subtrees from Discord JSON. */
function walkComponent(
  value: unknown,
  path: ComponentPath,
  visit: (
    component: Record<string, unknown>,
    path: ComponentPath,
    parent: ParentKind,
  ) => void,
  parent: ParentKind,
) {
  if (!isRecord(value)) return;
  visit(value, path, parent);
  const kind = componentKind(value);
  if (kind === "unknown") return;
  walkComponents(
    asArray(value.components),
    [...path, "components"],
    visit,
    kind,
  );
  if (isRecord(value.accessory))
    walkComponent(
      value.accessory,
      [...path, "accessory"],
      visit,
      "sectionAccessory",
    );
}

export function componentCount(values: readonly unknown[]): number {
  return values.reduce<number>((total, value) => {
    if (!isRecord(value)) return total;
    return (
      total +
      1 +
      componentCount(asArray(value.components)) +
      (isRecord(value.accessory) ? 1 : 0)
    );
  }, 0);
}

/** Counts exactly the known component objects emitted by Discord JSON serialization. */
export function sendableComponentCount(values: readonly unknown[]): number {
  return componentCount(sendableComponents(values));
}

/**
 * Number of sendable components still required to complete supported V2
 * structures. Unknown roots are omitted with their entire subtree, matching
 * Discord serialization.
 */
export function minimumCompletionReserve(document: DiscordMessagePayload) {
  if (messageFormat(document) !== "componentsV2") return 0;
  return completionReserve(
    asArray((document as Record<string, unknown>).components),
  );
}

/** Whether the current V2 tree can still become structurally complete at 40 components. */
export function hasV2CompletionCapacity(document: DiscordMessagePayload) {
  return (
    messageFormat(document) !== "componentsV2" ||
    sendableComponentCount(
      asArray((document as Record<string, unknown>).components),
    ) +
      minimumCompletionReserve(document) <=
      40
  );
}

function completionReserve(values: readonly unknown[]): number {
  return values.reduce<number>(
    (total, value) => total + componentCompletionReserve(value),
    0,
  );
}

function componentCompletionReserve(value: unknown): number {
  const component = sendableComponent(value);
  if (!component) return 0;
  const kind = componentKind(component);

  const children =
    kind === "actionRow" || kind === "section" || kind === "container"
      ? asArray(component.components)
      : [];
  const nested = completionReserve(children);

  if (kind === "actionRow") {
    return (
      nested +
      (children.some((child) => {
        const childKind = componentKind(child);
        return childKind !== "unknown" && rowKinds.has(childKind);
      })
        ? 0
        : 1)
    );
  }
  if (kind === "section") {
    const hasText = children.some(
      (child) => componentKind(child) === "textDisplay",
    );
    const accessory = sendableComponent(component.accessory);
    const hasAccessory =
      accessory !== undefined &&
      ["thumbnail", "button"].includes(componentKind(accessory));
    return nested + (hasText ? 0 : 1) + (hasAccessory ? 0 : 1);
  }
  return nested;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function uniqueId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
