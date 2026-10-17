import { Flag } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { defaultLocale } from "../app/i18n";
import { kitsPath } from "../app/routes";
import {
  readKit,
  toPokkanKit,
  recoveredKitName,
  type Kit,
} from "../features/kits/domain";
import {
  getSharedKit,
  saveSharedKit,
  type SharedAccess,
} from "../features/kits/sharing";
import { kitStore } from "../features/kits/store";
import { ApiError, discordLoginUrl, rememberAuthFragment } from "../shared/api";
import { PageMeta } from "../shared/PageMeta";
import { useSession } from "../shared/session";
import { KitEditor, type SharedKitEditing } from "./KitEditorPage";
import { ACCESS_FRESH_FOR, onForeground } from "../shared/foreground";

export function SharedKitPage() {
  const { id = "", locale = defaultLocale } = useParams();
  const { hash } = useLocation();
  const session = useSession();
  const { t } = useTranslation();
  const fragment = hash.slice(1);
  const manager = fragment.startsWith("manage=");
  const token = manager ? fragment.slice(7) : fragment;
  return (
    <>
      <PageMeta
        title={t("sharing.title")}
        description={t("meta.editorDescription")}
        indexable={false}
      />
      {session.loading ? (
        <p role="status">{t("app.loading")}</p>
      ) : (
        <SharedKitResource
          key={`${id}:${token}:${session.account?.id ?? "guest"}`}
          access={{ id, token, manager }}
          locale={locale}
          accountId={session.account?.id}
        />
      )}
    </>
  );
}

