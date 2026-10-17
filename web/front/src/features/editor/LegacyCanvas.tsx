import { NodeToolbar } from "./NodeToolbar";
import { EditorMenu } from "./EditorMenu";
import {
  Clock3,
  Columns3,
  Copy,
  File,
  GripVertical,
  Image,
  Images,
  ListChecks,
  MoreHorizontal,
  Plus,
  Rows3,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import type { DiscordMessagePayload } from "../kits/domain";
import type { CanvasActions } from "./EditorCanvas";
import type { InlineField } from "./InlineField";
import { FloatingSurface } from "../../shared/FloatingSurface";
import { Emoji } from "./Emoji";
import { QuickColor, QuickEmoji, colorHex } from "./QuickControls";
import { isSafeLink } from "../../shared/urls";
import { RemoteMedia } from "./RemoteMedia";
import { MediaAddressPopover } from "./MediaAddressPopover";
import { useSortableItems } from "./useSortableItems";
import { copyText } from "../../shared/copy";
import { IssueFeedback } from "./CanvasIssues";

type Inline = (props: ComponentProps<typeof InlineField>) => ReactNode;

interface LegacyCanvasProps {
  readonly document: DiscordMessagePayload;
  readonly actions: CanvasActions;
  readonly Inline: Inline;
  readonly readOnly: boolean;
}

type LegacyTarget =
  | {
      readonly kind: "content" | "embed" | "attachment" | "poll";
      readonly index?: number;
    }
  | {
      readonly kind: "field" | "answer";
      readonly index: number;
      readonly parent: number;
    };

interface LegacySurface {
  readonly selected?: LegacyTarget;
  readonly readOnly: boolean;
  select(target?: LegacyTarget): void;
  openMenu(
    target: LegacyTarget,
    event: Pick<
      ReactMouseEvent,
      "clientX" | "clientY" | "preventDefault" | "stopPropagation"
    >,
  ): void;
  openMenuAt(target: LegacyTarget, targetElement: HTMLElement): void;
}

/** Legacy entities remain distinct in the payload but share the visual canvas and mutation surface. */
export function LegacyCanvas({
  document,
  actions,
  Inline,
  readOnly,
}: LegacyCanvasProps) {
  const payload = document as Record<string, unknown>;
  const attachments = recordArray(payload.attachments);
  const embeds = recordArray(payload.embeds);
  const [selected, setSelected] = useState<LegacyTarget>();
  const [menu, setMenu] = useState<{
    target: LegacyTarget;
    x: number;
    y: number;
    fromControl?: boolean;
  }>();

  useEffect(() => {
    if (actions.selectedPath) setSelected(undefined);
  }, [actions.selectedPath]);

  useEffect(() => {
    setSelected(undefined);
    setMenu(undefined);
  }, [actions.selectionEpoch]);

  const surface: LegacySurface = {
    selected: readOnly ? undefined : selected,
    readOnly,
    select(target) {
      if (!readOnly) {
        actions.select(undefined);
        setSelected(target);
      }
    },
    openMenu(target, event) {
      if (readOnly || target.kind === "poll") return;
      event.preventDefault();
      event.stopPropagation();
      actions.select(undefined);
      setSelected(target);
      setMenu({ target, x: event.clientX, y: event.clientY });
    },
    openMenuAt(target, targetElement) {
      if (readOnly || target.kind === "poll") return;
      const rect = targetElement.getBoundingClientRect();
      actions.select(undefined);
      setSelected(target);
      setMenu((current) =>
        current?.fromControl &&
        JSON.stringify(current.target) === JSON.stringify(target)
          ? undefined
          : { target, x: rect.left, y: rect.top, fromControl: true },
      );
    },
  };

  return (
    <div className={`legacy-message${readOnly ? " is-readonly" : ""}`}>
      {typeof payload.content === "string" ? (
        <LegacyContent
          value={payload.content}
          actions={actions}
          Inline={Inline}
          surface={surface}
        />
      ) : null}
      {isRecord(payload.poll) ? (
        <PollEditor
          Inline={Inline}
          actions={actions}
          poll={payload.poll}
          surface={surface}
        />
      ) : null}
      {attachments.length ? (
        <MessageAttachments
          actions={actions}
          attachments={attachments}
          surface={surface}
        />
      ) : null}
      {embeds.length ? (
        <LegacyEmbeds
          Inline={Inline}
          actions={actions}
          embeds={embeds}
          surface={surface}
        />
      ) : null}
      {!readOnly && menu ? (
        <LegacyMenu
          actions={actions}
          close={() => setMenu(undefined)}
          document={document}
          state={menu}
          select={surface.select}
        />
      ) : null}
    </div>
  );
}

function LegacyContent({
  value,
  actions,
  Inline,
  surface,
}: Readonly<{
  value: string;
  actions: CanvasActions;
  Inline: Inline;
  surface: LegacySurface;
}>) {
  const { t } = useTranslation();
  const [copyError, setCopyError] = useState(false);
  const selected = surface.selected?.kind === "content";
  const copy = () =>
    void copyText(value)
      .then(() => setCopyError(false))
      .catch(() => setCopyError(true));
  if (surface.readOnly)
    return (
      <Inline
        field="content"
        format="message"
        message
        value={value}
        actions={actions}
        multiline
      />
    );
  return (
    <div
      className={`editor-node legacy-content${selected ? " is-selected" : ""}`}
      data-editor-path={JSON.stringify(["content"])}
      tabIndex={0}
      aria-label={t("editor.messageContent")}
      onFocus={() => surface.select({ kind: "content" })}
      onClick={() => surface.select({ kind: "content" })}
      onKeyDown={(event) => {
        if (
          (event.target as HTMLElement).closest(
            '[contenteditable="true"], input, textarea, button, a, [role="menu"]',
          )
        )
          return;
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          actions.updateMessage("content", undefined);
          surface.select();
        } else if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "c"
        ) {
          event.preventDefault();
          event.stopPropagation();
          copy();
        }
      }}
    >
      <NodeToolbar>
        <button
          className="node-control"
          aria-label={t("app.copy")}
          title={t("app.copy")}
          onClick={copy}
          type="button"
        >
          <Copy size={14} />
        </button>
        <button
          className="node-control danger-control"
          aria-label={t("editor.removeContent")}
          title={t("editor.removeContent")}
          onClick={(event) => {
            event.stopPropagation();
            actions.updateMessage("content", undefined);
            surface.select();
          }}
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </NodeToolbar>
      <Inline
        field="content"
        format="message"
        message
        value={value}
        actions={actions}
        multiline
      />
      <IssueFeedback path={["content"]} />
      {copyError ? <span role="alert">{t("app.copyFailed")}</span> : null}
    </div>
  );
}

