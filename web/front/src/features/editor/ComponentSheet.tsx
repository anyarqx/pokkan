import { Sheet } from "./Sheet";
import { EmojiInput } from "./QuickControls";
import { messageFormat } from "../kits/domain";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DiscordMessagePayload } from "../kits/domain";
import { componentKind, componentLabel, type ComponentPath } from "./schema";
import { nodeAt } from "./tree";
import { useSortableItems } from "./useSortableItems";

interface ChangeActions {
  beginEdit(): void;
  endEdit(): void;
  updateNode(
    path: ComponentPath,
    field: string,
    value: unknown,
    editing?: boolean,
  ): void;
  updateMessage(field: string, value: unknown, editing?: boolean): void;
}

export function ComponentSheet(
  props: Readonly<{
    document: DiscordMessagePayload;
    path?: ComponentPath;
    actions: ChangeActions;
    close(): void;
  }>,
) {
  const { t } = useTranslation();
  const node = props.path ? nodeAt(props.document, props.path) : undefined;
  if (!node || !props.path) return null;
  const kind = componentKind(node);

  return (
    <Sheet
      title={t(`editor.components.${kind}`, {
        defaultValue: componentLabel(node),
      })}
      close={props.close}
      className={
        kind === "container" || kind === "thumbnail" || kind === "file"
          ? "compact-component-sheet"
          : undefined
      }
    >
      {kind === "unknown" ? <RawNode value={node} /> : null}
      {kind !== "unknown" ? (
        <NumberField
          actions={props.actions}
          field="id"
          label={t("editor.componentId")}
          max={2_147_483_647}
          min={0}
          path={props.path}
          value={node.id}
        />
      ) : null}
      {kind === "button" ? (
        <ButtonFields actions={props.actions} node={node} path={props.path} />
      ) : null}
      {isSelect(kind) ? (
        <SelectFields
          actions={props.actions}
          kind={kind}
          node={node}
          path={props.path}
        />
      ) : null}
      {kind === "thumbnail" ? (
        <InputField
          actions={props.actions}
          field="description"
          label={t("editor.description")}
          path={props.path}
          value={stringValue(node.description)}
          maxLength={1_024}
        />
      ) : null}
      {kind === "mediaGallery" ? (
        <GalleryFields
          actions={props.actions}
          path={props.path}
          value={node.items}
        />
      ) : null}
      {kind === "separator" ? (
        <>
          <Toggle
            actions={props.actions}
            field="divider"
            label={t("editor.showDivider")}
            path={props.path}
            value={node.divider !== false}
          />
          <Field label={t("editor.spacing")}>
            <div className="choice-row">
              <Choice
                active={numberValue(node.spacing, 1) === 1}
                onClick={() =>
                  props.actions.updateNode(props.path!, "spacing", 1)
                }
              >
                {t("editor.small")}
              </Choice>
              <Choice
                active={numberValue(node.spacing, 1) === 2}
                onClick={() =>
                  props.actions.updateNode(props.path!, "spacing", 2)
                }
              >
                {t("editor.large")}
              </Choice>
            </div>
          </Field>
        </>
      ) : null}
    </Sheet>
  );
}

export function MessageSettingsSheet(
  props: Readonly<{
    document: DiscordMessagePayload;
    actions: ChangeActions;
    close(): void;
  }>,
) {
  const { t } = useTranslation();
  const payload = props.document as Record<string, unknown>;
  const flags = numberValue(
    payload.flags,
    messageFormat(props.document) === "componentsV2" ? 1 << 15 : 0,
  );
  return (
    <Sheet title={t("editor.messageSettings")} close={props.close}>
      <Toggle
        actions={props.actions}
        field="tts"
        label={t("editor.textToSpeech")}
        message
        value={Boolean(payload.tts)}
      />
      <Toggle
        actions={props.actions}
        field="flags"
        label={t("editor.suppressEmbeds")}
        message
        value={(flags & (1 << 2)) !== 0}
        onToggle={(value) =>
          props.actions.updateMessage(
            "flags",
            value ? flags | (1 << 2) : flags & ~(1 << 2),
          )
        }
      />
      <Toggle
        actions={props.actions}
        field="flags"
        label={t("editor.suppressNotifications")}
        message
        value={(flags & (1 << 12)) !== 0}
        onToggle={(value) =>
          props.actions.updateMessage(
            "flags",
            value ? flags | (1 << 12) : flags & ~(1 << 12),
          )
        }
      />
      <AllowedMentionsField
        actions={props.actions}
        value={payload.allowed_mentions}
      />
      <MessageInputField
        actions={props.actions}
        field="nonce"
        label={t("editor.nonce")}
        maxLength={25}
        value={stringValue(payload.nonce)}
      />
      <Toggle
        actions={props.actions}
        field="enforce_nonce"
        label={t("editor.enforceNonce")}
        message
        value={Boolean(payload.enforce_nonce)}
      />
      {messageFormat(props.document) === "legacy" ? (
        <>
          <StickerIdsField
            actions={props.actions}
            value={payload.sticker_ids}
          />
          <JsonField
            actions={props.actions}
            field="shared_client_theme"
            label={t("editor.sharedClientTheme")}
            value={payload.shared_client_theme}
          />
        </>
      ) : null}
    </Sheet>
  );
}

