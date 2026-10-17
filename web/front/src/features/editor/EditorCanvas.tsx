import { messageFormat } from "../kits/domain";
import {
  Box,
  Ban,
  CheckSquare2,
  ChevronDown,
  CircleDot,
  Code2,
  Copy,
  Eye,
  EyeOff,
  File,
  FileText,
  GripVertical,
  ExternalLink,
  Image,
  LayoutPanelTop,
  ListChecks,
  Menu,
  MoreHorizontal,
  PanelTop,
  RefreshCw,
  Plus,
  Reply,
  Rows3,
  SeparatorHorizontal,
  Settings2,
  Trash2,
  Type,
  UserRound,
} from "lucide-react";
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import type { DiscordMessagePayload } from "../kits/domain";
import {
  componentDefinition,
  componentKind,
  componentLabel,
  sendableComponentCount,
  type ComponentKind,
  type ComponentPath,
  type EditorIssue,
} from "./schema";
import {
  CanvasIssues,
  IssueFeedback,
  useDiagnosticProps,
} from "./CanvasIssues";
import {
  allowedInsertions,
  allowedSectionAccessories,
  canDuplicateComponent,
  canPasteComponent,
  canRemoveComponent,
  childNodes,
  indexInParent,
  nodeAt,
  parentNodePath,
  pathForChild,
  pathKey,
} from "./tree";
import { useSortableList } from "./useSortableList";
import { type Placeholder } from "./placeholders";
import { Emoji } from "./Emoji";
import {
  ButtonStyleControl,
  QuickColor,
  QuickEmoji,
  colorHex,
} from "./QuickControls";
import { InlineField } from "./InlineField";
import {
  ServerReferencesContext,
  type ServerReference,
} from "./serverReferences";
import {
  PlaceholderContext,
  PlaceholderPreviewContext,
  ReadOnlyContext,
  InteractionContext,
  type InteractionState,
} from "./CanvasContext";
import { LegacyCanvas } from "./LegacyCanvas";
import { RemoteMedia } from "./RemoteMedia";
import { MediaAddressPopover } from "./MediaAddressPopover";
import { FloatingSurface } from "../../shared/FloatingSurface";
import { isSafeLink } from "../../shared/urls";

export interface CanvasActions {
  readonly selectedPath?: ComponentPath;
  readonly clipboard?: unknown;
  select(path?: ComponentPath): void;
  beginEdit(): void;
  endEdit(): void;
  updateNode(
    path: ComponentPath,
    field: string,
    value: unknown,
    editing?: boolean,
  ): void;
  updateMessage(field: string, value: unknown, editing?: boolean): void;
  setButtonStyle(path: ComponentPath, style: number): void;
  add(
    parentPath: ComponentPath,
    kind: Exclude<ComponentKind, "unknown">,
    index?: number,
  ): void;
  setSectionAccessory(path: ComponentPath, kind: "thumbnail" | "button"): void;
  addLegacyRow(kind: Exclude<ComponentKind, "unknown">, index?: number): void;
  remove(path: ComponentPath): void;
  duplicate(path: ComponentPath): void;
  copy(path: ComponentPath): void;
  paste(parentPath: ComponentPath, index?: number): void;
  move(path: ComponentPath, direction: -1 | 1): void;
  moveList(path: ComponentPath, oldIndex: number, newIndex: number): void;
  drag(
    source: ComponentPath,
    destination: ComponentPath,
    oldIndex: number,
    newIndex: number,
  ): void;
  canDrag(
    source: ComponentPath,
    destination: ComponentPath,
    index: number,
  ): boolean;
  configure(path: ComponentPath): void;
  configureMessage(): void;
  configureMessageReference?(): void;
  addLegacyEmbed?(): void;
  addLegacyPoll?(): void;
  configureLegacyEmbed(index: number): void;
}

type EditorCanvasProps = {
  readonly document: DiscordMessagePayload;
  readonly placeholders: readonly Placeholder[];
  readonly previewPlaceholders: boolean;
  readonly references?: readonly ServerReference[];
  readonly issues?: readonly EditorIssue[];
} & (
  | { readonly readOnly: true; readonly actions?: never }
  | { readonly readOnly?: false; readonly actions: CanvasActions }
);

interface MenuState {
  readonly kind: "add" | "node" | "canvas";
  readonly x: number;
  readonly y: number;
  readonly fromControl?: boolean;
  readonly parentPath: ComponentPath;
  readonly index?: number;
  readonly path?: ComponentPath;
}

const READ_ONLY_ACTIONS: CanvasActions = {
  select() {},
  beginEdit() {},
  endEdit() {},
  updateNode() {},
  updateMessage() {},
  setButtonStyle() {},
  add() {},
  setSectionAccessory() {},
  addLegacyRow() {},
  remove() {},
  duplicate() {},
  copy() {},
  paste() {},
  move() {},
  moveList() {},
  drag() {},
  canDrag() {
    return false;
  },
  configure() {},
  configureMessage() {},
  configureLegacyEmbed() {},
};

