import {
  NotepadText,
  Braces,
  CircleAlert,
  SendHorizontal,
  MessageSquare,
  Redo2,
  Save,
  X,
  Trash2,
  Undo2,
  LayoutGrid,
  Share2,
  Copy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import {
  ComponentSheet,
  LegacyEmbedSheet,
  MessageReferenceSheet,
  MessageSettingsSheet,
} from "../features/editor/ComponentSheet";
import {
  EditorCanvas,
  type CanvasActions,
} from "../features/editor/EditorCanvas";
import { kitsPath, sendKitPath } from "../app/routes";
import { JsonSheet } from "../features/editor/JsonSheet";
import { PlaceholderSheet } from "../features/editor/PlaceholderSheet";
import { ShortcutsSheet } from "../features/editor/ShortcutsSheet";
import { ValidationSheet } from "../features/editor/ValidationSheet";
import { useKitPreview } from "../features/kits/useKitPreview";
import { KitNameInput } from "../features/kits/KitNameInput";
import { ShareSheet } from "../features/kits/ShareSheet";
import type { ShareManager } from "../features/kits/sharing";
import { focusCanvasIssue } from "../features/editor/CanvasIssues";
import {
  validateMessage,
  type ComponentPath,
  type EditorIssue,
} from "../features/editor/schema";
import {
  canCopyComponent,
  canDuplicateComponent,
  canMoveWithinParent,
  canPasteComponent,
  canRemoveComponent,
  canMoveComponent,
  moveListItem,
  moveWithinParent,
  nodeAt,
  parentNodePath,
  removeComponent,
  setButtonStyle,
  tryDuplicateComponent,
  tryInsertComponent,
  tryInsertLegacyRow,
  tryMoveComponent,
  trySetSectionAccessory,
  tryPasteComponent,
  trySetMessageField,
  trySetNodeField,
  type MutationResult,
} from "../features/editor/tree";
import { useDocumentEditor } from "../features/editor/useDocumentEditor";
import {
  messageFormat,
  type Kit,
  type DiscordMessagePayload,
} from "../features/kits/domain";
import { kitStore } from "../features/kits/store";
import { deleteKit, getKit, saveKit } from "../features/kits/api";
import { refreshSession, useSession } from "../shared/session";
import { loadContexts, selectContext, useContexts } from "../shared/contexts";
import { clearServerMetadata } from "../shared/serverMetadata";
import { useNotice } from "../shared/notifications";
import { useKits } from "../shared/useKits";
import { PageMeta } from "../shared/PageMeta";
import { defaultLocale } from "../app/i18n";
import { ApiError } from "../shared/api";

export function KitEditorPage() {
  const { t } = useTranslation();
  const { locale = defaultLocale, id } = useParams();
  const kits = useKits();
  const session = useSession();
  const contexts = useContexts(session.account?.id);
  const navigate = useNavigate();
  const local = kits.find((item) => item.id === id);
  const [verified, setVerified] = useState<{
    id: string;
    accountId: string;
    kit?: Kit;
    error?: string;
  }>();
  const [alignedId, setAlignedId] = useState<string>();
  const selectingContext = useRef<string | undefined>(undefined);
  const localDrafts = useRef(new Set<string>());
  const localKey = `${session.account?.id ?? "guest"}:${id}`;
  if (local && !kitStore.isSaved(local.id) && local.revision === undefined)
    localDrafts.current.add(localKey);
  const needsFetch = Boolean(
    session.account && id && !localDrafts.current.has(localKey),
  );

  useEffect(() => {
    if (!id || !session.account || !needsFetch) return;
    let active = true;
    setVerified(undefined);
    setAlignedId(undefined);
    selectingContext.current = undefined;
    let pending = false;
    const load = () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      void getKit(id)
        .then((kit) => {
          if (!active) return;
          kitStore.upsertSaved(kit, session.account!.id);
          setVerified({ id, accountId: session.account!.id, kit });
        })
        .catch((error: unknown) => {
          if (!active) return;
          const denied =
            error instanceof ApiError && [401, 403, 404].includes(error.status);
          if (denied) {
            kitStore.removeSaved(id);
            clearServerMetadata();
            if (error.status === 401) void refreshSession();
            else void loadContexts(session.account!.id);
          }
          setVerified((current) =>
            current?.kit && !denied
              ? current
              : {
                  id,
                  accountId: session.account!.id,
                  error:
                    error instanceof Error
                      ? error.message
                      : t("app.kitLoadFailed"),
                },
          );
        })
        .finally(() => {
          pending = false;
        });
    };
    load();
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [id, session.account?.id, needsFetch, t]);

  const currentVerified =
    verified?.id === id && verified?.accountId === session.account?.id
      ? verified
      : undefined;
  const authorized = !needsFetch || Boolean(currentVerified?.kit);
  const kit = authorized ? kitStore.find(id ?? "") : undefined;
  const ownerContext = (currentVerified?.kit ?? kit)?.guild_id ?? "personal";
  const serverAvailable =
    ownerContext === "personal" ||
    contexts.guilds.some(
      (guild) => guild.id === ownerContext && guild.status === "installed",
    );

  useEffect(() => {
    if (!kit || !session.account || contexts.loading) return;
    if (contexts.selected_context_id === ownerContext) {
      setAlignedId(id);
      return;
    }
    if (alignedId === id || !authorized) {
      navigate(kitsPath(locale));
      return;
    }
    if (selectingContext.current === `${id}:${ownerContext}`) return;
    selectingContext.current = `${id}:${ownerContext}`;
    let active = true;
    void selectContext(session.account.id, ownerContext)
      .then(() => {
        if (active) setAlignedId(id);
      })
      .catch(() => {
        if (active) navigate(kitsPath(locale));
      })
      .finally(() => {
        if (selectingContext.current === `${id}:${ownerContext}`)
          selectingContext.current = undefined;
      });
    return () => {
      active = false;
    };
  }, [
    alignedId,
    authorized,
    contexts.loading,
    contexts.selected_context_id,
    id,
    kit,
    locale,
    navigate,
    ownerContext,
    session.account?.id,
  ]);

  if (session.loading || (needsFetch && !currentVerified))
    return <p role="status">{t("app.loading")}</p>;
  if (
    session.account &&
    kit &&
    !contexts.loading &&
    contexts.selected_context_id === ownerContext &&
    !serverAvailable
  )
    return <p role="alert">{t("contexts.unavailable")}</p>;
  if (
    session.account &&
    kit &&
    (contexts.loading || contexts.selected_context_id !== ownerContext)
  )
    return <p role="status">{t("app.loading")}</p>;

  if (!kit)
    return (
      <div className="workspace-intro">
        <PageMeta
          description={t("meta.kitsDescription")}
          indexable={false}
          title={t("app.kits")}
        />
        <p>{currentVerified?.error ?? t("app.noKits")}</p>
        <Link className="button primary" to={kitsPath(locale)}>
          {t("app.newKit")}
        </Link>
      </div>
    );
  return (
    <KitEditor
      key={kit.id}
      kit={kit}
      locale={locale}
      canEdit={currentVerified?.kit?.can_edit !== false}
    />
  );
}

export interface SharedKitEditing {
  dirty: boolean;
  update(
    patch: Partial<
      Pick<Kit, "name" | "message" | "arguments" | "placeholders">
    >,
  ): void;
  save(): Promise<void>;
  discard(): void;
  reload(): Promise<void>;
  copy(): void;
  manager?: ShareManager;
}

export function KitEditor({
  kit,
  locale,
  canEdit,
  shared,
}: Readonly<{
  kit: Kit;
  locale: string;
  canEdit: boolean;
  shared?: SharedKitEditing;
}>) {
  const { t, i18n } = useTranslation();
  const { notify } = useNotice();
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState<ComponentPath>();
  const [clipboard, setClipboard] = useState<unknown>();
  const [sheet, setSheet] = useState<
    | "message"
    | "reference"
    | "component"
    | "embed"
    | "placeholders"
    | "json"
    | "shortcuts"
    | "validation"
  >();
  const [selectedEmbed, setSelectedEmbed] = useState<number>();
  const [previewPlaceholders, setPreviewPlaceholders] = useState(true);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [accessLost, setAccessLost] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [sharing, setSharing] = useState(false);
  const titleButton = useRef<HTMLButtonElement>(null);
  const editable = canEdit && !accessLost;
  const session = useSession();
  const contexts = useContexts(session.account?.id);
  const { placeholders, references } = useKitPreview(kit);
  const updateKit = useCallback(
    (
      patch: Partial<
        Pick<Kit, "name" | "message" | "arguments" | "placeholders">
      >,
    ) => {
      if (shared) shared.update(patch);
      else kitStore.update(kit.id, patch);
    },
    [kit.id, shared],
  );
  const editor = useDocumentEditor(
    kit.id,
    kit.message,
    useCallback(
      (document: DiscordMessagePayload) => {
        updateKit({ message: document });
      },
      [updateKit],
    ),
  );
  const issues = useMemo(
    () => validateMessage(editor.document),
    [editor.document, i18n.resolvedLanguage],
  );
  const errors = useMemo(
    () => issues.filter((issue) => issue.level === "error"),
    [issues],
  );
  const dirty = shared?.dirty ?? kitStore.isDirty(kit.id);

  const commit = useCallback(
    (result: MutationResult, kind: "edit" | "structural" = "structural") => {
      if (!result.ok) {
        notify(result.reason, "error");
        return;
      }
      editor.change(result.document, kind);
    },
    [editor, notify],
  );

  useEffect(() => {
    setSelectedPath(undefined);
    setSelectedEmbed(undefined);
    setSheet(undefined);
  }, [kit.id]);

  const save = useCallback(async () => {
    editor.endEdit();
    if (
      (!session.account && !shared) ||
      !editable ||
      conflict ||
      (!shared && contexts.selected_context_id !== (kit.guild_id ?? "personal"))
    )
      return;
    setSaving(true);
    try {
      if (shared) await shared.save();
      else {
        const submitted = kitStore.find(kit.id) ?? kit;
        kitStore.markSaved(
          await saveKit(submitted),
          session.account!.id,
          submitted,
        );
      }
      setConflict(false);
      notify(t("app.kitSaved"), "success");
    } catch (error) {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        setAccessLost(true);
        clearServerMetadata();
        if (!shared && session.account) void loadContexts(session.account.id);
      }
      if (error instanceof ApiError && error.code === "kit_conflict") {
        setConflict(true);
        notify(t("app.kitConflict"), "error");
        return;
      }
      notify(
        error instanceof Error ? error.message : t("app.kitSaveFailed"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }, [
    editable,
    conflict,
    contexts.selected_context_id,
    editor,
    kit,
    notify,
    session.account,
    shared,
    t,
  ]);

  const discard = useCallback(() => {
    if (shared) shared.discard();
    else kitStore.discard(kit.id);
  }, [kit.id, shared]);

  const removeKit = useCallback(async () => {
    if (!editable || shared) return;
    try {
      if (session.account && kitStore.isSaved(kit.id))
        await deleteKit(kit.id, kit.revision);
      kitStore.remove(kit.id);
      navigate(kitsPath(locale));
    } catch (error) {
      if (error instanceof ApiError && [401, 403, 404].includes(error.status))
        setAccessLost(true);
      notify(
        error instanceof Error ? error.message : t("app.kitDeleteFailed"),
        "error",
      );
      setDeleteArmed(false);
    }
  }, [
    editable,
    kit.id,
    kit.revision,
    locale,
    navigate,
    notify,
    session.account,
    t,
  ]);

  const actions = useMemo<CanvasActions>(
    () => ({
      selectedPath,
      clipboard,
      select(path) {
        setSelectedPath((current) =>
          samePath(current, path) ? current : path,
        );
      },
      beginEdit: editor.beginEdit,
      endEdit: editor.endEdit,
      updateNode(path, field, value, editing = false) {
        commit(
          trySetNodeField(editor.document, path, field, value),
          editing ? "edit" : "structural",
        );
      },
      updateMessage(field, value, editing = false) {
        commit(
          trySetMessageField(editor.document, field, value),
          editing ? "edit" : "structural",
        );
      },
      setButtonStyle(path, style) {
        editor.change(setButtonStyle(editor.document, path, style));
      },
      add(parentPath, kind, index) {
        commit(tryInsertComponent(editor.document, parentPath, kind, index));
      },
      setSectionAccessory(path, kind) {
        commit(trySetSectionAccessory(editor.document, path, kind));
      },
      addLegacyRow(kind, index) {
        commit(tryInsertLegacyRow(editor.document, kind, index));
      },
      remove(path) {
        if (!canRemoveComponent(editor.document, path)) return;
        const parent = parentNodePath(path);
        const parentNode = parent ? nodeAt(editor.document, parent) : undefined;
        const parentWillClose =
          Array.isArray(parentNode?.components) &&
          parentNode.components.length === 1 &&
          parentNode.type === 1;
        editor.change(removeComponent(editor.document, path));
        setSelectedPath(
          parentWillClose && parent ? parentNodePath(parent) : parent,
        );
      },
      duplicate(path) {
        if (canDuplicateComponent(editor.document, path))
          commit(tryDuplicateComponent(editor.document, path));
      },
      copy(path) {
        if (!canCopyComponent(editor.document, path)) return;
        const node = nodeAt(editor.document, path);
        if (node) setClipboard(structuredClone(node));
      },
      paste(parentPath, index) {
        if (
          clipboard &&
          canPasteComponent(editor.document, parentPath, clipboard)
        )
          commit(
            tryPasteComponent(editor.document, parentPath, clipboard, index),
          );
      },
      move(path, direction) {
        const parent = parentNodePath(path);
        const last = path.at(-1);
        const index = typeof last === "number" ? last : undefined;
        if (
          parent &&
          index !== undefined &&
          canMoveWithinParent(editor.document, path, direction)
        )
          editor.change(
            moveWithinParent(editor.document, parent, index, direction),
          );
      },
      moveList(path, oldIndex, newIndex) {
        editor.change(moveListItem(editor.document, path, oldIndex, newIndex));
      },
      drag(source, destination, oldIndex, newIndex) {
        commit(
          tryMoveComponent(
            editor.document,
            source,
            destination,
            oldIndex,
            newIndex,
          ),
        );
      },
      canDrag(source, destination, index) {
        return canMoveComponent(editor.document, source, destination, index);
      },
      configure(path) {
        setSelectedPath(path);
        setSheet("component");
      },
      configureMessage() {
        setSheet("message");
      },
      addLegacyEmbed() {
        const embeds = Array.isArray(editor.document.embeds)
          ? editor.document.embeds
          : [];
        commit(
          trySetMessageField(editor.document, "embeds", [
            ...embeds,
            { title: "", description: "", fields: [] },
          ]),
        );
      },
      addLegacyPoll() {
        commit(
          trySetMessageField(editor.document, "poll", {
            question: { text: "" },
            answers: [
              { poll_media: { text: "" } },
              { poll_media: { text: "" } },
            ],
            duration: 24,
            allow_multiselect: false,
            layout_type: 1,
          }),
        );
      },
      configureMessageReference() {
        if (!editor.document.message_reference)
          commit(
            trySetMessageField(editor.document, "message_reference", {
              type: 0,
              message_id: "",
              fail_if_not_exists: true,
            }),
          );
        setSheet("reference");
      },
      configureLegacyEmbed(index) {
        setSelectedEmbed(index);
        setSheet("embed");
      },
    }),
    [clipboard, commit, editor, selectedPath],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const editing =
        target?.isContentEditable || target?.matches("input, textarea, select");
      const mod = event.ctrlKey || event.metaKey;
      if (editing || target?.closest('[role="dialog"]')) return;
      if (!editable) return;
      if (mod && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        editor.undo();
        return;
      }
      if (
        (mod && event.key.toLowerCase() === "z" && event.shiftKey) ||
        (mod && event.key.toLowerCase() === "y")
      ) {
        event.preventDefault();
        editor.redo();
        return;
      }
      if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
        return;
      }
      if (event.key === "?" || event.key === "F1") {
        event.preventDefault();
        setSheet("shortcuts");
        return;
      }
      // Focused controls own Enter, Escape and their menu navigation.
      if (target?.closest('button, a, [role="menu"]') || !selectedPath) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedPath(parentNodePath(selectedPath));
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        canRemoveComponent(editor.document, selectedPath)
      ) {
        event.preventDefault();
        actions.remove(selectedPath);
        return;
      }
      if (
        mod &&
        event.key.toLowerCase() === "d" &&
        canDuplicateComponent(editor.document, selectedPath)
      ) {
        event.preventDefault();
        actions.duplicate(selectedPath);
        return;
      }
      if (
        mod &&
        event.key.toLowerCase() === "c" &&
        canCopyComponent(editor.document, selectedPath)
      ) {
        event.preventDefault();
        actions.copy(selectedPath);
        return;
      }
      if (
        mod &&
        event.key.toLowerCase() === "x" &&
        canCopyComponent(editor.document, selectedPath) &&
        canRemoveComponent(editor.document, selectedPath)
      ) {
        event.preventDefault();
        actions.copy(selectedPath);
        actions.remove(selectedPath);
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        const parent = parentNodePath(selectedPath);
        const last = selectedPath.at(-1);
        const index = typeof last === "number" ? last + 1 : undefined;
        if (
          parent &&
          index !== undefined &&
          clipboard &&
          canPasteComponent(editor.document, parent, clipboard)
        ) {
          event.preventDefault();
          actions.paste(parent, index);
        }
      }
      if (event.key === "Enter" || (event.altKey && event.key === "Enter")) {
        event.preventDefault();
        actions.configure(selectedPath);
        return;
      }
      if (
        event.altKey &&
        event.key === "ArrowUp" &&
        canMoveWithinParent(editor.document, selectedPath, -1)
      ) {
        event.preventDefault();
        actions.move(selectedPath, -1);
        return;
      }
      if (
        event.altKey &&
        event.key === "ArrowDown" &&
        canMoveWithinParent(editor.document, selectedPath, 1)
      ) {
        event.preventDefault();
        actions.move(selectedPath, 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, editable, editor, save, selectedPath]);

  function selectIssue(issue: EditorIssue) {
    setSheet(undefined);
    window.requestAnimationFrame(() => {
      if (!focusCanvasIssue(issue.path, editable)) setSheet("message");
    });
  }

  return (
    <div className="editor-page">
      <PageMeta
        description={t("meta.editorDescription")}
        indexable={false}
        title={kit.name}
      />
      <header className="editor-head">
        <div className="kit-title-line">
          {messageFormat(kit.message) === "legacy" ? (
            <MessageSquare
              fill="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
              size={18}
            />
          ) : (
            <LayoutGrid
              fill="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
              size={18}
            />
          )}
          <h1>
            {renaming && editable ? (
              <KitNameInput
                inline
                kit={kit}
                change={(name) => updateKit({ name })}
                close={(_changed, restoreFocus) => {
                  setRenaming(false);
                  if (restoreFocus)
                    requestAnimationFrame(() => titleButton.current?.focus());
                }}
              />
            ) : editable ? (
              <button
                ref={titleButton}
                className="kit-title-text"
                title={t("app.renameKit")}
                onClick={() => setRenaming(true)}
                onKeyDown={(event) => {
                  if (event.key === "F2") {
                    event.preventDefault();
                    setRenaming(true);
                  }
                }}
                type="button"
              >
                {kit.name}
              </button>
            ) : (
              <span className="kit-title-text" title={kit.name}>
                {kit.name}
              </span>
            )}
          </h1>
          {!editable || shared ? (
            <span className="kit-readonly-label muted" role="status">
              {shared
                ? t(
                    shared.manager
                      ? "sharing.temporaryCopy"
                      : editable
                        ? "sharing.editAccess"
                        : "sharing.viewAccess",
                  )
                : t("app.readOnlyKit")}
            </span>
          ) : null}
        </div>
        <div className="editor-actions">
          {!shared || shared.manager ? (
            <button
              className="button quiet"
              type="button"
              onClick={() => {
                editor.endEdit();
                setSharing(true);
              }}
            >
              <Share2 aria-hidden="true" size={17} />
              {t("sharing.title")}
            </button>
          ) : null}
          {editable ? (
            <>
              <button
                className="button quiet"
                onClick={() => {
                  editor.endEdit();
                  setSheet("placeholders");
                }}
                type="button"
              >
                <NotepadText aria-hidden="true" size={17} />{" "}
                {t("app.variables")}
              </button>
              <button
                className="button quiet"
                onClick={() => {
                  editor.endEdit();
                  setSheet("json");
                }}
                type="button"
              >
                <Braces aria-hidden="true" size={17} /> {t("app.json")}
              </button>
            </>
          ) : null}
          {issues.length ? (
            <button
              aria-label={t("editor.payloadIssueCount", {
                count: issues.length,
              })}
              className={`payload-status${errors.length ? " is-invalid" : " is-warning"}`}
              onClick={() => setSheet("validation")}
              type="button"
            >
              <CircleAlert
                className="solid-alert-icon"
                fill="currentColor"
                aria-hidden="true"
                size={16}
              />
              {t("editor.payloadIssueCount", { count: issues.length })}
            </button>
          ) : null}
          {editable && dirty ? (
            <button className="button quiet" onClick={discard} type="button">
              <X aria-hidden="true" size={15} /> {t("app.discard")}
            </button>
          ) : null}
          {editable && dirty && (session.account || shared) ? (
            <button
              className="button primary"
              disabled={saving || conflict}
              onClick={() => void save()}
              type="button"
            >
              <Save className="solid-save-icon" aria-hidden="true" size={15} />{" "}
              {saving ? t("app.saving") : t("app.save")}
            </button>
          ) : null}
        </div>
      </header>
      {conflict ? (
        <div className="form-error" role="alert">
          {t("app.kitConflict")}{" "}
          <button
            className="button"
            onClick={() => {
              if (shared) {
                void shared
                  .reload()
                  .then(() => setConflict(false))
                  .catch((error) => notify(error.message, "error"));
              } else {
                kitStore.discard(kit.id);
                window.location.reload();
              }
            }}
            type="button"
          >
            {t("app.reloadLatest")}
          </button>
        </div>
      ) : null}
      {accessLost ? (
        <p className="form-error" role="alert">
          {t("app.kitAccessChanged")}
        </p>
      ) : null}
      {editable ? (
        <EditorCanvas
          issues={issues}
          actions={actions}
          document={editor.document}
          key={kit.id}
          placeholders={placeholders}
          previewPlaceholders={previewPlaceholders}
          references={references}
        />
      ) : (
        <EditorCanvas
          document={editor.document}
          key={kit.id}
          placeholders={placeholders}
          previewPlaceholders={previewPlaceholders}
          references={references}
          readOnly
        />
      )}
      <div className="editor-sticky-dock">
        <div
          className="editor-secondary-actions"
          role="group"
          aria-label={t("app.editor")}
        >
          {editable ? (
            <>
              <button
                aria-label={t("app.undo")}
                className="icon-button"
                disabled={!editor.canUndo}
                onClick={editor.undo}
                title={t("app.undoShortcut")}
                type="button"
              >
                <Undo2 aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("app.redo")}
                className="icon-button"
                disabled={!editor.canRedo}
                onClick={editor.redo}
                title={t("app.redoShortcut")}
                type="button"
              >
                <Redo2 aria-hidden="true" size={17} />
              </button>
            </>
          ) : null}
          {shared ? (
            <button
              className={editable ? "icon-button" : "button quiet"}
              aria-label={t("sharing.importCopy")}
              title={t("sharing.importCopy")}
              type="button"
              onClick={() => {
                editor.endEdit();
                shared.copy();
              }}
            >
              <Copy aria-hidden="true" size={17} />
              {!editable ? t("sharing.importCopy") : null}
            </button>
          ) : (
            <Link
              aria-label={t("app.sendMessage")}
              className="icon-button"
              onClick={() => editor.endEdit()}
              title={t("app.sendMessage")}
              to={sendKitPath(locale, kit.id)}
            >
              <SendHorizontal strokeWidth={1.5} aria-hidden="true" size={17} />
            </Link>
          )}
          {editable && !shared ? (
            <button
              aria-label={
                deleteArmed
                  ? t("app.confirmDeleteKit", { name: kit.name })
                  : t("app.deleteKit")
              }
              className={
                deleteArmed
                  ? "button danger-confirm"
                  : "icon-button danger-icon"
              }
              onBlur={() => setDeleteArmed(false)}
              onClick={() => {
                if (!deleteArmed) {
                  setDeleteArmed(true);
                  return;
                }
                void removeKit();
              }}
              type="button"
            >
              {deleteArmed ? (
                t("app.delete")
              ) : (
                <Trash2 aria-hidden="true" size={17} />
              )}
            </button>
          ) : null}
        </div>
      </div>
      {editable && sheet === "component" ? (
        <ComponentSheet
          actions={actions}
          close={() => setSheet(undefined)}
          document={editor.document}
          path={selectedPath}
        />
      ) : null}
      {editable && sheet === "embed" ? (
        <LegacyEmbedSheet
          actions={actions}
          close={() => setSheet(undefined)}
          document={editor.document}
          index={selectedEmbed}
        />
      ) : null}
      {editable && sheet === "message" ? (
        <MessageSettingsSheet
          actions={actions}
          close={() => setSheet(undefined)}
          document={editor.document}
        />
      ) : null}
      {editable && sheet === "reference" ? (
        <MessageReferenceSheet
          actions={actions}
          close={() => setSheet(undefined)}
          document={editor.document}
        />
      ) : null}
      {editable && sheet === "placeholders" ? (
        <PlaceholderSheet
          change={(items) => updateKit({ placeholders: items })}
          close={() => setSheet(undefined)}
          items={kit.placeholders}
          preview={previewPlaceholders}
          setPreview={setPreviewPlaceholders}
        />
      ) : null}
      {editable && sheet === "json" ? (
        <JsonSheet
          apply={(contract) => {
            editor.change(contract.message);
            updateKit(contract);
          }}
          close={() => setSheet(undefined)}
          kit={{ ...kit, message: editor.document }}
        />
      ) : null}
      {sheet === "shortcuts" ? (
        <ShortcutsSheet close={() => setSheet(undefined)} />
      ) : null}
      {sheet === "validation" ? (
        <ValidationSheet
          close={() => setSheet(undefined)}
          issues={issues}
          select={selectIssue}
        />
      ) : null}
      {sharing ? (
        <ShareSheet
          kit={{ ...kit, message: editor.document }}
          manager={shared?.manager}
          close={() => setSharing(false)}
        />
      ) : null}
    </div>
  );
}

function samePath(a: ComponentPath | undefined, b: ComponentPath | undefined) {
  return Boolean(
    a &&
    b &&
    a.length === b.length &&
    a.every((part, index) => part === b[index]),
  );
}
