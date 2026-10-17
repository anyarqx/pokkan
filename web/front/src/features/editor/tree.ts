import { messageFormat } from "../kits/domain";
import i18n from "../../app/i18n";
import {
  settableMessageFlags,
  type DiscordMessagePayload,
} from "../kits/domain";
import {
  allowedChildren,
  canAcceptChild,
  componentDefinition,
  componentKind,
  createComponent,
  hasV2CompletionCapacity,
  validateMessage,
  type ComponentKind,
  type ComponentPath,
  type ParentKind,
} from "./schema";
import { sendableComponents } from "../kits/domain";

export type MutationResult =
  | { readonly ok: true; readonly document: DiscordMessagePayload }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
      readonly path?: ComponentPath;
    };

export function nodeAt(
  document: DiscordMessagePayload,
  path: ComponentPath,
): Record<string, unknown> | undefined {
  const value = atPath(document, path);
  return isRecord(value) ? value : undefined;
}

export function childNodes(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
): readonly unknown[] {
  if (parentPath.length === 0)
    return arrayValue((document as Record<string, unknown>).components);
  return arrayValue(nodeAt(document, parentPath)?.components);
}

export function parentKind(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
): ParentKind {
  return parentPath.length === 0
    ? "root"
    : componentKind(nodeAt(document, parentPath));
}

export function allowedInsertions(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
) {
  const kinds = allowedChildren(
    messageFormat(document),
    parentKind(document, parentPath),
    sendableComponents(childNodes(document, parentPath)),
  );
  if (messageFormat(document) !== "componentsV2") return kinds;
  return kinds.filter((kind) => {
    const candidate = insertionCapacityCandidate(document, parentPath, kind);
    return candidate !== undefined && hasV2CompletionCapacity(candidate);
  });
}

/** A Section accessory is a singular slot, not an array insertion destination. */
export function allowedSectionAccessories(
  document: DiscordMessagePayload,
  sectionPath: ComponentPath,
) {
  const section = nodeAt(document, sectionPath);
  if (
    messageFormat(document) !== "componentsV2" ||
    componentKind(section) !== "section"
  )
    return [];
  return allowedChildren(
    messageFormat(document),
    "sectionAccessory",
    [],
  ).filter((kind): kind is "thumbnail" | "button" => {
    if (kind !== "thumbnail" && kind !== "button") return false;
    const candidate = sectionAccessoryCapacityCandidate(
      document,
      sectionPath,
      kind,
    );
    return candidate !== undefined && hasV2CompletionCapacity(candidate);
  });
}

export function setNodeField(
  document: DiscordMessagePayload,
  path: ComponentPath,
  field: string,
  value: unknown,
): DiscordMessagePayload {
  const payload = clonePayload(document);
  const node = atPath(payload, path);
  if (!isRecord(node)) return document;
  if (value === undefined) delete node[field];
  else node[field] = value;
  return payload as DiscordMessagePayload;
}

/** Keeps mutually exclusive Discord button fields coherent while changing style. */
export function setButtonStyle(
  document: DiscordMessagePayload,
  path: ComponentPath,
  style: number,
): DiscordMessagePayload {
  const payload = clonePayload(document);
  const node = atPath(payload, path);
  if (
    !isRecord(node) ||
    componentKind(node) !== "button" ||
    node.style === style ||
    !Number.isInteger(style) ||
    style < 1 ||
    style > 6
  )
    return document;

  node.style = style;
  delete node.url;
  delete node.sku_id;

  if (style === 5) {
    delete node.custom_id;
  } else if (style === 6) {
    delete node.custom_id;
    delete node.label;
    delete node.emoji;
    node.sku_id = "";
  } else if (typeof node.custom_id !== "string" || !node.custom_id) {
    node.custom_id = `button_${Math.random().toString(36).slice(2, 9)}`;
  }

  return payload as DiscordMessagePayload;
}

export function setMessageField(
  document: DiscordMessagePayload,
  field: string,
  value: unknown,
): DiscordMessagePayload {
  const payload = clonePayload(document);
  if (value === undefined) delete payload[field];
  else payload[field] = value;
  return payload as DiscordMessagePayload;
}

/**
 * Applies a message-level edit only when it cannot cross a Discord hard cap.
 * Required-field validation is intentionally left to the live validator so
 * users can type an incomplete value without the editor fighting the cursor.
 */