/** A reply is part of the visual message flow, rather than a generic payload setting. */
export function MessageReferenceSheet(
  props: Readonly<{
    document: DiscordMessagePayload;
    actions: ChangeActions;
    close(): void;
  }>,
) {
  const { t } = useTranslation();
  const mentions = isRecord(props.document.allowed_mentions)
    ? props.document.allowed_mentions
    : {};
  const setRepliedUser = (checked: boolean) => {
    const next = { ...mentions, replied_user: checked || undefined };
    const compact = Object.fromEntries(
      Object.entries(next).filter(
        ([, value]) =>
          value !== undefined && (!Array.isArray(value) || value.length),
      ),
    );
    props.actions.updateMessage(
      "allowed_mentions",
      Object.keys(compact).length ? compact : undefined,
    );
  };
  return (
    <Sheet title={t("editor.reply")} close={props.close}>
      <MessageReferenceField
        actions={props.actions}
        value={props.document.message_reference}
      />
      <label className="switch-field">
        <span>{t("editor.mentionRepliedUser")}</span>
        <input
          checked={Boolean(mentions.replied_user)}
          onChange={(event) => setRepliedUser(event.target.checked)}
          type="checkbox"
        />
      </label>
    </Sheet>
  );
}

/** Contextual settings for a Legacy embed; title, description and fields stay on the visual canvas. */
export function LegacyEmbedSheet(
  props: Readonly<{
    document: DiscordMessagePayload;
    index?: number;
    actions: Pick<ChangeActions, "beginEdit" | "endEdit" | "updateMessage">;
    close(): void;
  }>,
) {
  const { t } = useTranslation();
  const payload = props.document as Record<string, unknown>;
  const embeds = Array.isArray(payload.embeds)
    ? payload.embeds.filter(isRecord)
    : [];
  const embed = props.index === undefined ? undefined : embeds[props.index];
  if (!embed || props.index === undefined) return null;

  const update = (next: Record<string, unknown>, editing = false) =>
    props.actions.updateMessage(
      "embeds",
      embeds.map((item, index) =>
        index === props.index ? { ...item, ...next } : item,
      ),
      editing,
    );
  const object = (field: string) =>
    isRecord(embed[field]) ? (embed[field] as Record<string, unknown>) : {};
  const patchObject = (field: string, key: string, value: string) => {
    const next = { ...object(field), [key]: value || undefined };
    const compact = Object.fromEntries(
      Object.entries(next).filter(
        ([, item]) => item !== undefined && item !== "",
      ),
    );
    update(
      { [field]: Object.keys(compact).length ? compact : undefined },
      true,
    );
  };
  const input = (
    label: string,
    value: string,
    change: (next: string) => void,
    maxLength?: number,
  ) => (
    <Field label={label}>
      <input
        maxLength={maxLength}
        onBlur={() => props.actions.endEdit()}
        onChange={(event) => change(event.target.value)}
        onFocus={() => props.actions.beginEdit()}
        value={value}
      />
    </Field>
  );

  return (
    <Sheet title={t("editor.embedSettings")} close={props.close}>
      <div className="sheet-group">
        <div className="sheet-group-head">
          <span>{t("editor.author")}</span>
        </div>
        {input(
          t("editor.name"),
          stringValue(object("author").name),
          (value) => patchObject("author", "name", value),
          256,
        )}
        {input(t("editor.url"), stringValue(object("author").url), (value) =>
          patchObject("author", "url", value),
        )}
        {input(
          t("editor.iconUrl"),
          stringValue(object("author").icon_url),
          (value) => patchObject("author", "icon_url", value),
        )}
      </div>
      <div className="sheet-group">
        <div className="sheet-group-head">
          <span>{t("editor.footer")}</span>
        </div>
        {input(
          t("editor.text"),
          stringValue(object("footer").text),
          (value) => patchObject("footer", "text", value),
          2_048,
        )}
        {input(
          t("editor.iconUrl"),
          stringValue(object("footer").icon_url),
          (value) => patchObject("footer", "icon_url", value),
        )}
      </div>
      {input(t("editor.embedUrl"), stringValue(embed.url), (value) =>
        update({ url: value || undefined }, true),
      )}
      {input(t("editor.timestamp"), stringValue(embed.timestamp), (value) =>
        update({ timestamp: value || undefined }, true),
      )}
    </Sheet>
  );
}

