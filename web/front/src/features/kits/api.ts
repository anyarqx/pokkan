import { apiFetch, apiMutation } from "../../shared/api";
import { readKit, type Kit } from "./domain";

export async function listKits(contextId = "personal"): Promise<Kit[]> {
  const response = await apiFetch(
    `/api/v1/kits?context_id=${encodeURIComponent(contextId)}`,
  );
  const body = (await response.json()) as { kits: unknown[] };
  return body.kits.map(readKit);
}

export async function getKit(id: string): Promise<Kit> {
  const response = await apiFetch(`/api/v1/kits/${encodeURIComponent(id)}`);
  const body = (await response.json()) as { kit: unknown };
  return readKit(body.kit);
}

export async function saveKit(kit: Kit): Promise<Kit> {
  const { id, name, arguments: args, message, placeholders, guild_id, revision } = kit;
  const data = {
    name,
    arguments: args,
    message,
    placeholders,
    ...(revision === undefined && guild_id ? { guild_id } : {}),
    ...(revision !== undefined ? { revision } : {}),
  };
  const response = await apiMutation(`/api/v1/kits/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kit: data }),
  });
  const body = (await response.json()) as { kit: unknown };
  return readKit(body.kit);
}

export async function deleteKit(id: string, revision?: number) {
  const query = revision === undefined ? "" : `?revision=${revision}`;
  await apiMutation(`/api/v1/kits/${encodeURIComponent(id)}${query}`, {
    method: "DELETE",
  });
}