export function trySetMessageField(
  document: DiscordMessagePayload,
  field: string,
  value: unknown,
): MutationResult {
  if (
    messageFormat(document) === "componentsV2" &&
    value !== undefined &&
    [
      "content",
      "embeds",
      "sticker_ids",
      "poll",
      "shared_client_theme",
    ].includes(field)
  ) {
    return rejected(
      "v2FieldForbidden",
      `${field} is not valid in Components V2 messages.`,
      [field],
      { field },
    );
  }
  if (
    field === "flags" &&
    value !== undefined &&
    (!Number.isInteger(value) ||
      ((value as number) & ~settableMessageFlags) !== 0)
  ) {
    return rejected(
      "settableFlags",
      "Only message flags supported by Pokkan can be exported.",
      ["flags"],
    );
  }
  if (field === "nonce" && typeof value === "string" && value.length > 25)
    return rejected("nonceLimit", "nonce is limited to 25 characters.", [
      "nonce",
    ]);
  return acceptHardLimits(setMessageField(document, field, value));
}

export function trySetNodeField(
  document: DiscordMessagePayload,
  path: ComponentPath,
  field: string,
  value: unknown,
): MutationResult {
  const next = setNodeField(document, path, field, value);
  if (["id", "custom_id", "style"].includes(field)) {
    const issue = validateMessage(next).find(
      (item) =>
        item.level === "error" &&
        (field === "style"
          ? item.code === "buttonStyle" && samePath(item.path, [...path, field])
          : field === "id"
            ? ["componentIdInteger", "componentIdUnique"].includes(item.code)
            : ["customIdLimit", "customIdUnique"].includes(item.code)),
    );
    if (issue) return rejected(issue.code, issue.message, issue.path);
  }
  return acceptHardLimits(next);
}

export function tryInsertComponent(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
  kind: Exclude<ComponentKind, "unknown">,
  index?: number,
): MutationResult {
  const payload = clonePayload(document);
  const destination = mutableChildren(payload, parentPath, true);
  if (!destination)
    return rejected(
      "destinationMissing",
      "The destination no longer exists.",
      parentPath,
    );
  const component = createComponent(kind);
  if (
    !canAcceptChild(
      messageFormat(document),
      parentKind(document, parentPath),
      sendableComponents(destination),
      kind,
    )
  )
    return rejected(
      "componentNotAllowed",
      `A ${componentDefinitionName(kind)} is not allowed here.`,
      parentPath,
      { component: componentDefinitionName(kind) },
    );
  destination.splice(clampIndex(index, destination.length), 0, component);
  if (!hasV2CompletionCapacity(payload as DiscordMessagePayload))
    return rejected(
      "v2ComponentLimit",
      "Components V2 messages allow at most 40 components.",
      parentPath,
    );
  return accepted(payload as DiscordMessagePayload);
}

/** Adds or replaces a Section's required singular accessory with a valid default component. */
export function trySetSectionAccessory(
  document: DiscordMessagePayload,
  sectionPath: ComponentPath,
  kind: "thumbnail" | "button",
): MutationResult {
  if (!allowedSectionAccessories(document, sectionPath).includes(kind))
    return rejected(
      "componentNotAllowed",
      `A ${componentDefinitionName(kind)} is not allowed here.`,
      sectionPath,
      { component: componentDefinitionName(kind) },
    );
  const payload = clonePayload(document);
  const section = atPath(payload, sectionPath);
  if (!isRecord(section) || componentKind(section) !== "section")
    return rejected(
      "destinationMissing",
      "The Section no longer exists.",
      sectionPath,
    );
  section.accessory = createComponent(kind);
  if (!hasV2CompletionCapacity(payload as DiscordMessagePayload))
    return rejected(
      "v2ComponentLimit",
      "Components V2 messages allow at most 40 components.",
      sectionPath,
    );
  return accepted(payload as DiscordMessagePayload);
}

/** Inserts a ready-to-edit Legacy action row for a select or button in one operation. */
export function tryInsertLegacyRow(
  document: DiscordMessagePayload,
  kind: Exclude<ComponentKind, "unknown">,
  index?: number,
): MutationResult {
  if (messageFormat(document) !== "legacy")
    return rejected(
      "legacyRowsOnly",
      "Interactive rows are only available in Legacy messages.",
    );
  if (
    ![
      "button",
      "stringSelect",
      "userSelect",
      "roleSelect",
      "mentionableSelect",
      "channelSelect",
    ].includes(kind)
  )
    return rejected(
      "legacyRowKind",
      "Only message buttons and selects can start a Legacy row.",
    );
  const payload = clonePayload(document);
  const rows = mutableChildren(payload, [], true);
  if (!rows)
    return rejected(
      "componentsMissing",
      "The components collection no longer exists.",
    );
  if (
    !canAcceptChild(
      messageFormat(document),
      "root",
      sendableComponents(rows),
      "actionRow",
    )
  )
    return rejected(
      "legacyRowLimit",
      "Legacy messages allow at most 5 Action Rows.",
      ["components"],
    );
  rows.splice(clampIndex(index, rows.length), 0, {
    type: 1,
    components: [createComponent(kind)],
  });
  return accepted(payload as DiscordMessagePayload);
}

