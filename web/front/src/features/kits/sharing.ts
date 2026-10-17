import { apiFetch, apiMutation } from "../../shared/api";
import { readKit, type Kit } from "./domain";

export type SharePermission = "view" | "edit";
export type ShareAudience = "anyone" | "members";
export interface KitShare {
  id: string;
  permission: SharePermission;
  audience: ShareAudience;
  expires_at: string | null;
  created_at: string;
}
export interface ShareSettings {
  permission: SharePermission;
  audience: ShareAudience;
  lifetime_hours?: number;
}
export interface ShareManager {
  id: string;
  token?: string;
  expires?: string;
}
export interface SharedAccess {
  id: string;
  token: string;
  manager: boolean;
}

function content(kit: Kit) {
  return {
    name: kit.name,
    arguments: kit.arguments,
    placeholders: kit.placeholders,
    message: kit.message,
  };
}
function headers(token?: string) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
function managementPath(manager: ShareManager) {
  return `/api/v1/${manager.token ? "temporary_kits" : "kits"}/${encodeURIComponent(manager.id)}/shares`;
}
function accessPath(access: SharedAccess) {
  return `/api/v1/${access.manager ? "temporary_kits" : "shared_kits"}/${encodeURIComponent(access.id)}`;
}

export function sharedKitPath(locale: string, id: string) {
  return `/${locale}/shared/${encodeURIComponent(id)}`;
}
export function shareUrl(
  locale: string,
  id: string,
  token: string,
  manager = false,
) {
  return `https://pokkan.net${sharedKitPath(locale, id)}#${manager ? "manage=" : ""}${token}`;
}

export async function listKitShares(
  manager: ShareManager,
): Promise<KitShare[]> {
  const response = await apiFetch(managementPath(manager), {
    headers: headers(manager.token),
    cache: "no-store",
  });
  return ((await response.json()) as { shares: KitShare[] }).shares;
}
export async function changeKitShare(
  manager: ShareManager,
  settings: ShareSettings,
  id?: string,
) {
  const response = await apiMutation(
    `${managementPath(manager)}${id ? `/${encodeURIComponent(id)}` : ""}`,
    {
      method: id ? "PATCH" : "POST",
      headers: headers(manager.token),
      body: JSON.stringify({ share: settings }),
    },
  );
  return (await response.json()) as { share: KitShare; token?: string };
}
export async function regenerateKitShare(manager: ShareManager, id: string) {
  const response = await apiMutation(
    `${managementPath(manager)}/${encodeURIComponent(id)}/regenerate`,
    { method: "POST", headers: headers(manager.token) },
  );
  return (await response.json()) as { share: KitShare; token: string };
}
export async function revokeKitShare(manager: ShareManager, id: string) {
  await apiMutation(`${managementPath(manager)}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(manager.token),
  });
}
export async function createTemporaryKit(
  kit: Kit,
  lifetime: number,
  permission: SharePermission,
) {
  const response = await apiMutation("/api/v1/temporary_kits", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      kit: content(kit),
      lifetime_hours: lifetime,
      permission,
    }),
  });
  const data = (await response.json()) as {
    kit: unknown;
    share: KitShare;
    token: string;
    management_token: string;
    expires_at: string;
  };
  return { ...data, kit: readKit(data.kit) };
}
export async function getSharedKit(access: SharedAccess) {
  const response = await apiFetch(accessPath(access), {
    headers: headers(access.token),
    cache: "no-store",
  });
  const data = (await response.json()) as {
    kit: unknown;
    share?: Pick<KitShare, "audience" | "permission" | "expires_at">;
    expires_at?: string;
  };
  return { ...data, kit: readKit(data.kit) };
}
export async function saveSharedKit(access: SharedAccess, kit: Kit) {
  const response = await apiMutation(accessPath(access), {
    method: "PUT",
    headers: headers(access.token),
    body: JSON.stringify({ kit: { ...content(kit), revision: kit.revision } }),
  });
  return readKit(((await response.json()) as { kit: unknown }).kit);
}
export async function deleteTemporaryKit(manager: ShareManager) {
  await apiMutation(
    `/api/v1/temporary_kits/${encodeURIComponent(manager.id)}`,
    { method: "DELETE", headers: headers(manager.token) },
  );
}

// Secrets stay separate from Kits and exports. A copied management URL also works
// in another browser; tab storage is only recovery for the creating tab.
export function rememberSharing(key: string, value?: unknown): unknown {
  try {
    const name = `pokkan.sharing.${key}`;
    if (value !== undefined)
      sessionStorage.setItem(name, JSON.stringify(value));
    return JSON.parse(sessionStorage.getItem(name) ?? "null");
  } catch {
    return null;
  }
}
