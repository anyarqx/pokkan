import { useEffect, useId, useRef, useState } from "react";
import {
  Copy,
  Eye,
  Globe,
  Info,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Unlink,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Sheet } from "../editor/Sheet";
import { ConfirmAction } from "../editor/ConfirmAction";
import { useSession } from "../../shared/session";
import { useKits } from "../../shared/useKits";
import { copyText } from "../../shared/copy";
import { useNotice } from "../../shared/notifications";
import { kitsPath } from "../../app/routes";
import { defaultLocale } from "../../app/i18n";
import { saveKit } from "./api";
import { kitStore } from "./store";
import type { Kit } from "./domain";
import {
  changeKitShare,
  createTemporaryKit,
  deleteTemporaryKit,
  listKitShares,
  regenerateKitShare,
  rememberSharing,
  revokeKitShare,
  sharedKitPath,
  shareUrl,
  type KitShare,
  type ShareManager,
  type ShareSettings,
} from "./sharing";

type TemporaryManagement = ShareManager & { token: string; expires: string };

export function ShareSheet(
  props: Readonly<{ kit: Kit; close(): void; manager?: ShareManager }>,
) {
  const session = useSession();
  const openedBy = useRef(session.account?.id);
  useEffect(() => {
    if (!props.manager && openedBy.current !== session.account?.id)
      props.close();
  }, [session.account?.id, props.manager, props.close]);
  return (
    <SharingControls
      key={`${session.account?.id ?? "guest"}:${props.kit.id}`}
      {...props}
      accountId={session.account?.id}
    />
  );
}