export function tryPasteComponent(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
  value: unknown,
  index?: number,
): MutationResult {
  const capability = pasteCapability(document, parentPath, value);
  if (!capability.ok)
    return rejected(capability.code, capability.reason, parentPath);
  const payload = clonePayload(document);
  const destination = mutableChildren(payload, parentPath, true);
  if (!destination)
    return rejected(
      "destinationMissing",
      "The destination no longer exists.",
      parentPath,
    );
  const copy = structuredClone(value) as Record<string, unknown>;
  refreshCopiedIdentities(copy);
  destination.splice(clampIndex(index, destination.length), 0, copy);
  return accepted(payload as DiscordMessagePayload);
}

/** Pure paste capability shared by menus, keyboard commands and mutation. */
export function canPasteComponent(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
  value: unknown,
) {
  return pasteCapability(document, parentPath, value).ok;
}

function pasteCapability(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
  value: unknown,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly reason: string } {
  if (!isRecord(value))
    return {
      ok: false,
      code: "clipboardInvalid",
      reason: "Clipboard does not contain a component.",
    };
  const kind = componentKind(value);
  if (kind === "unknown")
    return {
      ok: false,
      code: "pasteUnsupported",
      reason:
        "Unsupported components are preserved but cannot be pasted into an editable tree.",
    };
  if (parentPath.at(-1) === "accessory")
    return {
      ok: false,
      code: "componentNotAllowed",
      reason: "A Section accessory must be added or replaced directly.",
    };
  const destination = childNodes(document, parentPath);
  if (
    !canAcceptChild(
      messageFormat(document),
      parentKind(document, parentPath),
      sendableComponents(destination),
      kind,
    )
  ) {
    return {
      ok: false,
      code: "componentNotAllowed",
      reason: `A ${componentDefinitionName(kind)} is not allowed here.`,
    };
  }
  const candidate = insertionCapacityCandidate(
    document,
    parentPath,
    kind,
    value,
  );
  if (!candidate || !hasV2CompletionCapacity(candidate)) {
    return {
      ok: false,
      code: "pasteV2Limit",
      reason:
        "Pasting this component would exceed the 40-component Components V2 limit.",
    };
  }
  return { ok: true };
}

export function removeComponent(
  document: DiscordMessagePayload,
  path: ComponentPath,
): DiscordMessagePayload {
  const payload = clonePayload(document);
  const last = path.at(-1);
  if (last === "accessory") {
    // A Section requires exactly one accessory; it is replaced from its node.
    return document;
  }
  if (typeof last !== "number") return document;
  const list = atPath(payload, path.slice(0, -1));
  if (!Array.isArray(list) || last < 0 || last >= list.length) return document;
  list.splice(last, 1);
  const parentPath = path.slice(0, -1);
  const parentNodePath =
    parentPath.at(-1) === "components" ? parentPath.slice(0, -1) : parentPath;
  const parent = atPath(payload, parentNodePath);
  if (
    isRecord(parent) &&
    Array.isArray(parent.components) &&
    parent.components.length === 0 &&
    componentKind(parent) === "actionRow"
  ) {
    const parentIndex = parentNodePath.at(-1);
    const parentList = atPath(payload, parentNodePath.slice(0, -1));
    if (typeof parentIndex === "number" && Array.isArray(parentList))
      parentList.splice(parentIndex, 1);
  }
  return payload as DiscordMessagePayload;
}

export function tryDuplicateComponent(
  document: DiscordMessagePayload,
  path: ComponentPath,
): MutationResult {
  const capability = duplicateCapability(document, path);
  if (!capability.ok)
    return rejected(capability.code, capability.reason, capability.path);
  const last = path.at(-1) as number;
  const payload = clonePayload(document);
  const list = atPath(payload, path.slice(0, -1));
  if (!Array.isArray(list) || !isRecord(list[last]))
    return rejected(
      "sourceMissing",
      "The source component no longer exists.",
      path,
    );
  const clone = structuredClone(list[last]) as Record<string, unknown>;
  refreshCopiedIdentities(clone);
  list.splice(last + 1, 0, clone);
  return accepted(payload as DiscordMessagePayload);
}