function AddRow({
  label,
  onClick,
}: Readonly<{ label: string; onClick(): void }>) {
  return (
    <button
      aria-label={label}
      className="insertion-point legacy-insertion"
      onClick={onClick}
      title={label}
      type="button"
    >
      <span />
      <Plus aria-hidden="true" size={14} />
      <span />
    </button>
  );
}

function PollEditor({
  actions,
  poll,
  Inline,
  surface,
}: Readonly<{
  actions: CanvasActions;
  poll: Record<string, unknown>;
  Inline: Inline;
  surface: LegacySurface;
}>) {
  const { t } = useTranslation();
  const question = recordValue(poll.question);
  const answers = recordArray(poll.answers);
  const results = recordArray(recordValue(poll.results).answer_counts);
  const votes = results.reduce(
    (total, result) =>
      total + (typeof result.count === "number" ? result.count : 0),
    0,
  );
  const duration = typeof poll.duration === "number" ? poll.duration : 24;
  const [durationOpen, setDurationOpen] = useState(false);
  const durationAnchor = useRef<HTMLButtonElement>(null);
  const durationSurface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!durationOpen) return;
    const frame = requestAnimationFrame(() => {
      durationSurface.current?.querySelector("input")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [durationOpen]);
  useEffect(() => {
    if (!durationOpen) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !durationAnchor.current?.contains(event.target) &&
        !durationSurface.current?.contains(event.target)
      ) {
        actions.endEdit();
        setDurationOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      actions.endEdit();
      setDurationOpen(false);
      durationAnchor.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [actions, durationOpen]);
  const expiry = new Date(text(poll.expiry)).getTime();
  const remainingHours = Number.isNaN(expiry)
    ? duration
    : Math.max(0, Math.ceil((expiry - Date.now()) / 3_600_000));
  const remaining =
    remainingHours === 0
      ? t("editor.pollEnded")
      : remainingHours >= 24
        ? t("editor.pollDaysRemaining", {
            count: Math.ceil(remainingHours / 24),
          })
        : t("editor.pollTimeRemaining", { hours: remainingHours });
  const list = useSortableItems({
    item: ".poll-answer",
    handle: ".poll-answer-handle",
    disabled: surface.readOnly,
    onMove: (oldIndex, newIndex) => {
      actions.updateMessage("poll", {
        ...poll,
        answers: moveItem(answers, oldIndex, newIndex),
      });
      surface.select({ kind: "answer", parent: 0, index: newIndex });
    },
  });
  const patch = (value: Record<string, unknown>, editing = false) =>
    actions.updateMessage("poll", { ...poll, ...value }, editing);
  const patchAnswer = (index: number, text: string) =>
    patch(
      {
        answers: answers.map((answer, current) =>
          current === index
            ? {
                ...answer,
                poll_media: { ...recordValue(answer.poll_media), text },
              }
            : answer,
        ),
      },
      true,
    );

  const target: LegacyTarget = { kind: "poll" };
  return (
    <div
      className={`discord-poll editor-node${isSelected(surface.selected, target) ? " is-selected" : ""}`}
      data-legacy-poll
      data-editor-path={JSON.stringify(["poll"])}
      tabIndex={surface.readOnly ? undefined : -1}
      onClick={(event) => {
        event.stopPropagation();
        surface.select(target);
      }}
    >
      {!surface.readOnly ? (
        <NodeToolbar>
          <button
            aria-label={t("editor.durationHours")}
            aria-expanded={durationOpen}
            className="node-control"
            onClick={(event) => {
              event.stopPropagation();
              setDurationOpen((open) => !open);
            }}
            ref={durationAnchor}
            title={`${t("editor.durationHours")}: ${duration}h`}
            type="button"
          >
            <Clock3 aria-hidden="true" size={14} />
          </button>
          {durationOpen
            ? createPortal(
                <div ref={durationSurface}>
                  <FloatingSurface
                    anchorRef={durationAnchor}
                    className="editor-popover poll-duration-popover"
                    onClick={(event) => event.stopPropagation()}
                    placement="bottom-start"
                    role="dialog"
                  >
                    <label>
                      {t("editor.durationHours")}
                      <input
                        aria-label={t("editor.durationHours")}
                        max={768}
                        min={1}
                        onBlur={() => {
                          actions.endEdit();
                          setDurationOpen(false);
                        }}
                        onChange={(event) =>
                          patch(
                            {
                              duration: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            },
                            true,
                          )
                        }
                        onFocus={actions.beginEdit}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.stopPropagation();
                            actions.endEdit();
                            setDurationOpen(false);
                            durationAnchor.current?.focus();
                          }
                        }}
                        type="number"
                        value={
                          typeof poll.duration === "number" ? poll.duration : ""
                        }
                      />
                    </label>
                  </FloatingSurface>
                </div>,
                document.body,
              )
            : null}
          <button
            aria-label={t("editor.allowMultipleAnswers")}
            aria-pressed={Boolean(poll.allow_multiselect)}
            className="node-control"
            onClick={(event) => {
              event.stopPropagation();
              patch({ allow_multiselect: !poll.allow_multiselect });
            }}
            title={t("editor.allowMultipleAnswers")}
            type="button"
          >
            <ListChecks size={14} />
          </button>
          <button
            aria-label={`${t("app.delete")} ${t("editor.poll")}`}
            className="node-control danger-control"
            onClick={(event) => {
              event.stopPropagation();
              actions.updateMessage("poll", undefined);
              surface.select();
            }}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </NodeToolbar>
      ) : null}
      <div className="poll-heading">
        <Inline
          diagnosticPath={["poll", "question", "text"]}
          actions={actions}
          field="question"
          label={t("editor.pollQuestion")}
          maxLength={300}
          placeholder={t("editor.pollQuestion")}
          setValue={(text) => patch({ question: { ...question, text } }, true)}
          value={text(question.text)}
        />
      </div>
      <p className="poll-instruction">
        {t(
          poll.allow_multiselect
            ? "editor.pollSelectMany"
            : "editor.pollSelectOne",
        )}
      </p>
      <div className="poll-answers" ref={list}>
        {answers.map((answer, index) => {
          const answerTarget: LegacyTarget = {
            kind: "answer",
            index,
            parent: 0,
          };
          const media = recordValue(answer.poll_media);
          const emoji = media.emoji;
          return (
            <div
              className={`poll-answer editor-node${emoji ? " has-emoji" : ""}${isSelected(surface.selected, answerTarget) ? " is-selected" : ""}`}
              data-index={index}
              data-editor-path={JSON.stringify(["poll", "answers", index])}
              tabIndex={surface.readOnly ? undefined : -1}
              key={index}
              onClick={(event) => {
                event.stopPropagation();
                surface.select(answerTarget);
              }}
              onContextMenu={(event) => surface.openMenu(answerTarget, event)}
            >
              {!surface.readOnly ? (
                <NodeToolbar className="poll-answer-controls">
                  <button
                    aria-label={t("editor.dragAnswer")}
                    className="node-control poll-answer-handle"
                    type="button"
                  >
                    <GripVertical size={14} />
                  </button>
                  <button
                    aria-label={t("editor.deleteAnswer")}
                    className="node-control danger-control"
                    disabled={answers.length <= 2}
                    onClick={(event) => {
                      event.stopPropagation();
                      patch({
                        answers: answers.filter(
                          (_, current) => current !== index,
                        ),
                      });
                      surface.select({ kind: "poll" });
                    }}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    aria-label={`${t("editor.moreActions")}: ${t("editor.pollAnswer")}`}
                    aria-haspopup="menu"
                    className="node-control"
                    onClick={(event) => {
                      event.stopPropagation();
                      surface.openMenuAt(answerTarget, event.currentTarget);
                    }}
                    type="button"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </NodeToolbar>
              ) : null}
              {surface.readOnly ? (
                <Emoji value={emoji} />
              ) : (
                <QuickEmoji
                  value={emoji}
                  poll
                  change={(emoji) =>
                    patch({
                      answers: answers.map((item, current) =>
                        current === index
                          ? { ...item, poll_media: { ...media, emoji } }
                          : item,
                      ),
                    })
                  }
                />
              )}
              <Inline
                diagnosticPath={[
                  "poll",
                  "answers",
                  index,
                  "poll_media",
                  "text",
                ]}
                actions={actions}
                compact
                field="answer"
                label={t("editor.pollAnswer")}
                maxLength={55}
                placeholder={t("editor.answer")}
                setValue={(value) => patchAnswer(index, value)}
                value={text(media.text)}
              />
              <span
                aria-hidden="true"
                className={
                  poll.allow_multiselect
                    ? "poll-choice is-multiple"
                    : "poll-choice"
                }
              />
            </div>
          );
        })}
      </div>
      {!surface.readOnly && answers.length < 10 ? (
        <AddRow
          label={t("editor.addAnswer")}
          onClick={() =>
            patch({ answers: [...answers, { poll_media: { text: "" } }] })
          }
        />
      ) : null}
      <div className="poll-footer">
        <span>
          {t("editor.pollVotes", { count: votes })}
          <i aria-hidden="true">•</i>
          {remaining}
        </span>
        <div>
          <span className="poll-results-action">{t("editor.showResults")}</span>
          <span className="poll-vote-action">{t("editor.vote")}</span>
        </div>
      </div>
      {!surface.readOnly ? <IssueFeedback path={["poll"]} /> : null}
    </div>
  );
}