function ButtonFields({
  actions,
  node,
  path,
}: Readonly<{
  actions: ChangeActions;
  node: Record<string, unknown>;
  path: ComponentPath;
}>) {
  const { t } = useTranslation();
  const style = numberValue(node.style, 1);
  return (
    <>
      {style < 5 ? (
        <InputField
          actions={actions}
          field="custom_id"
          label={t("editor.customId")}
          path={path}
          value={stringValue(node.custom_id)}
          maxLength={100}
        />
      ) : null}
      {style === 5 ? (
        <InputField
          actions={actions}
          field="url"
          label={t("editor.url")}
          path={path}
          value={stringValue(node.url)}
          maxLength={512}
        />
      ) : null}
      {style === 6 ? (
        <InputField
          actions={actions}
          field="sku_id"
          label={t("editor.skuId")}
          path={path}
          value={stringValue(node.sku_id)}
        />
      ) : null}
    </>
  );
}

function SelectFields({
  actions,
  kind,
  node,
  path,
}: Readonly<{
  actions: ChangeActions;
  kind: string;
  node: Record<string, unknown>;
  path: ComponentPath;
}>) {
  const { t } = useTranslation();
  return (
    <>
      <InputField
        actions={actions}
        field="custom_id"
        label={t("editor.customId")}
        path={path}
        value={stringValue(node.custom_id)}
        maxLength={100}
      />
      <NumberField
        actions={actions}
        field="min_values"
        label={t("editor.minimumSelections")}
        max={25}
        min={1}
        path={path}
        value={node.min_values}
      />
      <NumberField
        actions={actions}
        field="max_values"
        label={t("editor.maximumSelections")}
        max={25}
        min={1}
        path={path}
        value={node.max_values}
      />
      {kind === "channelSelect" ? (
        <JsonField
          actions={actions}
          field="channel_types"
          label={t("editor.channelTypes")}
          node
          path={path}
          value={node.channel_types}
        />
      ) : null}
      {kind !== "stringSelect" ? (
        <DefaultValuesField
          actions={actions}
          kind={kind}
          max={numberValue(node.max_values, 1)}
          path={path}
          value={node.default_values}
        />
      ) : null}
      <Toggle
        actions={actions}
        field="disabled"
        label={t("editor.disabled")}
        path={path}
        value={Boolean(node.disabled)}
      />
      {kind === "stringSelect" ? (
        <StringOptionsField
          actions={actions}
          path={path}
          value={node.options}
        />
      ) : null}
    </>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="sheet-field">
      <span>{label}</span>
      {children}
    </div>
  );
}
function Choice({
  active,
  children,
  onClick,
}: Readonly<{ active: boolean; children: ReactNode; onClick(): void }>) {
  return (
    <button aria-pressed={active} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function InputField({
  actions,
  path,
  field,
  label,
  value,
  maxLength,
}: Readonly<{
  actions: ChangeActions;
  path: ComponentPath;
  field: string;
  label: string;
  value: string;
  maxLength?: number;
}>) {
  return (
    <Field label={label}>
      <input
        maxLength={maxLength}
        onBlur={() => actions.endEdit()}
        onChange={(event) =>
          actions.updateNode(path, field, event.target.value, true)
        }
        onFocus={() => actions.beginEdit()}
        value={value}
      />
    </Field>
  );
}

function MessageInputField({
  actions,
  field,
  label,
  value,
  maxLength,
}: Readonly<{
  actions: ChangeActions;
  field: string;
  label: string;
  value: string;
  maxLength?: number;
}>) {
  return (
    <Field label={label}>
      <input
        maxLength={maxLength}
        onBlur={() => actions.endEdit()}
        onChange={(event) =>
          actions.updateMessage(field, event.target.value || undefined, true)
        }
        onFocus={() => actions.beginEdit()}
        value={value}
      />
    </Field>
  );
}

function AllowedMentionsField({
  actions,
  value,
}: Readonly<{ actions: ChangeActions; value: unknown }>) {
  const { t } = useTranslation();
  const mentions = isRecord(value) ? value : {};
  const parse = Array.isArray(mentions.parse)
    ? mentions.parse.filter((item): item is string => typeof item === "string")
    : [];
  const users = Array.isArray(mentions.users)
    ? mentions.users.filter((item): item is string => typeof item === "string")
    : [];
  const roles = Array.isArray(mentions.roles)
    ? mentions.roles.filter((item): item is string => typeof item === "string")
    : [];
  const update = (next: Record<string, unknown>, editing = false) => {
    const compact = Object.fromEntries(
      Object.entries(next).filter(
        ([, item]) =>
          item !== undefined && (!Array.isArray(item) || item.length),
      ),
    );
    actions.updateMessage(
      "allowed_mentions",
      Object.keys(compact).length ? compact : undefined,
      editing,
    );
  };
  const toggleParse = (
    kind: "users" | "roles" | "everyone",
    checked: boolean,
  ) => {
    const nextParse = checked
      ? [...new Set([...parse, kind])]
      : parse.filter((item) => item !== kind);
    update({
      ...mentions,
      parse: nextParse,
      ...(kind === "users" && checked ? { users: undefined } : {}),
      ...(kind === "roles" && checked ? { roles: undefined } : {}),
    });
  };
  const ids = (kind: "users" | "roles", raw: string) => {
    const values = raw.split(/[\s,]+/).filter(Boolean);
    update(
      {
        ...mentions,
        [kind]: values,
        parse: parse.filter((item) => item !== kind),
      },
      true,
    );
  };

  return (
    <div className="sheet-group">
      <div className="sheet-group-head">
        <span>{t("editor.allowedMentions")}</span>
      </div>
      <div className="mention-toggles">
        <Toggle
          actions={actions}
          field="parse-users"
          label={t("editor.allUsers")}
          message
          onToggle={(checked) => toggleParse("users", checked)}
          value={parse.includes("users")}
        />
        <Toggle
          actions={actions}
          field="parse-roles"
          label={t("editor.allRoles")}
          message
          onToggle={(checked) => toggleParse("roles", checked)}
          value={parse.includes("roles")}
        />
        <Toggle
          actions={actions}
          field="parse-everyone"
          label={t("editor.everyoneAndHere")}
          message
          onToggle={(checked) => toggleParse("everyone", checked)}
          value={parse.includes("everyone")}
        />
      </div>
      {!parse.includes("users") ? (
        <Field label={t("editor.specificUserIds")}>
          <input
            aria-label={t("editor.specificUserIds")}
            onBlur={() => actions.endEdit()}
            onChange={(event) => ids("users", event.target.value)}
            onFocus={() => actions.beginEdit()}
            placeholder={t("editor.discordIdsPlaceholder")}
            value={users.join(", ")}
          />
          <small>{t("editor.idsHint")}</small>
        </Field>
      ) : null}
      {!parse.includes("roles") ? (
        <Field label={t("editor.specificRoleIds")}>
          <input
            aria-label={t("editor.specificRoleIds")}
            onBlur={() => actions.endEdit()}
            onChange={(event) => ids("roles", event.target.value)}
            onFocus={() => actions.beginEdit()}
            placeholder={t("editor.discordIdsPlaceholder")}
            value={roles.join(", ")}
          />
          <small>{t("editor.idsHint")}</small>
        </Field>
      ) : null}
    </div>
  );
}

function MessageReferenceField({
  actions,
  value,
}: Readonly<{ actions: ChangeActions; value: unknown }>) {
  const { t } = useTranslation();
  const reference = isRecord(value) ? value : undefined;
  if (!reference)
    return (
      <Field label={t("editor.messageReference")}>
        <button
          className="button quiet"
          onClick={() =>
            actions.updateMessage("message_reference", {
              type: 0,
              message_id: "",
              fail_if_not_exists: true,
            })
          }
          type="button"
        >
          {t("editor.addReplyOrForward")}
        </button>
      </Field>
    );
  const type = reference.type === 1 ? 1 : 0;
  const patch = (change: Record<string, unknown>, editing = false) =>
    actions.updateMessage(
      "message_reference",
      { ...reference, ...change },
      editing,
    );
  return (
    <div className="sheet-group">
      <div className="sheet-group-head">
        <span>{t("editor.messageReference")}</span>
        <button
          className="danger-icon"
          onClick={() => actions.updateMessage("message_reference", undefined)}
          type="button"
        >
          <Trash2 aria-hidden="true" size={15} /> {t("editor.remove")}
        </button>
      </div>
      <Field label={t("editor.kind")}>
        <select
          onChange={(event) =>
            patch({
              type: Number(event.target.value),
              ...(event.target.value === "0" ? { channel_id: undefined } : {}),
            })
          }
          value={type}
        >
          <option value={0}>{t("editor.reply")}</option>
          <option value={1}>{t("editor.forward")}</option>
        </select>
      </Field>
      <MessageReferenceInput
        actions={actions}
        label={t("editor.messageId")}
        name="message_id"
        patch={patch}
        value={stringValue(reference.message_id)}
      />
      {type === 1 ? (
        <MessageReferenceInput
          actions={actions}
          label={t("editor.channelId")}
          name="channel_id"
          patch={patch}
          value={stringValue(reference.channel_id)}
        />
      ) : null}
      <MessageReferenceInput
        actions={actions}
        label={t("editor.guildId")}
        name="guild_id"
        patch={patch}
        value={stringValue(reference.guild_id)}
        optional
      />
      <Toggle
        actions={actions}
        field="fail_if_not_exists"
        label={t("editor.failIfMissing")}
        message
        onToggle={(checked) => patch({ fail_if_not_exists: checked })}
        value={reference.fail_if_not_exists !== false}
      />
    </div>
  );
}

function MessageReferenceInput({
  actions,
  label,
  name,
  patch,
  value,
  optional,
}: Readonly<{
  actions: ChangeActions;
  label: string;
  name: string;
  patch(change: Record<string, unknown>, editing?: boolean): void;
  value: string;
  optional?: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <Field label={label}>
      <input
        aria-label={label}
        onBlur={() => actions.endEdit()}
        onChange={(event) =>
          patch(
            { [name]: event.target.value || (optional ? undefined : "") },
            true,
          )
        }
        onFocus={() => actions.beginEdit()}
        placeholder={
          optional ? t("editor.optionalDiscordId") : t("editor.discordId")
        }
        value={value}
      />
    </Field>
  );
}

function StickerIdsField({
  actions,
  value,
}: Readonly<{ actions: ChangeActions; value: unknown }>) {
  const { t } = useTranslation();
  const ids = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  const update = (next: readonly string[], editing = false) =>
    actions.updateMessage(
      "sticker_ids",
      next.length ? next : undefined,
      editing,
    );
  return (
    <div className="sheet-group">
      <div className="sheet-group-head">
        <span>{t("editor.stickers")}</span>
        <button
          disabled={ids.length >= 3}
          onClick={() => update([...ids, ""])}
          type="button"
        >
          <Plus size={15} /> {t("editor.addSticker")}
        </button>
      </div>
      {ids.length ? (
        ids.map((id, index) => (
          <div className="sticker-row" key={index}>
            <input
              aria-label={t("editor.stickerIdAt", { index: index + 1 })}
              onBlur={() => actions.endEdit()}
              onChange={(event) =>
                update(
                  ids.map((item, current) =>
                    current === index ? event.target.value : item,
                  ),
                  true,
                )
              }
              onFocus={() => actions.beginEdit()}
              placeholder={t("editor.stickerId")}
              value={id}
            />
            <button
              aria-label={t("editor.removeStickerAt", { index: index + 1 })}
              className="danger-icon"
              onClick={() =>
                update(ids.filter((_, current) => current !== index))
              }
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))
      ) : (
        <small className="field-helper">{t("editor.stickerHint")}</small>
      )}
    </div>
  );
}

function NumberField({
  actions,
  path,
  field,
  label,
  value,
  min,
  max,
}: Readonly<{
  actions: ChangeActions;
  path: ComponentPath;
  field: string;
  label: string;
  value: unknown;
  min: number;
  max: number;
}>) {
  const { t } = useTranslation();
  return (
    <Field label={label}>
      <input
        max={max}
        min={min}
        onChange={(event) =>
          actions.updateNode(
            path,
            field,
            event.target.value === "" ? undefined : Number(event.target.value),
          )
        }
        type="number"
        value={typeof value === "number" ? value : ""}
      />
      <small>{t("editor.discordDefaultHint")}</small>
    </Field>
  );
}

function Toggle({
  actions,
  path,
  field,
  label,
  value,
  message,
  onToggle,
}: Readonly<{
  actions: ChangeActions;
  path?: ComponentPath;
  field: string;
  label: string;
  value: boolean;
  message?: boolean;
  onToggle?: (value: boolean) => void;
}>) {
  const update = (checked: boolean) =>
    onToggle?.(checked) ??
    (message
      ? actions.updateMessage(field, checked)
      : path
        ? actions.updateNode(path, field, checked)
        : undefined);
  return (
    <label className="switch-field">
      <span>{label}</span>
      <input
        checked={value}
        onChange={(event) => update(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function GalleryFields({
  actions,
  path,
  value,
}: Readonly<{ actions: ChangeActions; path: ComponentPath; value: unknown }>) {
  const { t } = useTranslation();
  const items = Array.isArray(value) ? value.filter(isRecord) : [];
  const update = (next: readonly Record<string, unknown>[], editing = false) =>
    actions.updateNode(path, "items", next, editing);
  const repeater = repeaterActions(items, update);
  const list = useSortableItems({
    item: ".gallery-item",
    handle: ".gallery-item-handle",
    onMove: repeater.moveAt,
  });
  return (
    <div className="sheet-group">
      <div className="sheet-group-head">
        <span>{t("editor.galleryItems")}</span>
        <button
          disabled={items.length >= 10}
          onClick={() => update([...items, { media: { url: "" } }])}
          type="button"
        >
          <Plus size={15} /> {t("editor.addItem")}
        </button>
      </div>
      <div className="sortable-repeater-list" ref={list}>
        {items.map((item, index) => {
          return (
            <div
              className="repeater gallery-item"
              data-index={index}
              key={index}
            >
              <header>
                <span>{t("editor.itemAt", { index: index + 1 })}</span>
                <div>
                  <button
                    aria-label={t("editor.dragGalleryItem")}
                    className="repeater-drag gallery-item-handle"
                    type="button"
                  >
                    <GripVertical size={15} />
                  </button>
                  <button
                    aria-label={t("editor.moveItemUp")}
                    disabled={index === 0}
                    onClick={() => repeater.move(index, -1)}
                    type="button"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    aria-label={t("editor.moveItemDown")}
                    disabled={index === items.length - 1}
                    onClick={() => repeater.move(index, 1)}
                    type="button"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    aria-label={t("editor.deleteItem")}
                    className="danger-icon"
                    onClick={() => repeater.remove(index)}
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </header>
              <InputField
                actions={{
                  ...actions,
                  updateNode: (_path, _field, text, editing) =>
                    repeater.patch(index, { description: text }, editing),
                }}
                field="description"
                label={t("editor.description")}
                path={path}
                value={stringValue(item.description)}
                maxLength={1_024}
              />
            </div>
          );
        })}
      </div>
      <small className="field-helper">{t("editor.galleryHint")}</small>
    </div>
  );
}

function StringOptionsField({
  actions,
  path,
  value,
}: Readonly<{ actions: ChangeActions; path: ComponentPath; value: unknown }>) {
  const { t } = useTranslation();
  const options = Array.isArray(value) ? value.filter(isRecord) : [];
  const update = (next: readonly Record<string, unknown>[], editing = false) =>
    actions.updateNode(path, "options", next, editing);
  const repeater = repeaterActions(options, update);
  const list = useSortableItems({
    item: ".select-option",
    handle: ".select-option-handle",
    onMove: repeater.moveAt,
  });
  return (
    <div className="sheet-group">
      <div className="sheet-group-head">
        <span>{t("editor.options")}</span>
        <button
          disabled={options.length >= 25}
          onClick={() =>
            update([
              ...options,
              {
                label: t("editor.option"),
                value: `option_${options.length + 1}`,
              },
            ])
          }
          type="button"
        >
          <Plus size={15} /> {t("editor.addOption")}
        </button>
      </div>
      <div className="sortable-repeater-list" ref={list}>
        {options.map((option, index) => (
          <div
            className="repeater select-option"
            data-index={index}
            key={index}
          >
            <header>
              <span>{t("editor.optionAt", { index: index + 1 })}</span>
              <div>
                <button
                  aria-label={t("editor.dragOption")}
                  className="repeater-drag select-option-handle"
                  type="button"
                >
                  <GripVertical size={15} />
                </button>
                <button
                  aria-label={t("editor.moveOptionUp")}
                  disabled={index === 0}
                  onClick={() => repeater.move(index, -1)}
                  type="button"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  aria-label={t("editor.moveOptionDown")}
                  disabled={index === options.length - 1}
                  onClick={() => repeater.move(index, 1)}
                  type="button"
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  aria-label={t("editor.deleteOption")}
                  className="danger-icon"
                  onClick={() => repeater.remove(index)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </header>
            <Field label={t("editor.label")}>
              <input
                maxLength={100}
                onBlur={() => actions.endEdit()}
                onChange={(event) =>
                  repeater.patch(index, { label: event.target.value }, true)
                }
                onFocus={() => actions.beginEdit()}
                value={stringValue(option.label)}
              />
            </Field>
            <Field label={t("editor.value")}>
              <input
                maxLength={100}
                onBlur={() => actions.endEdit()}
                onChange={(event) =>
                  repeater.patch(index, { value: event.target.value }, true)
                }
                onFocus={() => actions.beginEdit()}
                value={stringValue(option.value)}
              />
            </Field>
            <Field label={t("editor.description")}>
              <input
                maxLength={100}
                onBlur={() => actions.endEdit()}
                onChange={(event) =>
                  repeater.patch(
                    index,
                    { description: event.target.value || undefined },
                    true,
                  )
                }
                onFocus={() => actions.beginEdit()}
                value={stringValue(option.description)}
              />
            </Field>
            <EmojiInput
              value={option.emoji}
              change={(emoji) => repeater.patch(index, { emoji })}
            />
            <Toggle
              actions={{
                ...actions,
                updateNode: (_path, _field, checked, editing) =>
                  repeater.patch(index, { default: checked }, editing),
              }}
              field="default"
              label={t("editor.selectedByDefault")}
              path={path}
              value={Boolean(option.default)}
            />
          </div>
        ))}
      </div>
      <small className="field-helper">{t("editor.optionsHint")}</small>
    </div>
  );
}

function repeaterActions<T extends Record<string, unknown>>(
  items: readonly T[],
  update: (next: readonly T[], editing?: boolean) => void,
) {
  const moveAt = (oldIndex: number, newIndex: number) => {
    if (
      oldIndex < 0 ||
      newIndex < 0 ||
      oldIndex >= items.length ||
      newIndex >= items.length ||
      oldIndex === newIndex
    )
      return;
    const next = [...items];
    const [item] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, item!);
    update(next);
  };
  return {
    patch: (index: number, change: Partial<T>, editing = false) =>
      update(
        items.map((item, current) =>
          current === index ? { ...item, ...change } : item,
        ),
        editing,
      ),
    remove: (index: number) =>
      update(items.filter((_, current) => current !== index)),
    moveAt,
    move: (index: number, direction: -1 | 1) =>
      moveAt(index, index + direction),
  };
}

function DefaultValuesField({
  actions,
  kind,
  path,
  value,
  max,
}: Readonly<{
  actions: ChangeActions;
  kind: string;
  path: ComponentPath;
  value: unknown;
  max: number;
}>) {
  const { t } = useTranslation();
  const values = Array.isArray(value) ? value.filter(isRecord) : [];
  const types = defaultValueTypes(kind);
  const limit = Math.max(1, Math.min(25, max));
  const update = (next: readonly Record<string, unknown>[], editing = false) =>
    actions.updateNode(
      path,
      "default_values",
      next.length ? next : undefined,
      editing,
    );
  const patch = (
    index: number,
    change: Record<string, unknown>,
    editing = false,
  ) =>
    update(
      values.map((item, current) =>
        current === index ? { ...item, ...change } : item,
      ),
      editing,
    );
  return (
    <div className="sheet-group">
      <div className="sheet-group-head">
        <span>{t("editor.defaultValues")}</span>
        <button
          disabled={values.length >= limit}
          onClick={() => update([...values, { id: "", type: types[0] }])}
          type="button"
        >
          <Plus size={15} /> {t("editor.addValue")}
        </button>
      </div>
      {values.map((item, index) => (
        <div className="default-value-row" key={index}>
          <input
            aria-label={t("editor.defaultValueIdAt", { index: index + 1 })}
            onBlur={() => actions.endEdit()}
            onChange={(event) => patch(index, { id: event.target.value }, true)}
            onFocus={() => actions.beginEdit()}
            placeholder={t("editor.discordId")}
            value={stringValue(item.id)}
          />
          <select
            aria-label={t("editor.defaultValueTypeAt", { index: index + 1 })}
            onChange={(event) => patch(index, { type: event.target.value })}
            value={
              types.includes(stringValue(item.type))
                ? stringValue(item.type)
                : types[0]
            }
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {t(`editor.entityTypes.${type}`)}
              </option>
            ))}
          </select>
          <button
            aria-label={t("editor.removeDefaultValueAt", { index: index + 1 })}
            className="danger-icon"
            onClick={() =>
              update(values.filter((_, current) => current !== index))
            }
            type="button"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <small className="field-helper">{t("editor.defaultValuesHint")}</small>
    </div>
  );
}

function JsonField({
  actions,
  field,
  label,
  value,
  node,
  path,
}: Readonly<{
  actions: ChangeActions;
  field: string;
  label: string;
  value: unknown;
  node?: boolean;
  path?: ComponentPath;
}>) {
  const { t } = useTranslation();
  const serialized = value === undefined ? "" : JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(serialized);
  }, [focused, serialized]);
  const apply = (next: string) => {
    setDraft(next);
    if (!next.trim()) {
      setInvalid(false);
      node && path
        ? actions.updateNode(path, field, undefined, true)
        : actions.updateMessage(field, undefined, true);
      return;
    }
    try {
      const parsed = JSON.parse(next);
      setInvalid(false);
      node && path
        ? actions.updateNode(path, field, parsed, true)
        : actions.updateMessage(field, parsed, true);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <Field label={label}>
      <textarea
        aria-invalid={invalid}
        onBlur={() => {
          setFocused(false);
          actions.endEdit();
        }}
        onChange={(event) => apply(event.target.value)}
        onFocus={() => {
          setFocused(true);
          actions.beginEdit();
        }}
        placeholder="{}"
        value={draft}
      />
      <small>
        {invalid ? t("editor.invalidJsonHint") : t("editor.validJsonHint")}
      </small>
    </Field>
  );
}

function RawNode({ value }: Readonly<{ value: unknown }>) {
  const { t } = useTranslation();
  return (
    <Field label={t("editor.rawJson")}>
      <textarea readOnly value={JSON.stringify(value, null, 2)} />
    </Field>
  );
}

function isSelect(kind: string) {
  return [
    "stringSelect",
    "userSelect",
    "roleSelect",
    "mentionableSelect",
    "channelSelect",
  ].includes(kind);
}
function defaultValueTypes(kind: string) {
  return kind === "userSelect"
    ? ["user"]
    : kind === "roleSelect"
      ? ["role"]
      : kind === "channelSelect"
        ? ["channel"]
        : ["user", "role"];
}
function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}
function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