/** Pure capability check for menus and keyboard affordances. */
export function canDuplicateComponent(
  document: DiscordMessagePayload,
  path: ComponentPath,
) {
  return duplicateCapability(document, path).ok;
}

function duplicateCapability(
  document: DiscordMessagePayload,
  path: ComponentPath,
):
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: string;
      readonly reason: string;
      readonly path?: ComponentPath;
    } {
  const last = path.at(-1);
  if (typeof last !== "number")
    return {
      ok: false,
      code: "duplicateUnavailable",
      reason: "This component cannot be duplicated.",
      path,
    };
  const parentPath = parentNodePath(path);
  if (!parentPath)
    return {
      ok: false,
      code: "parentMissing",
      reason: "The component parent no longer exists.",
      path,
    };
  const existing = childNodes(document, parentPath);
  const original = existing[last];
  const kind = componentKind(original);
  if (!isRecord(original) || kind === "unknown")
    return {
      ok: false,
      code: "duplicateUnsupported",
      reason: "Unsupported components cannot be duplicated.",
      path,
    };
  if (
    !canAcceptChild(
      messageFormat(document),
      parentKind(document, parentPath),
      sendableComponents(existing),
      kind,
    )
  ) {
    return {
      ok: false,
      code: "duplicateCapacity",
      reason: `Duplicating this ${componentDefinitionName(kind)} would exceed its parent capacity.`,
      path: parentPath,
    };
  }
  const candidate = insertionCapacityCandidate(
    document,
    parentPath,
    kind,
    original,
    last + 1,
  );
  if (!candidate || !hasV2CompletionCapacity(candidate)) {
    return {
      ok: false,
      code: "duplicateV2Limit",
      reason:
        "Duplicating this component would exceed the 40-component Components V2 limit.",
      path: parentPath,
    };
  }
  return { ok: true };
}

export function canCopyComponent(
  document: DiscordMessagePayload,
  path: ComponentPath,
) {
  return (
    path.at(-1) !== "accessory" &&
    componentKind(nodeAt(document, path)) !== "unknown"
  );
}

export function canRemoveComponent(
  document: DiscordMessagePayload,
  path: ComponentPath,
) {
  return typeof path.at(-1) === "number" && canCopyComponent(document, path);
}

export function canMoveWithinParent(
  document: DiscordMessagePayload,
  path: ComponentPath,
  direction: -1 | 1,
) {
  const parent = parentNodePath(path);
  const index = path.at(-1);
  return Boolean(
    parent &&
    typeof index === "number" &&
    canMoveComponent(document, parent, parent, index) &&
    index + direction >= 0 &&
    index + direction < childNodes(document, parent).length,
  );
}

export function canMoveComponent(
  document: DiscordMessagePayload,
  sourceParentPath: ComponentPath,
  destinationParentPath: ComponentPath,
  index: number,
): boolean {
  const source = childNodes(document, sourceParentPath);
  const item = source[index];
  if (!isRecord(item)) return false;
  const kind = componentKind(item);
  if (kind === "unknown") return false;

  const destination = [...childNodes(document, destinationParentPath)];
  if (samePath(sourceParentPath, destinationParentPath))
    destination.splice(index, 1);
  if (
    !canAcceptChild(
      messageFormat(document),
      parentKind(document, destinationParentPath),
      sendableComponents(destination),
      kind,
    )
  )
    return false;
  const candidate = moveCapacityCandidate(
    document,
    sourceParentPath,
    destinationParentPath,
    index,
    destination.length,
  );
  return candidate !== undefined && hasV2CompletionCapacity(candidate);
}

export function moveComponent(
  document: DiscordMessagePayload,
  sourceParentPath: ComponentPath,
  destinationParentPath: ComponentPath,
  oldIndex: number,
  newIndex: number,
): DiscordMessagePayload {
  return documentFrom(
    tryMoveComponent(
      document,
      sourceParentPath,
      destinationParentPath,
      oldIndex,
      newIndex,
    ),
    document,
  );
}