function LegacyEmbeds({
  actions,
  embeds,
  Inline,
  surface,
}: Readonly<{
  actions: CanvasActions;
  embeds: readonly Record<string, unknown>[];
  Inline: Inline;
  surface: LegacySurface;
}>) {
  const { t } = useTranslation();
  const list = useSortableItems({
    item: ".legacy-embed-item",
    handle: ".legacy-embed-handle",
    disabled: surface.readOnly,
    onMove: (oldIndex, newIndex) => {
      actions.moveList(["embeds"], oldIndex, newIndex);
      surface.select({ kind: "embed", index: newIndex });
    },
  });
  const update = (next: readonly Record<string, unknown>[], editing = false) =>
    actions.updateMessage("embeds", next, editing);
  const patch = (
    index: number,
    value: Record<string, unknown>,
    editing = false,
  ) =>
    update(
      embeds.map((embed, current) =>
        current === index ? { ...embed, ...value } : embed,
      ),
      editing,
    );
  const patchMedia = (
    index: number,
    field: "thumbnail" | "image",
    value: string,
  ) => patch(index, { [field]: value ? { url: value } : undefined }, true);

  return (
    <div className="legacy-list" ref={list}>
      {embeds.map((embed, index) => {
        const target: LegacyTarget = { kind: "embed", index };
        return (
          <div
            className={`legacy-embed-item editor-node${isSelected(surface.selected, target) ? " is-selected" : ""}`}
            data-index={index}
            data-legacy-embed={index}
            data-editor-path={JSON.stringify(["embeds", index])}
            tabIndex={surface.readOnly ? undefined : -1}
            key={index}
            onClick={(event) => {
              event.stopPropagation();
              surface.select(target);
            }}
            onContextMenu={(event) => surface.openMenu(target, event)}
            onFocus={(event) => {
              if (!(event.target as HTMLElement).closest(".legacy-field-item"))
                surface.select(target);
            }}
          >
            {!surface.readOnly ? (
              <NodeToolbar>
                <button
                  aria-label={t("editor.dragEmbed")}
                  title={t("editor.dragEmbed")}
                  className="node-control legacy-drag-handle legacy-embed-handle"
                  type="button"
                >
                  <GripVertical size={14} />
                </button>
                <QuickColor
                  value={embed.color}
                  change={(color) => patch(index, { color })}
                />
                {!url(embed.thumbnail) ? (
                  <EmbedMediaEditor
                    actions={actions}
                    change={(value) => patchMedia(index, "thumbnail", value)}
                    field="thumbnail"
                    value=""
                  />
                ) : null}
                {!url(embed.image) ? (
                  <EmbedMediaEditor
                    actions={actions}
                    change={(value) => patchMedia(index, "image", value)}
                    field="image"
                    value=""
                  />
                ) : null}
                <button
                  aria-label={`${t("editor.configure")} ${t("editor.embedSettings")}`}
                  title={`${t("editor.configure")} ${t("editor.embedSettings")}`}
                  className="node-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.configureLegacyEmbed(index);
                  }}
                  type="button"
                >
                  <Settings2 size={14} />
                </button>
                <button
                  aria-label={t("editor.deleteEmbed")}
                  title={t("editor.deleteEmbed")}
                  className="node-control danger-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    update(embeds.filter((_, current) => current !== index));
                    surface.select();
                  }}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  aria-label={`${t("editor.moreActions")}: ${t("editor.embed")}`}
                  aria-haspopup="menu"
                  title={`${t("editor.moreActions")}: ${t("editor.embed")}`}
                  className="node-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    surface.openMenuAt(target, event.currentTarget);
                  }}
                  type="button"
                >
                  <MoreHorizontal size={14} />
                </button>
              </NodeToolbar>
            ) : null}
            <LegacyEmbedPreview
              Inline={Inline}
              actions={actions}
              embed={embed}
              index={index}
              patch={patch}
              patchMedia={patchMedia}
              surface={surface}
            />
            {!surface.readOnly ? (
              <IssueFeedback path={["embeds", index]} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LegacyEmbedPreview({
  actions,
  embed,
  index,
  patch,
  patchMedia,
  Inline,
  surface,
}: Readonly<{
  actions: CanvasActions;
  embed: Record<string, unknown>;
  index: number;
  patch(index: number, value: Record<string, unknown>, editing?: boolean): void;
  patchMedia(index: number, field: "thumbnail" | "image", value: string): void;
  Inline: Inline;
  surface: LegacySurface;
}>) {
  const { i18n, t } = useTranslation();
  const author = recordValue(embed.author);
  const footer = recordValue(embed.footer);

  return (
    <div
      className={`legacy-embed${url(embed.thumbnail) ? " has-thumbnail" : ""}`}
      style={{ borderLeftColor: colorHex(embed.color) }}
    >
      <div className="legacy-embed-content">
        {text(author.name) ? (
          <div className="legacy-embed-author">
            {url(author.icon_url) ? (
              <span className="legacy-embed-icon">
                <RemoteMedia alt="" url={url(author.icon_url)} />
              </span>
            ) : null}
            <a
              href={
                surface.readOnly && isSafeLink(text(author.url))
                  ? text(author.url)
                  : undefined
              }
              rel="noreferrer"
            >
              {text(author.name)}
            </a>
          </div>
        ) : null}
        {text(embed.title) || !surface.readOnly ? (
          <div className="legacy-embed-title">
            <a
              href={
                surface.readOnly && isSafeLink(text(embed.url))
                  ? text(embed.url)
                  : undefined
              }
              rel="noreferrer"
            >
              <Inline
                actions={actions}
                field="title"
                label={t("editor.title")}
                diagnosticPath={["embeds", index, "title"]}
                format="inline"
                maxLength={256}
                placeholder={t("editor.title")}
                setValue={(value) => patch(index, { title: value }, true)}
                value={text(embed.title)}
              />
            </a>
          </div>
        ) : null}
        <Inline
          actions={actions}
          field="description"
          label={t("editor.description")}
          diagnosticPath={["embeds", index, "description"]}
          format="message"
          maxLength={4096}
          multiline
          placeholder={t("editor.description")}
          setValue={(value) => patch(index, { description: value }, true)}
          value={text(embed.description)}
        />
        <LegacyEmbedFields
          Inline={Inline}
          actions={actions}
          embed={embed}
          embedIndex={index}
          patch={patch}
          surface={surface}
        />
      </div>
      {url(embed.thumbnail) ? (
        <div className="legacy-embed-thumbnail">
          <EmbedMediaEditor
            actions={actions}
            change={(value) => patchMedia(index, "thumbnail", value)}
            field="thumbnail"
            readOnly={surface.readOnly}
            value={url(embed.thumbnail)}
          />
        </div>
      ) : null}
      {url(embed.image) ? (
        <div className="legacy-embed-image">
          <EmbedMediaEditor
            actions={actions}
            change={(value) => patchMedia(index, "image", value)}
            field="image"
            readOnly={surface.readOnly}
            value={url(embed.image)}
          />
        </div>
      ) : null}
      {text(footer.text) || text(embed.timestamp) ? (
        <div className="legacy-embed-footer">
          {url(footer.icon_url) ? (
            <span className="legacy-embed-icon">
              <RemoteMedia alt="" url={url(footer.icon_url)} />
            </span>
          ) : null}
          {text(footer.text) ? <span>{text(footer.text)}</span> : null}
          {text(footer.text) && text(embed.timestamp) ? <i>•</i> : null}
          {text(embed.timestamp) ? (
            <time dateTime={text(embed.timestamp)}>
              {timestamp(
                text(embed.timestamp),
                i18n.resolvedLanguage ?? i18n.language,
              )}
            </time>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmbedMediaEditor({
  actions,
  change,
  field,
  readOnly = false,
  value,
}: Readonly<{
  actions: CanvasActions;
  change(value: string): void;
  field: "thumbnail" | "image";
  readOnly?: boolean;
  value: string;
}>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const label = t(
    field === "thumbnail" ? "editor.thumbnailUrl" : "editor.imageUrl",
  );
  const alt = t(
    field === "thumbnail" ? "editor.embedThumbnail" : "editor.embedImage",
  );
  if (readOnly) return <RemoteMedia alt={alt} url={value} />;
  return (
    <>
      <button
        aria-label={label}
        className={value ? "embed-media-trigger" : "node-control"}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        ref={anchor}
        title={label}
        type="button"
      >
        {value ? (
          <RemoteMedia alt={alt} url={value} />
        ) : field === "thumbnail" ? (
          <Image aria-hidden="true" size={14} />
        ) : (
          <Images aria-hidden="true" size={14} />
        )}
      </button>
      {open ? (
        <MediaAddressPopover
          anchor={anchor}
          beginEdit={actions.beginEdit}
          change={change}
          close={() => setOpen(false)}
          endEdit={actions.endEdit}
          label={label}
          value={value}
        />
      ) : null}
    </>
  );
}

function LegacyEmbedFields({
  actions,
  embed,
  embedIndex,
  patch,
  Inline,
  surface,
}: Readonly<{
  actions: CanvasActions;
  embed: Record<string, unknown>;
  embedIndex: number;
  patch(index: number, value: Record<string, unknown>, editing?: boolean): void;
  Inline: Inline;
  surface: LegacySurface;
}>) {
  const { t } = useTranslation();
  const fields = recordArray(embed.fields);
  const list = useSortableItems({
    item: ".legacy-field-item",
    handle: ".legacy-field-handle",
    disabled: surface.readOnly,
    onMove: (oldIndex, newIndex) => {
      actions.moveList(["embeds", embedIndex, "fields"], oldIndex, newIndex);
      surface.select({ kind: "field", parent: embedIndex, index: newIndex });
    },
  });
  const update = (next: readonly Record<string, unknown>[], editing = false) =>
    patch(embedIndex, { fields: next }, editing);
  const patchField = (
    index: number,
    value: Record<string, unknown>,
    editing = false,
  ) =>
    update(
      fields.map((field, current) =>
        current === index ? { ...field, ...value } : field,
      ),
      editing,
    );
  if (!fields.length)
    return surface.readOnly ? null : (
      <AddRow
        label={t("editor.addField")}
        onClick={() =>
          update([...fields, { name: "", value: "", inline: false }])
        }
      />
    );

  return (
    <div className="legacy-fields" ref={list}>
      {fields.map((field, index) => {
        const target: LegacyTarget = {
          kind: "field",
          index,
          parent: embedIndex,
        };
        return (
          <div
            className={`legacy-field-item editor-node${field.inline ? " is-inline" : " is-block"}${isSelected(surface.selected, target) ? " is-selected" : ""}`}
            style={
              {
                "--field-span": fieldSpan(
                  fields,
                  index,
                  url(embed.thumbnail) ? 2 : 3,
                ),
              } as CSSProperties
            }
            data-index={index}
            data-editor-path={JSON.stringify([
              "embeds",
              embedIndex,
              "fields",
              index,
            ])}
            tabIndex={surface.readOnly ? undefined : -1}
            key={index}
            onClick={(event) => {
              event.stopPropagation();
              surface.select(target);
            }}
            onContextMenu={(event) => surface.openMenu(target, event)}
            onFocus={() => surface.select(target)}
          >
            {!surface.readOnly ? (
              <NodeToolbar>
                <button
                  aria-label={t("editor.dragField")}
                  className="node-control legacy-drag-handle legacy-field-handle"
                  type="button"
                >
                  <GripVertical size={13} />
                </button>
                <button
                  aria-label={
                    field.inline
                      ? t("editor.makeBlock")
                      : t("editor.makeInline")
                  }
                  className="node-control"
                  aria-pressed={Boolean(field.inline)}
                  onClick={(event) => {
                    event.stopPropagation();
                    patchField(index, { inline: !field.inline });
                  }}
                  title={
                    field.inline
                      ? t("editor.makeBlock")
                      : t("editor.makeInline")
                  }
                  type="button"
                >
                  <Columns3 size={13} />
                </button>
                <button
                  aria-label={t("editor.deleteField")}
                  className="node-control danger-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    update(fields.filter((_, current) => current !== index));
                    surface.select({ kind: "embed", index: embedIndex });
                  }}
                  type="button"
                >
                  <Trash2 size={13} />
                </button>
                <button
                  aria-label={`${t("editor.moreActions")}: ${t("editor.field")}`}
                  aria-haspopup="menu"
                  className="node-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    surface.openMenuAt(target, event.currentTarget);
                  }}
                  type="button"
                >
                  <MoreHorizontal size={13} />
                </button>
              </NodeToolbar>
            ) : null}
            <div className="legacy-field-name">
              <Inline
                actions={actions}
                field="name"
                diagnosticPath={["embeds", embedIndex, "fields", index, "name"]}
                format="inline"
                label={t("editor.fieldName")}
                maxLength={256}
                placeholder={t("editor.field")}
                setValue={(value) => patchField(index, { name: value }, true)}
                value={text(field.name)}
              />
            </div>
            <Inline
              actions={actions}
              field="value"
              diagnosticPath={["embeds", embedIndex, "fields", index, "value"]}
              format="message"
              label={t("editor.fieldValue")}
              maxLength={1_024}
              multiline
              placeholder={t("editor.fieldValue")}
              setValue={(value) => patchField(index, { value }, true)}
              value={text(field.value)}
            />
          </div>
        );
      })}
      {!surface.readOnly && fields.length < 25 ? (
        <AddRow
          label={t("editor.addField")}
          onClick={() =>
            update([...fields, { name: "", value: "", inline: false }])
          }
        />
      ) : null}
    </div>
  );
}

function MessageAttachments({
  actions,
  attachments,
  surface,
}: Readonly<{
  actions: CanvasActions;
  attachments: readonly Record<string, unknown>[];
  surface: LegacySurface;
}>) {
  const { t } = useTranslation();
  const list = useSortableItems({
    item: ".legacy-attachment-item",
    handle: ".legacy-attachment-handle",
    disabled: surface.readOnly,
    onMove: (oldIndex, newIndex) => {
      actions.moveList(["attachments"], oldIndex, newIndex);
      surface.select({ kind: "attachment", index: newIndex });
    },
  });
  const update = (next: readonly Record<string, unknown>[], editing = false) =>
    actions.updateMessage("attachments", next, editing);
  return (
    <div className="legacy-attachments" ref={list}>
      {attachments.map((attachment, index) => {
        const target: LegacyTarget = { kind: "attachment", index };
        return (
          <div
            className={`legacy-attachment-item editor-node discord-file${isSelected(surface.selected, target) ? " is-selected" : ""}`}
            data-editor-path={JSON.stringify(["attachments", index])}
            tabIndex={surface.readOnly ? undefined : -1}
            data-index={index}
            key={index}
            onClick={(event) => {
              event.stopPropagation();
              surface.select(target);
            }}
            onContextMenu={(event) => surface.openMenu(target, event)}
          >
            {!surface.readOnly ? (
              <NodeToolbar>
                <button
                  aria-label={t("editor.dragAttachment")}
                  className="node-control legacy-drag-handle legacy-attachment-handle"
                  type="button"
                >
                  <GripVertical size={14} />
                </button>
                <button
                  aria-label={t("editor.deleteAttachment")}
                  className="node-control danger-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    update(
                      attachments.filter((_, current) => current !== index),
                    );
                    surface.select();
                  }}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  aria-label={`${t("editor.moreActions")}: ${t("editor.attachment")}`}
                  aria-haspopup="menu"
                  className="node-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    surface.openMenuAt(target, event.currentTarget);
                  }}
                  type="button"
                >
                  <MoreHorizontal size={14} />
                </button>
              </NodeToolbar>
            ) : null}
            <File aria-hidden="true" size={18} />
            <span className="discord-file-name">
              {text(attachment.filename) || t("editor.attachment")}
            </span>
            {!surface.readOnly ? (
              <IssueFeedback path={["attachments", index]} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The Legacy canvas uses the same concise action vocabulary as component nodes. */
function LegacyMenu({
  actions,
  close,
  select,
  document,
  state,
}: Readonly<{
  actions: CanvasActions;
  close(): void;
  select: LegacySurface["select"];
  document: DiscordMessagePayload;
  state: { target: LegacyTarget; x: number; y: number; fromControl?: boolean };
}>) {
  const { t } = useTranslation();
  const payload = document as Record<string, unknown>;
  const embeds = recordArray(payload.embeds);
  const attachments = recordArray(payload.attachments);
  const poll = recordValue(payload.poll);
  const answers = recordArray(poll.answers);
  const target = state.target;
  const done = (operation: () => void) => {
    operation();
    close();
  };
  const itemCount =
    target.kind === "embed"
      ? embeds.length
      : target.kind === "attachment"
        ? attachments.length
        : target.kind === "field"
          ? recordArray(embeds[target.parent]?.fields).length
          : target.kind === "answer"
            ? answers.length
            : 1;
  const index = target.index ?? 0;
  const move = (direction: -1 | 1) =>
    done(() => {
      if (target.kind === "embed")
        actions.moveList(["embeds"], index, index + direction);
      if (target.kind === "attachment")
        actions.moveList(["attachments"], index, index + direction);
      if (target.kind === "field")
        actions.moveList(
          ["embeds", target.parent, "fields"],
          index,
          index + direction,
        );
      if (target.kind === "answer")
        actions.updateMessage("poll", {
          ...poll,
          answers: moveItem(answers, index, index + direction),
        });
      select({ ...target, index: index + direction });
    });
  const duplicate = () =>
    done(() => {
      if (target.kind === "embed")
        actions.updateMessage("embeds", [
          ...embeds.slice(0, index + 1),
          structuredClone(embeds[index]!),
          ...embeds.slice(index + 1),
        ]);
      if (target.kind === "attachment")
        actions.updateMessage("attachments", [
          ...attachments.slice(0, index + 1),
          structuredClone(attachments[index]!),
          ...attachments.slice(index + 1),
        ]);
      if (target.kind === "field") {
        const fields = recordArray(embeds[target.parent]?.fields);
        const next = [
          ...fields.slice(0, index + 1),
          structuredClone(fields[index]!),
          ...fields.slice(index + 1),
        ];
        actions.updateMessage(
          "embeds",
          embeds.map((embed, current) =>
            current === target.parent ? { ...embed, fields: next } : embed,
          ),
        );
      }
      if (target.kind === "answer")
        actions.updateMessage("poll", {
          ...poll,
          answers: [
            ...answers.slice(0, index + 1),
            structuredClone(answers[index]!),
            ...answers.slice(index + 1),
          ],
        });
    });
  const remove = () =>
    done(() => {
      if (target.kind === "embed")
        actions.updateMessage(
          "embeds",
          embeds.filter((_, current) => current !== index),
        );
      if (target.kind === "attachment")
        actions.updateMessage(
          "attachments",
          attachments.filter((_, current) => current !== index),
        );
      if (target.kind === "field") {
        const fields = recordArray(embeds[target.parent]?.fields).filter(
          (_, current) => current !== index,
        );
        actions.updateMessage(
          "embeds",
          embeds.map((embed, current) =>
            current === target.parent ? { ...embed, fields } : embed,
          ),
        );
      }
      if (target.kind === "answer")
        actions.updateMessage("poll", {
          ...poll,
          answers: answers.filter((_, current) => current !== index),
        });
      select(
        target.kind === "field"
          ? { kind: "embed", index: target.parent }
          : target.kind === "answer"
            ? { kind: "poll" }
            : undefined,
      );
    });
  const canDuplicate =
    (target.kind === "embed" && embeds.length < 10) ||
    (target.kind === "field" &&
      recordArray(embeds[target.parent]?.fields).length < 25) ||
    (target.kind === "answer" && answers.length < 10) ||
    target.kind === "attachment";
  const canDelete = target.kind !== "answer" || answers.length > 2;
  const configure = () =>
    done(() => {
      if (target.kind === "embed") actions.configureLegacyEmbed(index);
    });

  return (
    <EditorMenu
      close={close}
      className="editor-popover node-menu legacy-node-menu"
      gap={0}
      placement={state.fromControl ? "top-start" : "bottom-start"}
      point={state}
      role="menu"
    >
      {target.kind === "embed" ? (
        <button onClick={configure} role="menuitem" type="button">
          <Settings2 size={15} />
          <span>{t("editor.configure")}</span>
        </button>
      ) : null}
      {canDuplicate ? (
        <button onClick={duplicate} role="menuitem" type="button">
          <Copy size={15} />
          <span>{t("app.duplicate")}</span>
        </button>
      ) : null}
      {itemCount > 1 ? (
        <>
          <div className="menu-separator" />
          {index > 0 ? (
            <button onClick={() => move(-1)} role="menuitem" type="button">
              <Rows3 size={15} />
              <span>{t("editor.moveUp")}</span>
            </button>
          ) : null}
          {index < itemCount - 1 ? (
            <button onClick={() => move(1)} role="menuitem" type="button">
              <Rows3 size={15} />
              <span>{t("editor.moveDown")}</span>
            </button>
          ) : null}
        </>
      ) : null}
      {canDelete ? (
        <>
          <div className="menu-separator" />
          <button
            className="danger"
            onClick={remove}
            role="menuitem"
            type="button"
          >
            <Trash2 size={15} />
            <span>{t("app.delete")}</span>
          </button>
        </>
      ) : null}
    </EditorMenu>
  );
}

function moveItem<T>(
  items: readonly T[],
  oldIndex: number,
  newIndex: number,
): readonly T[] {
  if (oldIndex === newIndex) return items;
  const next = [...items];
  const [item] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, item!);
  return next;
}

function isSelected(selected: LegacyTarget | undefined, target: LegacyTarget) {
  return (
    selected?.kind === target.kind &&
    selected.index === target.index &&
    targetParent(selected) === targetParent(target)
  );
}

function targetParent(target: LegacyTarget) {
  return "parent" in target ? target.parent : undefined;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function recordArray(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
function url(value: unknown) {
  return text(value) || text(recordValue(value).url);
}
function timestamp(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
function fieldSpan(
  fields: readonly Record<string, unknown>[],
  index: number,
  columns: number,
) {
  if (!fields[index].inline) return 12;
  let start = index;
  let end = index + 1;
  while (start > 0 && fields[start - 1].inline) start -= 1;
  while (end < fields.length && fields[end].inline) end += 1;
  const rowStart = start + Math.floor((index - start) / columns) * columns;
  return 12 / Math.min(columns, end - rowStart);
}
