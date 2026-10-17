import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { defaultLocale } from "../app/i18n";
import { kitsPath } from "../app/routes";
import { readKit, toPokkanKit, type Kit } from "../features/kits/domain";
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
  const baseRef = useRef<Kit | undefined>(undefined);
  const draftRef = useRef<Kit | undefined>(undefined);
  const version = useRef(0);
  const pending = useRef(false);
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

  const rememberDraft = useCallback(
    (next?: Kit) => {
      draftRef.current = next;
      setDraft(next);
      try {
        if (next) sessionStorage.setItem(storageKey, JSON.stringify(next));
        else sessionStorage.removeItem(storageKey);
      } catch {
        /* Editing stays available when tab recovery storage is full. */
      }
    },
    [storageKey],
  );

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
      const generation = ++version.current;
      pending.current = true;
      try {
        if (!/^[A-Za-z0-9_-]{43}$/.test(access.token))
          throw new ApiError(404, t("sharing.unavailable"));
        const response = await getSharedKit(access);
        if (generation !== version.current) return;
        baseRef.current = response.kit;
        setBase(response.kit);
        setExpires(
          response.expires_at ?? response.share?.expires_at ?? undefined,
        );
        setError(undefined);
        setNeedsAuthorization(false);
        if (replace) rememberDraft();
        else if (!recoveryRead.current && response.kit.can_edit) {
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
      if (!pending.current && document.visibilityState !== "hidden")
        void load().catch(() => undefined);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      version.current += 1;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
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
    (patch) => {
      if (baseRef.current?.can_edit !== true) return;
      rememberDraft({ ...(draftRef.current ?? baseRef.current), ...patch });
    },
    [rememberDraft],
  );

  const save = useCallback(async () => {
    const submitted = draftRef.current ?? baseRef.current;
    if (!submitted || baseRef.current?.can_edit !== true) return;
    try {
      const saved = await saveSharedKit(access, submitted);
      if (!mounted.current || !baseRef.current) return;
      const authorizedSave = { ...saved, can_edit: baseRef.current.can_edit };
      version.current += 1; // A read begun before this save cannot replace its revision.
      pending.current = false;
      baseRef.current = authorizedSave;
      setBase(authorizedSave);
      if (JSON.stringify(draftRef.current) === JSON.stringify(submitted))
        rememberDraft();
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
  }, [access.id, access.token, access.manager, invalidate, rememberDraft]);

  const kit =
    base?.can_edit === true && draft ? { ...draft, can_edit: true } : base;
  return (
    <>
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
          className="text-link"
          to={`/${locale}/report?${access.manager ? "temporary" : "share"}=${access.id}#${access.token}`}
        >
          {t("app.report")}
        </Link>
      </p>
    </>
  );
}
