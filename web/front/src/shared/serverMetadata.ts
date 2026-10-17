import { useEffect, useSyncExternalStore } from "react";
import { ApiError, apiFetch, apiMutation } from "./api";

const FRESH_FOR = 15 * 60_000;
const FAILURE_RETRY = 60_000;

export interface ServerMetadata {
  readonly guild_id: string;
  readonly status: "current" | "stale" | "updating" | "unavailable";
  readonly fetched_at?: string | null;
  readonly retry_after: number;
  readonly error?: string | null;
  readonly guild?: {
    readonly id: string;
    readonly name: string;
    readonly icon?: string | null;
    readonly banner?: string | null;
  };
  readonly channels?: readonly {
    readonly id: string;
    readonly name: string;
    readonly type: number;
    readonly parent_id?: string | null;
    readonly position: number;
  }[];
  readonly roles?: readonly {
    readonly id: string;
    readonly name: string;
    readonly color?: number;
    readonly position: number;
  }[];
}

interface State {
  readonly key?: string;
  readonly loading: boolean;
  readonly denied?: boolean;
  readonly retryAt?: number;
  readonly data?: ServerMetadata;
  readonly error?: string;
}
let state: State = { loading: false };
let generation = 0;
let request: Promise<void> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let observing = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => state;

function publish(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
  schedule();
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (!state.key || state.loading || state.denied) return;
  const now = Date.now();
  const updating = state.data?.status === "updating";
  const due = updating
    ? now + 2_000
    : state.data?.fetched_at
      ? Date.parse(state.data.fetched_at) + FRESH_FOR + 100
      : now + FAILURE_RETRY;
  const retry = state.retryAt && state.retryAt > now ? state.retryAt : 0;
  const next = updating ? due : retry || due;
  timer = setTimeout(() => {
    if (!state.key || state.loading || state.denied) return;
    if (document.visibilityState === "hidden") return;
    const [accountId, guildId] = state.key.split(":");
    if (Date.now() >= due) void loadServerMetadata(accountId, guildId);
    else publish({ ...state, retryAt: undefined });
  }, Math.max(100, next - now));
}

function refreshWhenActive() {
  if (document.visibilityState === "hidden" || !state.key || state.denied || state.loading)
    return;
  const due = state.data?.fetched_at ? Date.parse(state.data.fetched_at) + FRESH_FOR : 0;
  if (Date.now() >= due && (!state.retryAt || Date.now() >= state.retryAt)) {
    const [accountId, guildId] = state.key.split(":");
    void loadServerMetadata(accountId, guildId);
  }
}

export function clearServerMetadata() {
  generation += 1;
  publish({ loading: false });
}

export function useServerMetadata(accountId?: string, guildId?: string) {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  const key = accountId && guildId && guildId !== "personal"
    ? `${accountId}:${guildId}`
    : undefined;
  useEffect(() => {
    if (key && state.key !== key) void loadServerMetadata(accountId!, guildId!);
  }, [key, accountId, guildId]);
  useEffect(() => {
    if (observing) return;
    observing = true;
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
  }, []);
  return current.key === key ? current : { loading: Boolean(key) } as State;
}

export async function loadServerMetadata(accountId: string, guildId: string, manual = false) {
  const key = `${accountId}:${guildId}`;
  if (state.key === key && state.denied) return;
  if (request && state.key === key && !manual) return request;
  const now = Date.now();
  if (!manual && state.key === key) {
    if (state.retryAt && now < state.retryAt && state.data?.status !== "updating")
      return;
    if (state.data?.status === "current" && state.data.fetched_at && now < Date.parse(state.data.fetched_at) + FRESH_FOR)
      return;
  }
  const version = ++generation;
  publish({
    key,
    loading: true,
    data: state.key === key ? state.data : undefined,
    retryAt: state.key === key ? state.retryAt : undefined,
  });
  const operation = (async () => {
    try {
      const path = `/api/v1/contexts/${encodeURIComponent(guildId)}/metadata`;
      const response = manual
        ? await apiMutation(`${path}/refresh`, { method: "POST" }, 30_000)
        : await apiFetch(path, {}, 30_000);
      const data = await response.json() as ServerMetadata;
      if (generation === version && state.key === key) {
        publish({
          key,
          loading: false,
          data,
          retryAt: data.retry_after > 0 ? Date.now() + data.retry_after * 1000 : undefined,
        });
      }
    } catch (error) {
      if (generation !== version || state.key !== key) return;
      const denied = error instanceof ApiError && (error.status === 401 || error.status === 403);
      const delay = error instanceof ApiError && error.status === 429
        ? (error.retryAfter ?? 60) * 1000
        : FAILURE_RETRY;
      publish({
        key,
        loading: false,
        denied,
        data: denied ? undefined : state.data && { ...state.data, status: "stale", channels: [] },
        error: error instanceof Error ? error.message : "Server data is unavailable.",
        retryAt: denied ? undefined : Date.now() + delay,
      });
    }
  })();
  request = operation;
  await operation;
  if (request === operation) request = undefined;
}