function SharedKitResource({
  access,
  locale,
  accountId,
}: Readonly<{ access: SharedAccess; locale: string; accountId?: string }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [base, setBase] = useState<Kit>();
  const [draft, setDraft] = useState<Kit>();
  const [error, setError] = useState<string>();
  const [needsAuthorization, setNeedsAuthorization] = useState(false);
  const [expires, setExpires] = useState<string>();
  const [recoveredId, setRecoveredId] = useState<string>();
  const baseRef = useRef<Kit | undefined>(undefined);
  const draftRef = useRef<Kit | undefined>(undefined);
  const version = useRef(0);
  const pending = useRef(false);
  const readRequest = useRef<ReturnType<typeof getSharedKit> | undefined>(
    undefined,
  );
  const checkedAt = useRef(0);
  const retryAt = useRef(0);
  const persistenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const recoveryDirty = useRef(false);
  const recoveryRead = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const storageKey = `pokkan.shared-drafts.${accountId ?? "guest"}.${access.id}.${access.manager ? "manage" : "link"}`;
  useEffect(() => {
    // Old recovery records cannot be attributed to an account safely.
    try {
      sessionStorage.removeItem(
        `pokkan.shared-drafts.${access.id}.${access.manager ? "manage" : "link"}`,
      );
    } catch {
      /* Storage can be disabled. */
    }
  }, [access.id, access.manager]);

  const flushDraft = useCallback(() => {
    clearTimeout(persistenceTimer.current);
    persistenceTimer.current = undefined;
    if (!recoveryDirty.current) return;
    const next = draftRef.current;
    try {
      if (next) sessionStorage.setItem(storageKey, JSON.stringify(next));
      else sessionStorage.removeItem(storageKey);
      recoveryDirty.current = false;
    } catch {
      /* Editing stays available when tab recovery storage is full. */
    }
  }, [storageKey]);

  const rememberDraft = useCallback(
    (next?: Kit, deferred = false) => {
      draftRef.current = next;
      setDraft(next);
      recoveryDirty.current = true;
      if (deferred) persistenceTimer.current ??= setTimeout(flushDraft, 400);
      else flushDraft();
    },
    [flushDraft],
  );

  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };
    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      flushDraft();
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [flushDraft]);

  const invalidate = useCallback(
    (reason: unknown) => {
      if (
        reason instanceof ApiError &&
        [401, 403, 404].includes(reason.status)
      ) {
        baseRef.current = undefined;
        setBase(undefined);
        rememberDraft();
      }
      setNeedsAuthorization(
        reason instanceof ApiError && reason.status === 401,
      );
      setError(
        reason instanceof ApiError && [403, 404].includes(reason.status)
          ? t("sharing.unavailable")
          : reason instanceof Error
            ? reason.message
            : t("sharing.unavailable"),
      );
    },
    [rememberDraft, t],
  );

  const load = useCallback(
    async (replace = false) => {
      if (!replace && Date.now() < retryAt.current) return;
      const generation = ++version.current;
      checkedAt.current = Date.now();
      pending.current = true;
      try {
        if (!/^[A-Za-z0-9_-]{43}$/.test(access.token))
          throw new ApiError(404, t("sharing.unavailable"));
        const operation =
          !replace && readRequest.current
            ? readRequest.current
            : getSharedKit(access);
        readRequest.current = operation;
        const response = await operation.finally(() => {
          if (readRequest.current === operation)
            readRequest.current = undefined;
        });
        if (generation !== version.current) return;
        baseRef.current = response.kit;
        setBase(response.kit);
        setExpires(
          response.expires_at ?? response.share?.expires_at ?? undefined,
        );
        setError(undefined);
        setNeedsAuthorization(false);
        if (replace) {
          const pendingDraft = draftRef.current;
          if (pendingDraft) {
            const recovered = kitStore.import(
              recoveredKitName(pendingDraft.name, (name) =>
                t("app.recoveredName", { name }),
              ),
              JSON.stringify(toPokkanKit(pendingDraft)),
            );
            setRecoveredId(recovered.id);
          }
          rememberDraft();
        } else if (!recoveryRead.current && response.kit.can_edit) {
          recoveryRead.current = true;
          try {
            const recovered = readKit(
              JSON.parse(sessionStorage.getItem(storageKey) ?? "null"),
            );
            if (recovered.id === response.kit.id) rememberDraft(recovered);
          } catch {
            /* There may be no pending edit for this link and account. */
          }
        }
      } catch (reason) {
        if (generation === version.current) {
          retryAt.current =
            Date.now() +
            (reason instanceof ApiError && reason.status === 429
              ? (reason.retryAfter ?? 60) * 1000
              : ACCESS_FRESH_FOR);
          invalidate(reason);
          throw reason;
        }
      } finally {
        if (generation === version.current) pending.current = false;
      }
    },
    [
      access.id,
      access.token,
      access.manager,
      accountId,
      invalidate,
      rememberDraft,
      storageKey,
      t,
    ],
  );

  useEffect(() => {
    void load().catch(() => undefined);
    const refresh = () => {
      if (
        !pending.current &&
        Date.now() - checkedAt.current >= ACCESS_FRESH_FOR
      )
        void load().catch(() => undefined);
    };
    const stop = onForeground(refresh);
    return () => {
      version.current += 1;
      stop();
    };
  }, [load]);
  useEffect(() => {
    if (!expires) return;
    let timeout: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = Date.parse(expires) - Date.now();
      if (remaining <= 0) void load().catch(() => undefined);
      else timeout = setTimeout(check, Math.min(remaining + 50, 2_147_483_647));
    };
    check();
    return () => clearTimeout(timeout);
  }, [expires, load]);

  const update = useCallback<SharedKitEditing["update"]>(
    (patch, deferred = false) => {
      if (baseRef.current?.can_edit !== true) return;
      rememberDraft(
        { ...(draftRef.current ?? baseRef.current), ...patch },
        deferred,
      );
    },
    [rememberDraft],
  );

  const save = useCallback(async () => {
    flushDraft();
    const submitted = draftRef.current ?? baseRef.current;
    if (!submitted || baseRef.current?.can_edit !== true) return;
    try {
      const saved = await saveSharedKit(access, submitted);
      if (!mounted.current || !baseRef.current) return;
      const authorizedSave = { ...saved, can_edit: baseRef.current.can_edit };
      version.current += 1; // A read begun before this save cannot replace its revision.
      readRequest.current = undefined;
      pending.current = false;
      baseRef.current = authorizedSave;
      setBase(authorizedSave);
      if (draftRef.current === submitted) rememberDraft();
      else if (draftRef.current)
        rememberDraft({ ...draftRef.current, revision: saved.revision });
    } catch (reason) {
      if (
        mounted.current &&
        reason instanceof ApiError &&
        [401, 403, 404].includes(reason.status)
      )
        invalidate(reason);
      throw reason;
    }
  }, [
    access.id,
    access.token,
    access.manager,
    invalidate,
    rememberDraft,
    flushDraft,
  ]);

  const kit =
    base?.can_edit === true && draft ? { ...draft, can_edit: true } : base;
  return (
    <>
      {recoveredId ? (
        <p role="status" className="field-helper">
          {t("app.workRecovered")}{" "}
          <Link to={kitsPath(locale, recoveredId)}>
            {t("app.openRecovered")}
          </Link>
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {kit ? (
        <KitEditor
          kit={kit}
          locale={locale}
          canEdit={base?.can_edit === true}
          shared={{
            dirty: Boolean(draft),
            update,
            save,
            discard: () => rememberDraft(),
            reload: () => load(true),
            copy: () => {
              const copy = kitStore.import(
                kit.name,
                JSON.stringify(toPokkanKit(kit)),
              );
              navigate(kitsPath(locale, copy.id));
            },
            ...(access.manager
              ? { manager: { id: access.id, token: access.token, expires } }
              : {}),
          }}
        />
      ) : error ? (
        <div className="actions">
          <Link className="button" to={kitsPath(locale)}>
            {t("app.kits")}
          </Link>
          {needsAuthorization || !accountId ? (
            <a
              className="button primary"
              href={discordLoginUrl()}
              onClick={() => rememberAuthFragment()}
            >
              {t(accountId ? "contexts.authorize" : "app.signIn")}
            </a>
          ) : null}
        </div>
      ) : (
        <p role="status">{t("app.loading")}</p>
      )}
      <p>
        <Link
          className="icon-button"
          aria-label={t("app.report")}
          title={t("app.report")}
          to={`/${locale}/report?${access.manager ? "temporary" : "share"}=${access.id}#${access.token}`}
        >
          <Flag aria-hidden="true" size={16} />
        </Link>
      </p>
    </>
  );
}