export function tryMoveComponent(
  document: DiscordMessagePayload,
  sourceParentPath: ComponentPath,
  destinationParentPath: ComponentPath,
  oldIndex: number,
  newIndex: number,
): MutationResult {
  if (
    !canMoveComponent(
      document,
      sourceParentPath,
      destinationParentPath,
      oldIndex,
    )
  )
    return rejected(
      "moveRejected",
      "This destination does not accept the component or is at capacity.",
      destinationParentPath,
    );
  const candidate = moveCapacityCandidate(
    document,
    sourceParentPath,
    destinationParentPath,
    oldIndex,
    newIndex,
  );
  if (!candidate)
    return rejected(
      "moveMissing",
      "The source or destination no longer exists.",
    );
  return accepted(candidate);
}

export function moveWithinParent(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
  index: number,
  direction: -1 | 1,
): DiscordMessagePayload {
  const children = childNodes(document, parentPath);
  const next = index + direction;
  if (next < 0 || next >= children.length) return document;
  return moveComponent(document, parentPath, parentPath, index, next);
}

/** Reorders any repeatable message field (embeds, attachments, embed fields) without involving component rules. */
export function moveListItem(
  document: DiscordMessagePayload,
  listPath: ComponentPath,
  oldIndex: number,
  newIndex: number,
): DiscordMessagePayload {
  const payload = clonePayload(document);
  const list = atPath(payload, listPath);
  if (
    !Array.isArray(list) ||
    oldIndex < 0 ||
    newIndex < 0 ||
    oldIndex >= list.length ||
    newIndex >= list.length
  )
    return document;
  const [item] = list.splice(oldIndex, 1);
  list.splice(newIndex, 0, item);
  return payload as DiscordMessagePayload;
}

/** Adds to a known repeatable message collection without making raw array writes an escape hatch. */
export function pathForChild(
  parentPath: ComponentPath,
  index: number,
): ComponentPath {
  return parentPath.length === 0
    ? ["components", index]
    : [...parentPath, "components", index];
}

export function parentListPath(path: ComponentPath): ComponentPath | undefined {
  const last = path.at(-1);
  return typeof last === "number" ? path.slice(0, -1) : undefined;
}

/** Returns the component node that owns a child path; root children use []. */
export function parentNodePath(path: ComponentPath): ComponentPath | undefined {
  const list = parentListPath(path);
  if (!list || list.at(-1) !== "components") return undefined;
  return list.slice(0, -1);
}

export function indexInParent(path: ComponentPath) {
  const last = path.at(-1);
  return typeof last === "number" ? last : undefined;
}

export function pathKey(path: ComponentPath) {
  return path.join(".");
}