function SharingControls({
  kit: original,
  close,
  manager: supplied,
  accountId,
}: Readonly<{
  kit: Kit;
  close(): void;
  manager?: ShareManager;
  accountId?: string;
}>) {
  const { t } = useTranslation();
  const { locale = defaultLocale } = useParams();
  const { notify } = useNotice();
  const directHintId = useId();
  const kits = useKits();
  const kit = !supplied
    ? (kits.find((item) => item.id === original.id) ?? original)
    : original;
  const [temporary, setTemporary] = useState<TemporaryManagement | undefined>(
    () => {
      const value = rememberSharing(
        `temporary:${kit.id}`,
      ) as TemporaryManagement | null;
      return value &&
        typeof value.id === "string" &&
        typeof value.token === "string" &&
        typeof value.expires === "string"
        ? value
        : undefined;
    },
  );
  const manager =
    supplied ?? (kit.revision !== undefined ? { id: kit.id } : temporary);
  const copyExpires = supplied?.expires ?? temporary?.expires;
  const managerKey = `${manager?.id}:${manager?.token ?? accountId}`;
  const secretKey = `links:${manager?.id}:${manager?.token ? "temporary" : accountId}`;
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<KitShare[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const defaults: ShareSettings = {
    permission: "view",
    audience:
      accountId && kit.guild_id && !supplied?.token ? "members" : "anyone",
    lifetime_hours: !manager ? 24 : manager.token ? undefined : 168,
  };
  const [settings, setSettings] = useState<ShareSettings>(defaults);
  const canManage = Boolean(manager?.token) || kit.can_manage_sharing === true;

  useEffect(() => {
    let active = true;
    const cached = rememberSharing(secretKey);
    setSecrets(
      cached && typeof cached === "object"
        ? (cached as Record<string, string>)
        : {},
    );
    setLinks([]);
    if (manager && canManage) {
      setBusy(true);
      void listKitShares(manager)
        .then((items) => {
          if (active) setLinks(items);
        })
        .catch((reason) => {
          if (active) {
            setError(reason.message);
            if (reason.status === 404 && temporary && !supplied) {
              rememberSharing(`temporary:${kit.id}`, null);
              setTemporary(undefined);
            }
          }
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }
    return () => {
      active = false;
    };
  }, [managerKey, canManage]);

  function rememberLink(id: string, token: string) {
    setSecrets((current) => {
      const next = { ...current, [id]: token };
      rememberSharing(secretKey, next);
      return next;
    });
  }
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    try {
      await task();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("sharing.failed"));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function copy(value: string) {
    await copyText(value);
    notify(t("sharing.copied"), "success");
  }
  function replaceLink(share: KitShare) {
    setLinks((current) => [
      share,
      ...current.filter((item) => item.id !== share.id),
    ]);
  }
  if (deleteConfirm && manager?.token)
    return (
      <ConfirmAction
        title={t("sharing.deleteCopy")}
        description={t("app.deleteSavedDescription")}
        label={t("app.delete")}
        close={() => setDeleteConfirm(false)}
        confirm={() =>
          run(async () => {
            await deleteTemporaryKit(manager);
            rememberSharing(`temporary:${kit.id}`, null);
            rememberSharing(secretKey, null);
            setLinks([]);
            notify(t("sharing.revoked"), "success");
            close();
          })
        }
      />
    );
  return (
    <Sheet
      title={t("sharing.title")}
      close={() => {
        if (!busy) close();
      }}
      className="share-sheet"
    >
      {kit.sharing_restricted ? (
        <>
          <p className="form-error" role="alert">
            {t("apiErrors.sharing_restricted")}
            {kit.sharing_restriction_reason
              ? ` ${kit.sharing_restriction_reason}`
              : ""}
          </p>
          <Link
            className="text-link"
            to={`/${locale}/report?kind=appeal&${manager?.token ? "temporary" : "kit"}=${manager?.id ?? kit.id}${manager?.token ? `#${manager.token}` : ""}`}
          >
            {t("app.report")}
          </Link>
        </>
      ) : null}
      {!manager?.token && kit.revision !== undefined ? (
        <div className="sheet-field">
          <span className="share-field-heading" title={t("sharing.directHint")}>
            {t("sharing.directLink")} <Info aria-hidden="true" size={14} />
          </span>
          <div className="share-copy">
            <input
              aria-label={t("sharing.directLink")}
              aria-describedby={directHintId}
              readOnly
              value={`https://pokkan.net${kitsPath(locale, kit.id)}`}
              onFocus={(event) => event.target.select()}
            />
            <button
              className="icon-button"
              aria-label={t("sharing.copyLink")}
              title={t("sharing.copyLink")}
              onClick={() =>
                void run(() =>
                  copy(`https://pokkan.net${kitsPath(locale, kit.id)}`),
                )
              }
              disabled={busy}
            >
              <Copy aria-hidden="true" size={17} />
            </button>
          </div>
          <small className="sr-only" id={directHintId}>
            {t("sharing.directHint")}
          </small>
        </div>
      ) : null}
      {!manager && accountId ? (
        <>
          <p className="sheet-note">{t("sharing.saveFirst")}</p>
          <button
            className="button primary"
            disabled={busy || kit.can_edit === false}
            onClick={() =>
              void run(async () => {
                const submitted = kitStore.find(kit.id) ?? kit;
                kitStore.markSaved(
                  await saveKit(submitted),
                  accountId,
                  submitted,
                );
              })
            }
          >
            {t("app.save")}
          </button>
        </>
      ) : null}
      {!manager && !accountId ? (
        <>
          <p className="sheet-note">{t("sharing.temporaryHint")}</p>
          <ShareOptions
            value={settings}
            change={setSettings}
            server={false}
            creatingCopy
          />
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const result = await createTemporaryKit(
                  kit,
                  settings.lifetime_hours ?? 24,
                  settings.permission,
                );
                const next = {
                  id: result.kit.id,
                  token: result.management_token,
                  expires: result.expires_at,
                };
                const key = `links:${next.id}:temporary`;
                rememberSharing(key, { [result.share.id]: result.token });
                rememberSharing(`temporary:${kit.id}`, next);
                setSettings({ ...defaults, lifetime_hours: undefined });
                setTemporary(next);
              })
            }
          >
            {t("sharing.createTemporary")}
          </button>
        </>
      ) : null}
      {manager?.token ? (
        <div className="sheet-field">
          <span>{t("sharing.managementLink")}</span>
          <div className="share-copy">
            <input
              aria-label={t("sharing.managementLink")}
              readOnly
              value={shareUrl(locale, manager.id, manager.token, true)}
              onFocus={(event) => event.target.select()}
            />
            <button
              className="icon-button"
              aria-label={t("sharing.copyLink")}
              title={t("sharing.copyLink")}
              disabled={busy}
              onClick={() =>
                void run(() =>
                  copy(shareUrl(locale, manager.id, manager.token!, true)),
                )
              }
            >
              <Copy aria-hidden="true" size={17} />
            </button>
          </div>
          <small>{t("sharing.managementHint")}</small>
          {copyExpires ? (
            <small>
              {t("sharing.expiresAt", {
                date: new Date(copyExpires).toLocaleString(locale),
              })}
            </small>
          ) : null}
          <Link
            className="text-link"
            to={`${sharedKitPath(locale, manager.id)}#manage=${manager.token}`}
            onClick={close}
          >
            {t("sharing.openCopy")}
          </Link>
        </div>
      ) : null}
      {manager && canManage ? (
        <>
          {!manager.token && kitStore.isDirty(kit.id) ? (
            <p className="sheet-note">{t("sharing.savedVersion")}</p>
          ) : null}
          {!kit.sharing_restricted ? (
            <form
              className="share-settings"
              aria-label={t("sharing.createLink")}
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const result = await changeKitShare(manager, settings);
                  replaceLink(result.share);
                  if (result.token) rememberLink(result.share.id, result.token);
                  setSettings(defaults);
                });
              }}
            >
              <ShareOptions
                value={settings}
                change={setSettings}
                server={Boolean(kit.guild_id) && !manager.token}
                temporary={manager.token ? copyExpires : undefined}
                creating
              />
              <button className="button primary" disabled={busy}>
                {t("sharing.createLink")}
              </button>
            </form>
          ) : null}
          {links.map((link) => (
            <ShareLinkRow
              key={link.id}
              link={link}
              token={secrets[link.id]}
              locale={locale}
              server={Boolean(kit.guild_id) && !manager.token}
              temporary={manager.token ? copyExpires : undefined}
              busy={busy}
              restricted={kit.sharing_restricted === true}
              run={run}
              copy={copy}
              update={async (next) => {
                replaceLink(
                  (await changeKitShare(manager, next, link.id)).share,
                );
              }}
              regenerate={async () => {
                const result = await regenerateKitShare(manager, link.id);
                rememberLink(link.id, result.token);
                replaceLink(result.share);
              }}
              revoke={async () => {
                await revokeKitShare(manager, link.id);
                setLinks((items) =>
                  items.filter((item) => item.id !== link.id),
                );
              }}
            />
          ))}
          {manager.token ? (
            <button
              className="icon-button danger"
              aria-label={t("sharing.deleteCopy")}
              title={t("sharing.deleteCopy")}
              disabled={busy}
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 aria-hidden="true" size={17} />
            </button>
          ) : null}
        </>
      ) : null}
      {busy ? (
        <p className="sheet-note" role="status">
          {t("app.loading")}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}

function ShareOptions({
  value,
  change,
  server,
  creatingCopy = false,
  temporary,
  creating = false,
}: Readonly<{
  value: ShareSettings;
  change(value: ShareSettings): void;
  server: boolean;
  creatingCopy?: boolean;
  temporary?: string;
  creating?: boolean;
}>) {
  const { t } = useTranslation();
  const PermissionIcon = value.permission === "edit" ? Pencil : Eye;
  const AudienceIcon = value.audience === "anyone" ? Globe : Users;
  return (
    <>
      <div className="share-options">
        <div className="sheet-field">
          <span>{t("sharing.permission")}</span>
          <button
            className="button quiet"
            type="button"
            role="switch"
            aria-label={`${t("sharing.permission")}: ${t("sharing.edit")}`}
            aria-checked={value.permission === "edit"}
            title={`${t("sharing.permission")}: ${t(`sharing.${value.permission}`)}`}
            onClick={() =>
              change({
                ...value,
                permission: value.permission === "edit" ? "view" : "edit",
              })
            }
          >
            <PermissionIcon aria-hidden="true" size={15} />
            <span>{t(`sharing.${value.permission}`)}</span>
          </button>
        </div>
        {server ? (
          <div className="sheet-field">
            <span>{t("sharing.audience")}</span>
            <button
              className="button quiet"
              type="button"
              role="switch"
              aria-label={`${t("sharing.audience")}: ${t("sharing.anyone")}`}
              aria-checked={value.audience === "anyone"}
              title={`${t("sharing.audience")}: ${t(`sharing.${value.audience}`)}`}
              onClick={() =>
                change({
                  ...value,
                  audience: value.audience === "anyone" ? "members" : "anyone",
                })
              }
            >
              <AudienceIcon aria-hidden="true" size={15} />
              <span>{t(`sharing.${value.audience}`)}</span>
            </button>
          </div>
        ) : null}
        <label className="sheet-field">
          <span>{t("sharing.expires")}</span>
          <select
            aria-label={t("sharing.expires")}
            value={value.lifetime_hours ?? ""}
            onChange={(event) =>
              change({
                ...value,
                lifetime_hours:
                  event.target.value === ""
                    ? undefined
                    : Number(event.target.value),
              })
            }
          >
            {(!creating && !creatingCopy) || temporary ? (
              <option value="">
                {t(
                  temporary && creating
                    ? "sharing.copyExpiry"
                    : "sharing.keepExpiry",
                )}
              </option>
            ) : null}
            {(
              [
                [1, "hour"],
                [24, "day"],
                [168, "week"],
              ] as const
            ).map(([hours, label]) =>
              !temporary ||
              Date.parse(temporary) - Date.now() >= hours * 3_600_000 ? (
                <option key={hours} value={hours}>
                  {t(`sharing.${label}`)}
                </option>
              ) : null,
            )}
            {!temporary && !creatingCopy ? (
              <>
                <option value={720}>{t("sharing.month")}</option>
                <option value={0}>{t("sharing.never")}</option>
              </>
            ) : null}
          </select>
        </label>
      </div>
      {value.permission === "edit" && value.audience === "anyone" ? (
        <p className="form-error">{t("sharing.publicEdit")}</p>
      ) : null}
    </>
  );
}

function ShareLinkRow({
  link,
  token,
  locale,
  server,
  temporary,
  busy,
  run,
  copy,
  update,
  regenerate,
  revoke,
  restricted,
}: Readonly<{
  link: KitShare;
  token?: string;
  locale: string;
  server: boolean;
  temporary?: string;
  busy: boolean;
  run(task: () => Promise<void>): Promise<boolean>;
  copy(url: string): Promise<void>;
  update(settings: ShareSettings): Promise<void>;
  regenerate(): Promise<void>;
  revoke(): Promise<void>;
  restricted: boolean;
}>) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ShareSettings>({
    permission: link.permission,
    audience: link.audience,
  });
  const [confirm, setConfirm] = useState(false);
  return (
    <form
      className="share-settings"
      aria-label={t("sharing.accessLink")}
      onSubmit={(event) => {
        event.preventDefault();
        void run(() => update(settings));
      }}
    >
      <h3>{t("sharing.accessLink")}</h3>
      {token ? (
        <div className="share-copy">
          <input
            aria-label={t("sharing.accessLink")}
            readOnly
            value={shareUrl(locale, link.id, token)}
            onFocus={(event) => event.target.select()}
          />
          <button
            className="icon-button"
            aria-label={t("sharing.copyLink")}
            title={t("sharing.copyLink")}
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() => copy(shareUrl(locale, link.id, token)))
            }
          >
            <Copy aria-hidden="true" size={17} />
          </button>
        </div>
      ) : (
        <p className="sheet-note">{t("sharing.regenerateHint")}</p>
      )}
      <ShareOptions
        value={settings}
        change={setSettings}
        server={server}
        temporary={temporary}
      />
      <p className="sheet-note">
        {link.expires_at
          ? t("sharing.expiresAt", {
              date: new Date(link.expires_at).toLocaleString(locale),
            })
          : t("sharing.never")}
      </p>
      <div className="actions">
        <button
          className="icon-button"
          aria-label={t("app.save")}
          title={t("app.save")}
          disabled={busy || restricted}
        >
          <Save aria-hidden="true" size={17} />
        </button>
        <button
          className={confirm ? "button" : "icon-button"}
          aria-label={t(
            confirm ? "sharing.confirmRegenerate" : "sharing.regenerate",
          )}
          title={t(
            confirm ? "sharing.confirmRegenerate" : "sharing.regenerate",
          )}
          disabled={busy || restricted}
          type="button"
          onClick={() => {
            if (!confirm) setConfirm(true);
            else {
              void run(regenerate);
              setConfirm(false);
            }
          }}
        >
          {confirm ? (
            t("sharing.confirmRegenerate")
          ) : (
            <RefreshCw aria-hidden="true" size={17} />
          )}
        </button>
        <button
          className="icon-button danger"
          aria-label={t("sharing.revoke")}
          title={t("sharing.revoke")}
          disabled={busy}
          type="button"
          onClick={() => void run(revoke)}
        >
          <Unlink aria-hidden="true" size={17} />
        </button>
      </div>
    </form>
  );
}