export function EditorCanvas({
  document,
  actions,
  placeholders,
  previewPlaceholders,
  references = [],
  issues = [],
  readOnly = false,
}: EditorCanvasProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState<MenuState>();
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const canvas = useRef<HTMLDivElement>(null);
  const canvasActions = actions ?? READ_ONLY_ACTIONS;

  useEffect(() => {
    if (readOnly) return;
    const close = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest(".editor-popover")
      )
        setMenu(undefined);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(undefined);
    };
    window.document.addEventListener("mousedown", close);
    window.document.addEventListener("keydown", escape);
    return () => {
      window.document.removeEventListener("mousedown", close);
      window.document.removeEventListener("keydown", escape);
    };
  }, [readOnly]);

  const openAdd = (
    parentPath: ComponentPath,
    index: number | undefined,
    target: HTMLElement,
  ) => {
    if (readOnly) return;
    const rect = target.getBoundingClientRect();
    setMenu({
      kind: "add",
      x: rect.left,
      y: rect.bottom + 8,
      parentPath,
      index,
    });
  };

  const openNodeMenu = (
    path: ComponentPath,
    event: {
      clientX: number;
      clientY: number;
      preventDefault(): void;
      fromControl?: boolean;
    },
  ) => {
    if (readOnly) return;
    event.preventDefault();
    canvasActions.select(path);
    setMenu({
      kind: "node",
      x: event.clientX,
      y: event.clientY,
      fromControl: event.fromControl,
      parentPath: parentNodePath(path) ?? [],
      index: indexInParent(path),
      path,
    });
  };

  const interaction = useMemo<InteractionState>(
    () => ({
      revealed,
      toggleSpoiler(path) {
        const key = pathKey(path);
        setRevealed((current) => {
          const next = new Set(current);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      },
      toggleSpoilerKey(key) {
        setRevealed((current) => {
          const next = new Set(current);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
      },
    }),
    [revealed],
  );

  return (
    <CanvasIssues.Provider value={readOnly ? [] : issues}>
      <ReadOnlyContext.Provider value={readOnly}>
        <PlaceholderContext.Provider value={placeholders}>
          <ServerReferencesContext.Provider value={references}>
            <PlaceholderPreviewContext.Provider value={previewPlaceholders}>
              <InteractionContext.Provider value={interaction}>
                <section
                  aria-label={t("editor.canvas")}
                  className={`editor-canvas${readOnly ? " is-readonly" : ""}`}
                >
                  <div
                    className="message-canvas"
                    onContextMenu={(event) => {
                      if (
                        !readOnly &&
                        (event.target === canvas.current ||
                          event.target === event.currentTarget)
                      ) {
                        event.preventDefault();
                        setMenu({
                          kind: "canvas",
                          x: event.clientX,
                          y: event.clientY,
                          parentPath: [],
                        });
                      }
                    }}
                    ref={canvas}
                  >
                    <img alt="Pokkan" src="/avatar.png" />
                    <div className="message-body">
                      <MessageReference
                        actions={canvasActions}
                        value={document.message_reference}
                      />
                      <div className="discord-meta">
                        <strong>Pokkan</strong>
                        <span>{t("editor.appBadge")}</span>
                        <time>{t("editor.now")}</time>
                      </div>
                      {messageFormat(document) === "legacy" ? (
                        <LegacyCanvas
                          Inline={InlineField}
                          actions={canvasActions}
                          document={document}
                          readOnly={readOnly}
                        />
                      ) : null}
                      <NodeList
                        document={document}
                        parentPath={[]}
                        actions={canvasActions}
                        openAdd={openAdd}
                        openNodeMenu={openNodeMenu}
                      />
                    </div>
                  </div>
                  {!readOnly &&
                  (menu?.kind === "add" || menu?.kind === "canvas") ? (
                    <AddMenu
                      document={document}
                      state={menu}
                      actions={canvasActions}
                      close={() => setMenu(undefined)}
                    />
                  ) : null}
                  {!readOnly && menu?.kind === "node" && menu.path ? (
                    <NodeMenu
                      document={document}
                      state={menu}
                      actions={canvasActions}
                      close={() => setMenu(undefined)}
                      openAdd={openAdd}
                    />
                  ) : null}
                </section>
              </InteractionContext.Provider>
            </PlaceholderPreviewContext.Provider>
          </ServerReferencesContext.Provider>
        </PlaceholderContext.Provider>
      </ReadOnlyContext.Provider>
    </CanvasIssues.Provider>
  );
}

function MessageReference({
  actions,
  value,
}: Readonly<{ actions: CanvasActions; value: unknown }>) {
  const { t } = useTranslation();
  const readOnly = useContext(ReadOnlyContext);
  if (!isRecord(value)) return null;
  const messageId = stringField(value.message_id);
  const content = (
    <>
      <Reply aria-hidden="true" size={14} />
      <span>{t("editor.repliesTo")}</span>
      <strong>{messageId || "…"}</strong>
    </>
  );
  if (readOnly) return <div className="discord-reply-reference">{content}</div>;
  return (
    <button
      className="discord-reply-reference"
      onClick={() => actions.configureMessageReference?.()}
      onContextMenu={(event) => {
        event.preventDefault();
        actions.configureMessageReference?.();
      }}
      type="button"
    >
      {content}
    </button>
  );
}

interface NodeListProps {
  readonly document: DiscordMessagePayload;
  readonly parentPath: ComponentPath;
  readonly actions: CanvasActions;
  readonly openAdd: (
    parentPath: ComponentPath,
    index: number | undefined,
    target: HTMLElement,
  ) => void;
  readonly openNodeMenu: (
    path: ComponentPath,
    event: {
      clientX: number;
      clientY: number;
      preventDefault(): void;
      fromControl?: boolean;
    },
  ) => void;
}

function NodeList({
  document,
  parentPath,
  actions,
  openAdd,
  openNodeMenu,
}: NodeListProps) {
  const readOnly = useContext(ReadOnlyContext);
  const children = childNodes(document, parentPath);
  const list = useSortableList({
    parentPath,
    mode: messageFormat(document),
    disabled: readOnly,
    canMove: actions.canDrag,
    onMove: actions.drag,
  });

  return (
    <div
      className="node-list"
      data-parent-path={JSON.stringify(parentPath)}
      ref={list}
    >
      {children.map((value, index) => (
        <NodeFrame
          document={document}
          key={pathKey(pathForChild(parentPath, index))}
          path={pathForChild(parentPath, index)}
          value={value}
          actions={actions}
          openAdd={openAdd}
          openNodeMenu={openNodeMenu}
        />
      ))}
      {!readOnly ? (
        <InsertionPoint
          parentPath={parentPath}
          index={children.length}
          document={document}
          openAdd={openAdd}
        />
      ) : null}
    </div>
  );
}

interface NodeFrameProps extends Omit<NodeListProps, "parentPath"> {
  readonly path: ComponentPath;
  readonly value: unknown;
}

function NodeFrame({
  document,
  path,
  value,
  actions,
  openAdd,
  openNodeMenu,
}: NodeFrameProps) {
  const readOnly = useContext(ReadOnlyContext);
  const kind = componentKind(value);
  const selected = !readOnly && samePath(actions.selectedPath, path);
  const accessory = path.at(-1) === "accessory";
  const diagnosticProps = useDiagnosticProps(path);
  const longPress = useLongPress(
    readOnly || accessory ? undefined : (point) => openNodeMenu(path, point),
  );

  return (
    <div
      {...diagnosticProps}
      tabIndex={readOnly ? undefined : -1}
      className={`editor-node node-${kind}${selected ? " is-selected" : ""}`}
      data-index={typeof path.at(-1) === "number" ? path.at(-1) : undefined}
      data-component-path={pathKey(path)}
      data-type={
        isRecord(value) && typeof value.type === "number"
          ? value.type
          : "unknown"
      }
      onClick={
        readOnly
          ? undefined
          : (event) => {
              event.stopPropagation();
              actions.select(path);
            }
      }
      onContextMenu={
        readOnly || accessory
          ? undefined
          : (event) => {
              event.preventDefault();
              event.stopPropagation();
              openNodeMenu(path, event);
            }
      }
      {...longPress}
    >
      {!readOnly ? (
        <NodeControls
          document={document}
          path={path}
          kind={kind}
          actions={actions}
          openNodeMenu={openNodeMenu}
        />
      ) : null}
      <NodeView
        document={document}
        path={path}
        value={value}
        actions={actions}
        openAdd={openAdd}
        openNodeMenu={openNodeMenu}
      />
      {!readOnly ? <IssueFeedback path={path} /> : null}
    </div>
  );
}

function NodeControls(
  props: Readonly<{
    document: DiscordMessagePayload;
    path: ComponentPath;
    kind: ComponentKind;
    actions: CanvasActions;
    openNodeMenu: NodeListProps["openNodeMenu"];
  }>,
) {
  const { t } = useTranslation();
  const node = nodeAt(props.document, props.path);
  const accessory = props.path.at(-1) === "accessory";
  const replacement = props.kind === "button" ? "thumbnail" : "button";
  return (
    <div className="node-controls">
      {!accessory && props.kind !== "unknown" ? (
        <button
          aria-label={t("editor.dragComponent")}
          title={t("editor.dragComponent")}
          className="node-control drag-handle"
          tabIndex={-1}
          type="button"
        >
          <GripVertical size={14} />
        </button>
      ) : null}
      {props.kind === "container" ? (
        <QuickColor
          value={node?.accent_color}
          change={(value) =>
            props.actions.updateNode(props.path, "accent_color", value)
          }
        />
      ) : null}
      {props.kind === "button" ? (
        <ButtonStyleControl
          value={numberField(node?.style, 1)}
          change={(style) => props.actions.setButtonStyle(props.path, style)}
        />
      ) : null}
      {props.kind === "button" && node?.style !== 6 ? (
        <QuickEmoji
          value={node?.emoji}
          change={(value) =>
            props.actions.updateNode(props.path, "emoji", value)
          }
        />
      ) : null}
      {props.kind === "button" ? (
        <button
          aria-label={t("editor.disabled")}
          aria-pressed={Boolean(node?.disabled)}
          className="node-control"
          onClick={(event) => {
            event.stopPropagation();
            props.actions.updateNode(
              props.path,
              "disabled",
              !Boolean(node?.disabled),
            );
          }}
          title={t("editor.disabled")}
          type="button"
        >
          <Ban aria-hidden="true" size={14} />
        </button>
      ) : null}
      {["container", "thumbnail", "file"].includes(props.kind) ? (
        <button
          aria-label={t("editor.spoiler")}
          aria-pressed={Boolean(node?.spoiler)}
          className="node-control"
          onClick={(event) => {
            event.stopPropagation();
            props.actions.updateNode(
              props.path,
              "spoiler",
              !Boolean(node?.spoiler),
            );
          }}
          title={t("editor.spoiler")}
          type="button"
        >
          {node?.spoiler ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      ) : null}
      <button
        aria-label={`${t("editor.configure")} ${componentLabel(nodeAt(props.document, props.path))}`}
        title={`${t("editor.configure")} ${componentLabel(nodeAt(props.document, props.path))}`}
        className="node-control"
        onClick={(event) => {
          event.stopPropagation();
          props.actions.configure(props.path);
        }}
        type="button"
      >
        <Settings2 size={14} />
      </button>
      {accessory ? (
        <button
          aria-label={t("editor.replaceAccessory", {
            component: t(`editor.components.${replacement}`),
          })}
          title={t("editor.replaceAccessory", {
            component: t(`editor.components.${replacement}`),
          })}
          className="node-control"
          onClick={(event) => {
            event.stopPropagation();
            const section = props.path.slice(0, -1);
            props.actions.setSectionAccessory(section, replacement);
          }}
          type="button"
        >
          <RefreshCw size={14} />
        </button>
      ) : (
        <>
          {canRemoveComponent(props.document, props.path) ? (
            <button
              aria-label={t("editor.deleteComponent")}
              title={t("editor.deleteComponent")}
              className="node-control danger-control"
              onClick={(event) => {
                event.stopPropagation();
                props.actions.remove(props.path);
              }}
              type="button"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
          <button
            aria-label={t("editor.moreActions")}
            title={t("editor.moreActions")}
            className="node-control"
            onClick={(event) => {
              event.stopPropagation();
              props.openNodeMenu(props.path, {
                clientX: event.currentTarget.getBoundingClientRect().left,
                clientY: event.currentTarget.getBoundingClientRect().top,
                fromControl: true,
                preventDefault: () => event.preventDefault(),
              });
            }}
            type="button"
          >
            <MoreHorizontal size={14} />
          </button>
        </>
      )}
    </div>
  );
}

function NodeView({
  document,
  path,
  value,
  actions,
  openAdd,
  openNodeMenu,
}: NodeFrameProps) {
  const { t } = useTranslation();
  const readOnly = useContext(ReadOnlyContext);
  if (!isRecord(value))
    return (
      <div className="unsupported-node">{t("editor.invalidComponent")}</div>
    );
  const kind = componentKind(value);
  const interaction = useContext(InteractionContext);

  switch (kind) {
    case "container": {
      const spoiler =
        Boolean(value.spoiler) && !interaction?.revealed.has(pathKey(path));
      return (
        <div
          className={`discord-container${colorHex(value.accent_color) ? " has-accent" : ""}${spoiler ? " is-spoiler" : ""}`}
          style={{ borderLeftColor: colorHex(value.accent_color) }}
        >
          <NodeList
            document={document}
            parentPath={path}
            actions={actions}
            openAdd={openAdd}
            openNodeMenu={openNodeMenu}
          />
          {spoiler ? (
            <button
              className="component-spoiler"
              onClick={(event) => {
                event.stopPropagation();
                interaction?.toggleSpoiler(path);
              }}
              type="button"
            >
              {t("editor.spoiler")}
            </button>
          ) : null}
        </div>
      );
    }
    case "section":
      return (
        <div className="discord-section">
          <NodeList
            document={document}
            parentPath={path}
            actions={actions}
            openAdd={openAdd}
            openNodeMenu={openNodeMenu}
          />
          {isRecord(value.accessory) ? (
            <NodeFrame
              document={document}
              path={[...path, "accessory"]}
              value={value.accessory}
              actions={actions}
              openAdd={openAdd}
              openNodeMenu={openNodeMenu}
            />
          ) : !readOnly ? (
            <SectionAccessoryAdd
              document={document}
              path={path}
              actions={actions}
            />
          ) : null}
        </div>
      );
    case "textDisplay":
      return (
        <InlineField
          field="content"
          format="message"
          path={path}
          value={stringField(value.content)}
          actions={actions}
          multiline
        />
      );
    case "actionRow":
      return (
        <div className="discord-action-row">
          <NodeList
            document={document}
            parentPath={path}
            actions={actions}
            openAdd={openAdd}
            openNodeMenu={openNodeMenu}
          />
        </div>
      );
    case "button": {
      const style = numberField(value.style, 1);
      const common = (
        <>
          <Emoji value={value.emoji} />
          <InlineField
            compact
            field="label"
            maxLength={80}
            path={path}
            value={stringField(value.label)}
            actions={actions}
          />
        </>
      );
      const className = `discord-button style-${style}${value.disabled ? " is-disabled" : ""}`;
      const content =
        style === 6 ? (
          <span className="premium-label">{t("editor.premium")}</span>
        ) : (
          <>
            {common}
            {style === 5 ? (
              <ExternalLink
                aria-hidden="true"
                className="button-external-link"
                size={15}
              />
            ) : null}
          </>
        );
      if (!readOnly)
        return (
          <div
            aria-disabled={Boolean(value.disabled)}
            className={className}
            role="button"
          >
            {content}
          </div>
        );
      const url = stringField(value.url);
      if (style === 5 && !value.disabled && isSafeLink(url))
        return (
          <a className={className} href={url} rel="noreferrer">
            {content}
          </a>
        );
      return (
        <button
          className={className}
          disabled={Boolean(value.disabled) || style === 5}
          type="button"
        >
          {content}
        </button>
      );
    }
    case "stringSelect":
    case "userSelect":
    case "roleSelect":
    case "mentionableSelect":
    case "channelSelect":
      return (
        <div
          aria-disabled={Boolean(value.disabled)}
          className={`discord-select${value.disabled ? " is-disabled" : ""}`}
        >
          <InlineField
            compact
            field="placeholder"
            maxLength={150}
            path={path}
            value={stringField(value.placeholder, selectPlaceholder(kind, t))}
            actions={actions}
          />
          <ChevronDown aria-hidden="true" size={16} />
        </div>
      );
    case "thumbnail":
      return (
        <MediaPreview
          actions={actions}
          className="discord-thumbnail"
          media={value.media}
          spoiler={Boolean(value.spoiler)}
          description={stringField(value.description)}
          path={path}
          changeUrl={(url) =>
            actions.updateNode(
              path,
              "media",
              { ...(isRecord(value.media) ? value.media : {}), url },
              true,
            )
          }
        />
      );
    case "mediaGallery": {
      const items = arrayField(value.items);
      return (
        <div
          className={`discord-gallery gallery-count-${Math.min(items.length, 5)}`}
        >
          {items.length ? (
            items.map((item, index) => {
              if (!isRecord(item)) return null;
              const patchItem = (
                change: Record<string, unknown>,
                editing = false,
              ) =>
                actions.updateNode(
                  path,
                  "items",
                  items.map((entry, current) =>
                    current === index && isRecord(entry)
                      ? { ...entry, ...change }
                      : entry,
                  ),
                  editing,
                );
              return (
                <div className="discord-gallery-item" key={index}>
                  <MediaPreview
                    actions={actions}
                    className="discord-gallery-media"
                    description={stringField(item.description)}
                    media={item.media}
                    path={[...path, "items", index]}
                    selectPath={path}
                    changeUrl={(url) =>
                      patchItem(
                        {
                          media: {
                            ...(isRecord(item.media) ? item.media : {}),
                            url,
                          },
                        },
                        true,
                      )
                    }
                    spoiler={Boolean(item.spoiler)}
                  />
                  {!readOnly ? (
                    <button
                      aria-label={t("editor.spoiler")}
                      aria-pressed={Boolean(item.spoiler)}
                      className="node-control gallery-spoiler-control"
                      onClick={(event) => {
                        event.stopPropagation();
                        actions.select(path);
                        patchItem({ spoiler: !item.spoiler });
                      }}
                      title={t("editor.spoiler")}
                      type="button"
                    >
                      {item.spoiler ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="gallery-empty">
              <Image aria-hidden="true" size={20} />
              <span>{t("editor.addMedia")}</span>
            </div>
          )}
        </div>
      );
    }
    case "file":
      return <FileDisplay actions={actions} path={path} value={value} />;
    case "separator":
      return (
        <div
          className={`discord-separator spacing-${numberField(value.spacing, 1)}${value.divider === false ? " no-divider" : ""}`}
        >
          <span />
        </div>
      );
    default:
      return (
        <div className="unsupported-node">
          <FileText aria-hidden="true" size={16} /> {componentLabel(value)} ·{" "}
          {t("editor.unknownPreserved")}
        </div>
      );
  }
}

function SectionAccessoryAdd({
  document,
  path,
  actions,
}: Readonly<{
  document: DiscordMessagePayload;
  path: ComponentPath;
  actions: CanvasActions;
}>) {
  const { t } = useTranslation();
  const kinds = allowedSectionAccessories(document, path).filter(
    (kind): kind is "thumbnail" | "button" =>
      kind === "thumbnail" || kind === "button",
  );
  if (!kinds.length) return null;
  return (
    <div
      className="section-accessory-add"
      role="group"
      aria-label={t("editor.addAccessory")}
    >
      {kinds.map((kind) => (
        <button
          key={kind}
          onClick={() => actions.setSectionAccessory(path, kind)}
          type="button"
        >
          {kindIcon(kind)}
          <span>{t(`editor.components.${kind}`)}</span>
        </button>
      ))}
    </div>
  );
}

function MediaPreview({
  actions,
  className,
  media,
  description,
  spoiler,
  path,
  selectPath,
  changeUrl,
}: Readonly<{
  actions: CanvasActions;
  className: string;
  media: unknown;
  description: string;
  spoiler: boolean;
  path: ComponentPath;
  selectPath?: ComponentPath;
  changeUrl(url: string): void;
}>) {
  const { t } = useTranslation();
  const readOnly = useContext(ReadOnlyContext);
  const interaction = useContext(InteractionContext);
  const [editingUrl, setEditingUrl] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const url = isRecord(media) ? stringField(media.url) : "";
  const hidden = spoiler && !interaction?.revealed.has(pathKey(path));
  return (
    <div
      className={`${className}${hidden ? " is-spoiler" : ""}`}
      aria-label={!readOnly ? t("editor.imageUrl") : undefined}
      role={!readOnly ? "button" : undefined}
      tabIndex={!readOnly ? 0 : undefined}
      ref={anchor}
      onClick={(event) => {
        if (readOnly) return;
        event.stopPropagation();
        actions.select(selectPath ?? path);
        if (hidden) {
          interaction?.toggleSpoiler(path);
        } else setEditingUrl(true);
      }}
      onKeyDown={(event) => {
        if (readOnly || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        actions.select(selectPath ?? path);
        if (hidden) interaction?.toggleSpoiler(path);
        else setEditingUrl(true);
      }}
    >
      <RemoteMedia alt={description} url={url} />
      {hidden ? (
        <span className="media-spoiler">{t("editor.spoiler")}</span>
      ) : null}
      {editingUrl ? (
        <MediaAddressPopover
          anchor={anchor}
          beginEdit={actions.beginEdit}
          change={changeUrl}
          close={() => setEditingUrl(false)}
          endEdit={actions.endEdit}
          label={t("editor.imageUrl")}
          value={url}
        />
      ) : null}
    </div>
  );
}

function FileDisplay({
  actions,
  path,
  value,
}: Readonly<{
  actions: CanvasActions;
  path: ComponentPath;
  value: Record<string, unknown>;
}>) {
  const { t } = useTranslation();
  const readOnly = useContext(ReadOnlyContext);
  const interaction = useContext(InteractionContext);
  const [editingUrl, setEditingUrl] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const file = isRecord(value.file) ? value.file : {};
  const hidden =
    Boolean(value.spoiler) && !interaction?.revealed.has(pathKey(path));
  const body = (
    <>
      <File aria-hidden="true" size={18} />
      <span>{fileName(value)}</span>
      {hidden ? <em>{t("editor.spoiler")}</em> : null}
    </>
  );
  if (hidden)
    return (
      <button
        aria-label={t("editor.revealSpoilerFile")}
        className="discord-file is-spoiler"
        onClick={(event) => {
          event.stopPropagation();
          if (!readOnly) actions.select(path);
          interaction?.toggleSpoiler(path);
        }}
        type="button"
      >
        {body}
      </button>
    );
  if (readOnly) return <div className="discord-file">{body}</div>;
  return (
    <>
      <button
        aria-label={t("editor.attachmentUrl")}
        className="discord-file"
        onClick={(event) => {
          event.stopPropagation();
          actions.select(path);
          setEditingUrl(true);
        }}
        ref={anchor}
        type="button"
      >
        {body}
      </button>
      {editingUrl ? (
        <MediaAddressPopover
          anchor={anchor}
          beginEdit={actions.beginEdit}
          change={(url) =>
            actions.updateNode(path, "file", { ...file, url }, true)
          }
          close={() => setEditingUrl(false)}
          endEdit={actions.endEdit}
          hint={t("editor.attachmentReferenceHint")}
          label={t("editor.attachmentUrl")}
          value={stringField(file.url)}
        />
      ) : null}
    </>
  );
}

function InsertionPoint({
  document,
  parentPath,
  index,
  openAdd,
}: Readonly<{
  document: DiscordMessagePayload;
  parentPath: ComponentPath;
  index: number;
  openAdd: NodeListProps["openAdd"];
}>) {
  const { t } = useTranslation();
  const kinds = useMemo(
    () => componentKindsFor(document, parentPath),
    [document, parentPath],
  );
  const root = parentPath.length === 0;
  const legacyMessageElementAvailable =
    root &&
    messageFormat(document) === "legacy" &&
    (document.content === undefined ||
      (Array.isArray(document.embeds) ? document.embeds.length : 0) < 10 ||
      !isRecord(document.poll));
  if (kinds.length === 0 && !legacyMessageElementAvailable) {
    const v2Full =
      root &&
      messageFormat(document) === "componentsV2" &&
      sendableComponentCount(childNodes(document, [])) >= 40;
    const legacyFull =
      root &&
      messageFormat(document) === "legacy" &&
      childNodes(document, []).length >= 5;
    if (!v2Full && !legacyFull) return null;
    const label = v2Full ? t("editor.capacityV2") : t("editor.capacityLegacy");
    return (
      <button
        aria-label={label}
        className="insertion-point is-disabled"
        disabled
        title={label}
        type="button"
      >
        <span />
        <small>{label}</small>
        <span />
      </button>
    );
  }
  return (
    <button
      aria-label={t("editor.addElement")}
      className="insertion-point"
      onClick={(event) => {
        event.stopPropagation();
        openAdd(parentPath, index, event.currentTarget);
      }}
      type="button"
    >
      <span />
      <Plus aria-hidden="true" size={15} />
      <span />
    </button>
  );
}

function AddMenu({
  document,
  state,
  actions,
  close,
}: Readonly<{
  document: DiscordMessagePayload;
  state: MenuState;
  actions: CanvasActions;
  close(): void;
}>) {
  const { t } = useTranslation();
  const kinds = componentKindsFor(document, state.parentPath);
  const legacyRoot =
    messageFormat(document) === "legacy" && state.parentPath.length === 0;
  const displayedKinds = legacyRoot
    ? kinds.filter((kind) => kind !== "actionRow")
    : kinds;
  const embeds = Array.isArray(document.embeds) ? document.embeds : [];
  return (
    <FloatingSurface
      className="editor-popover add-menu"
      gap={0}
      point={state}
      role="menu"
    >
      <div className="menu-heading">{t("editor.addElement")}</div>
      {legacyRoot && document.content === undefined ? (
        <button
          onClick={() => {
            actions.updateMessage("content", "");
            close();
          }}
          role="menuitem"
          type="button"
        >
          <Type size={15} />
          <span>{t("editor.messageContent")}</span>
        </button>
      ) : null}
      {legacyRoot && embeds.length < 10 ? (
        <button
          onClick={() => {
            actions.addLegacyEmbed?.();
            close();
          }}
          role="menuitem"
          type="button"
        >
          <FileText size={15} />
          <span>{t("editor.embed")}</span>
        </button>
      ) : null}
      {legacyRoot && !isRecord(document.poll) ? (
        <button
          onClick={() => {
            actions.addLegacyPoll?.();
            close();
          }}
          role="menuitem"
          type="button"
        >
          <ListChecks size={15} />
          <span>{t("editor.poll")}</span>
        </button>
      ) : null}
      {displayedKinds.map((kind) => (
        <button
          key={kind}
          onClick={() => {
            actions.add(state.parentPath, kind, state.index);
            close();
          }}
          role="menuitem"
          type="button"
        >
          {kindIcon(kind)}
          <span>
            {t(`editor.components.${kind}`, {
              defaultValue: componentDefinition(kind)?.label,
            })}
          </span>
        </button>
      ))}
      {legacyRoot && kinds.includes("actionRow")
        ? (
            [
              "button",
              "stringSelect",
              "userSelect",
              "roleSelect",
              "mentionableSelect",
              "channelSelect",
            ] as const
          ).map((kind) => (
            <button
              key={`legacy-${kind}`}
              onClick={() => {
                actions.addLegacyRow(kind, state.index);
                close();
              }}
              role="menuitem"
              type="button"
            >
              {kindIcon(kind)}
              <span>
                {t(`editor.components.${kind}`, {
                  defaultValue: componentDefinition(kind)?.label,
                })}
              </span>
            </button>
          ))
        : null}
      {state.kind === "canvas" ? (
        <>
          <div className="menu-separator" />
          <button
            onClick={() => {
              actions.configureMessageReference?.();
              close();
            }}
            role="menuitem"
            type="button"
          >
            <Reply size={15} />
            <span>{t("editor.replyTo")}</span>
          </button>
          <button
            onClick={() => {
              actions.configureMessage();
              close();
            }}
            role="menuitem"
            type="button"
          >
            <Settings2 size={15} />
            <span>{t("editor.messageSettings")}</span>
          </button>
        </>
      ) : null}
    </FloatingSurface>
  );
}

function NodeMenu({
  document,
  state,
  actions,
  close,
  openAdd,
}: Readonly<{
  document: DiscordMessagePayload;
  state: MenuState;
  actions: CanvasActions;
  close(): void;
  openAdd: NodeListProps["openAdd"];
}>) {
  const { t } = useTranslation();
  const node = state.path ? nodeAt(document, state.path) : undefined;
  if (!node || !state.path) return null;
  if (state.path.at(-1) === "accessory") return null;
  const index = state.index ?? 0;
  const parent = state.parentPath;
  const kinds = allowedInsertions(document, parent);
  const nodeKind = componentKind(node);
  const canPaste =
    actions.clipboard !== undefined &&
    canPasteComponent(document, parent, actions.clipboard);
  const canDuplicate =
    nodeKind !== "unknown" && canDuplicateComponent(document, state.path);
  const canReorder =
    nodeKind !== "unknown" && childNodes(document, parent).length > 1;
  return (
    <FloatingSurface
      className="editor-popover node-menu"
      gap={0}
      placement={state.fromControl ? "top-start" : "bottom-start"}
      point={state}
      role="menu"
    >
      <button
        onClick={() => {
          actions.configure(state.path!);
          close();
        }}
        role="menuitem"
        type="button"
      >
        <Menu size={15} />
        <span>{t("editor.configure")}</span>
      </button>
      {nodeKind !== "unknown" && kinds.length ? (
        <>
          <button
            onClick={(event) => {
              close();
              openAdd(parent, index, event.currentTarget);
            }}
            role="menuitem"
            type="button"
          >
            <Plus size={15} />
            <span>{t("editor.addBefore")}</span>
          </button>
          <button
            onClick={(event) => {
              close();
              openAdd(parent, index + 1, event.currentTarget);
            }}
            role="menuitem"
            type="button"
          >
            <Plus size={15} />
            <span>{t("editor.addAfter")}</span>
          </button>
        </>
      ) : null}
      {nodeKind !== "unknown" ? (
        <>
          <div className="menu-separator" />
          {canDuplicate ? (
            <button
              onClick={() => {
                actions.duplicate(state.path!);
                close();
              }}
              role="menuitem"
              type="button"
            >
              <Copy size={15} />
              <span>{t("app.duplicate")}</span>
            </button>
          ) : null}
          <button
            onClick={() => {
              actions.copy(state.path!);
              close();
            }}
            role="menuitem"
            type="button"
          >
            <Copy size={15} />
            <span>{t("app.copy")}</span>
          </button>
          {canPaste ? (
            <button
              onClick={() => {
                actions.paste(parent, index + 1);
                close();
              }}
              role="menuitem"
              type="button"
            >
              <CheckSquare2 size={15} />
              <span>{t("editor.paste")}</span>
            </button>
          ) : null}
        </>
      ) : null}
      {canReorder ? (
        <>
          <div className="menu-separator" />
          {index > 0 ? (
            <button
              onClick={() => {
                actions.move(state.path!, -1);
                close();
              }}
              role="menuitem"
              type="button"
            >
              <Rows3 size={15} />
              <span>{t("editor.moveUp")}</span>
            </button>
          ) : null}
          {index < childNodes(document, parent).length - 1 ? (
            <button
              onClick={() => {
                actions.move(state.path!, 1);
                close();
              }}
              role="menuitem"
              type="button"
            >
              <Rows3 size={15} />
              <span>{t("editor.moveDown")}</span>
            </button>
          ) : null}
        </>
      ) : null}
      {nodeKind !== "unknown" ? (
        <>
          <div className="menu-separator" />
          <button
            className="danger"
            onClick={() => {
              actions.remove(state.path!);
              close();
            }}
            role="menuitem"
            type="button"
          >
            <Trash2 size={15} />
            <span>{t("app.delete")}</span>
          </button>
        </>
      ) : null}
    </FloatingSurface>
  );
}

function componentKindsFor(
  document: DiscordMessagePayload,
  parentPath: ComponentPath,
) {
  return allowedInsertions(document, parentPath);
}

function kindIcon(kind: ComponentKind) {
  const props = { "aria-hidden": true, size: 16 } as const;
  switch (kind) {
    case "container":
      return <Box {...props} />;
    case "section":
      return <LayoutPanelTop {...props} />;
    case "textDisplay":
      return <Type {...props} />;
    case "actionRow":
      return <PanelTop {...props} />;
    case "button":
      return <CheckSquare2 {...props} />;
    case "stringSelect":
      return <ListChecks {...props} />;
    case "userSelect":
      return <UserRound {...props} />;
    case "roleSelect":
      return <CircleDot {...props} />;
    case "mentionableSelect":
      return <UserRound {...props} />;
    case "channelSelect":
      return <Rows3 {...props} />;
    case "thumbnail":
      return <Image {...props} />;
    case "mediaGallery":
      return <Image {...props} />;
    case "file":
      return <File {...props} />;
    case "separator":
      return <SeparatorHorizontal {...props} />;
    default:
      return <FileText {...props} />;
  }
}

function useLongPress(
  callback:
    | ((point: {
        clientX: number;
        clientY: number;
        preventDefault(): void;
      }) => void)
    | undefined,
) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | undefined>(undefined);
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = undefined;
  };
  return {
    onPointerDown: (event: ReactPointerEvent) => {
      if (!callback || event.pointerType !== "touch") return;
      event.stopPropagation();
      start.current = { x: event.clientX, y: event.clientY };
      timer.current = window.setTimeout(
        () =>
          callback({
            clientX: event.clientX,
            clientY: event.clientY,
            preventDefault: () => undefined,
          }),
        480,
      );
    },
    onPointerMove: (event: ReactPointerEvent) => {
      if (
        !start.current ||
        Math.abs(event.clientX - start.current.x) > 10 ||
        Math.abs(event.clientY - start.current.y) > 10
      )
        cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
  };
}

function samePath(a: ComponentPath | undefined, b: ComponentPath) {
  return a?.length === b.length && a.every((part, index) => part === b[index]);
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function numberField(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}
function arrayField(value: unknown) {
  return Array.isArray(value) ? value : [];
}
function fileName(value: Record<string, unknown>) {
  const file = isRecord(value.file) ? value.file : undefined;
  const url = stringField(file?.url, "attachment://file.txt");
  return url.split("/").at(-1) || "file";
}
function selectPlaceholder(
  kind: ComponentKind,
  translate: (key: string) => string,
) {
  const key =
    (
      {
        stringSelect: "selectOption",
        userSelect: "selectUser",
        roleSelect: "selectRole",
        mentionableSelect: "selectMentionable",
        channelSelect: "selectChannel",
      } as const
    )[kind as "stringSelect"] ?? "selectOption";
  return translate(`editor.${key}`);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