export function parsePath(value: string): ComponentPath {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.every(
        (part) => typeof part === "string" || typeof part === "number",
      )
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function clonePayload(document: DiscordMessagePayload) {
  return structuredClone(document) as Record<string, unknown>;
}

function mutableChildren(
  payload: Record<string, unknown>,
  parentPath: ComponentPath,
  create: boolean,
): unknown[] | undefined {
  if (parentPath.length === 0) {
    if (!Array.isArray(payload.components) && create) payload.components = [];
    return Array.isArray(payload.components) ? payload.components : undefined;
  }
  const parent = atPath(payload, parentPath);
  if (!isRecord(parent)) return undefined;
  if (!Array.isArray(parent.components) && create) parent.components = [];
  return Array.isArray(parent.components) ? parent.components : undefined;
}

/** Structural candidate used only for capacity queries; it never creates default ids or labels. */
function insertionCapacityCandidate(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
  kind: Exclude<ComponentKind, "unknown">,
  value: unknown = capacityShape(kind),
  index?: number,
) {
  const payload = clonePayload(document);
  const destination = mutableChildren(payload, parentPath, true);
  if (!destination) return undefined;
  destination.splice(
    clampIndex(index, destination.length),
    0,
    structuredClone(value),
  );
  return payload as DiscordMessagePayload;
}

function sectionAccessoryCapacityCandidate(
  document: DiscordMessagePayload,
  sectionPath: ComponentPath,
  kind: "thumbnail" | "button",
) {
  const payload = clonePayload(document);
  const section = atPath(payload, sectionPath);
  if (!isRecord(section) || componentKind(section) !== "section")
    return undefined;
  section.accessory = capacityShape(kind);
  return payload as DiscordMessagePayload;
}

function moveCapacityCandidate(
  document: DiscordMessagePayload,
  sourceParentPath: ComponentPath,
  destinationParentPath: ComponentPath,
  oldIndex: number,
  newIndex: number,
) {
  const payload = clonePayload(document);
  const source = mutableChildren(payload, sourceParentPath, false);
  const destination = mutableChildren(payload, destinationParentPath, false);
  if (!source || !destination || oldIndex < 0 || oldIndex >= source.length)
    return undefined;
  const [item] = source.splice(oldIndex, 1);
  destination.splice(clampIndex(newIndex, destination.length), 0, item);
  if (!samePath(sourceParentPath, destinationParentPath))
    removeEmptyParent(payload, sourceParentPath);
  return payload as DiscordMessagePayload;
}

function capacityShape(kind: Exclude<ComponentKind, "unknown">) {
  const type = componentDefinition(kind)?.type;
  if (type === undefined) return {};
  return kind === "section" ? { type, components: [{ type: 10 }] } : { type };
}

function atPath(value: unknown, path: ComponentPath): unknown {
  return path.reduce<unknown>((current, key) => {
    if (Array.isArray(current) && typeof key === "number") return current[key];
    if (isRecord(current) && typeof key === "string") return current[key];
    return undefined;
  }, value);
}

function arrayValue(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampIndex(index: number | undefined, length: number) {
  if (index === undefined) return length;
  return Math.max(0, Math.min(index, length));
}

/** Action Rows cannot be left empty. Sections retain their accessory while temporarily incomplete. */
function removeEmptyParent(
  payload: Record<string, unknown>,
  childrenPath: ComponentPath,
) {
  const parentPath =
    childrenPath.at(-1) === "components"
      ? childrenPath.slice(0, -1)
      : childrenPath;
  const parent = atPath(payload, parentPath);
  if (
    !isRecord(parent) ||
    !Array.isArray(parent.components) ||
    parent.components.length > 0 ||
    componentKind(parent) !== "actionRow"
  )
    return;
  const index = parentPath.at(-1);
  const siblings = atPath(payload, parentPath.slice(0, -1));
  if (typeof index === "number" && Array.isArray(siblings))
    siblings.splice(index, 1);
}

function samePath(a: ComponentPath, b: ComponentPath) {
  return a.length === b.length && a.every((part, index) => part === b[index]);
}

/** Copies must not collide with explicit Discord component ids already in the message. */
function refreshCopiedIdentities(value: Record<string, unknown>) {
  delete value.id;
  if (typeof value.custom_id === "string")
    value.custom_id = `${value.custom_id.slice(0, 86)}_${Math.random().toString(36).slice(2, 9)}`;
  if (Array.isArray(value.components))
    value.components.forEach((child) => {
      if (isRecord(child)) refreshCopiedIdentities(child);
    });
  if (isRecord(value.accessory)) refreshCopiedIdentities(value.accessory);
}

function accepted(document: DiscordMessagePayload): MutationResult {
  return { ok: true, document };
}

function documentFrom(result: MutationResult, fallback: DiscordMessagePayload) {
  return result.ok ? result.document : fallback;
}

function rejected(
  code: string,
  fallback: string,
  path?: ComponentPath,
  values: Readonly<Record<string, string | number>> = {},
): MutationResult {
  const shared = i18n.t(`editor.validation.${code}`, {
    defaultValue: fallback,
    ...values,
  });
  return {
    ok: false,
    code,
    reason: i18n.t(`editor.mutations.${code}`, {
      defaultValue: shared,
      ...values,
    }),
    path,
  };
}

function componentDefinitionName(kind: ComponentKind) {
  return kind === "unknown"
    ? i18n.t("editor.unsupportedComponent")
    : i18n.t(`editor.components.${kind}`);
}

function acceptHardLimits(document: DiscordMessagePayload): MutationResult {
  const issue = validateMessage(document).find(
    (value) => value.level === "error" && hardLimitCodes.has(value.code),
  );
  return issue
    ? rejected(issue.code, issue.message, issue.path)
    : accepted(document);
}

const hardLimitCodes = new Set([
  "v2ComponentLimit",
  "legacyRowLimit",
  "actionRowChildrenMax",
  "sectionChildrenMax",
  "customIdLimit",
  "buttonLabelLimit",
  "selectPlaceholderLimit",
  "selectMax",
  "stringSelectOptionsMax",
  "galleryItemsMax",
  "contentLimit",
  "embedCount",
  "embedPropertyLimit",
  "embedAuthorLimit",
  "embedFooterLimit",
  "embedFieldsCount",
  "embedFieldName",
  "embedFieldValue",
  "embedTextLimit",
  "stickerLimit",
  "attachmentDescriptionLimit",
  "nonceLimit",
  "mentionUsersLimit",
  "mentionRolesLimit",
  "pollAnswersMax",
  "pollDuration",
]);
