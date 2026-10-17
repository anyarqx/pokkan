import { useEffect, useSyncExternalStore } from "react";
import { ApiError, apiFetch, apiMutation } from "./api";
import { ACCESS_FRESH_FOR, onForeground } from "./foreground";

export interface GuildContext {
  readonly id: string;
  readonly name: string;
  readonly icon?: string | null;
  readonly banner?: string | null;
  readonly status: "installed" | "invite" | "unknown";
  readonly can_install?: boolean;
}

interface ContextState {
  readonly accountId?: string;
  readonly loading: boolean;
  readonly refreshing?: boolean;
  readonly authorization_required: boolean;
  readonly selected_context_id: string;
  readonly guilds: readonly GuildContext[];
  readonly error?: string;
}

let state: ContextState = {
  loading: false,
  authorization_required: false,
  selected_context_id: "personal",
  guilds: [],
};
let request: Promise<void> | undefined;
let revision = 0;
let retryAt = 0;
let checkedAt = 0;
const REVALIDATE_AFTER = ACCESS_FRESH_FOR;
let stopForeground: (() => void) | undefined;
const listeners = new Set<() => void>();

function publish(next: ContextState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function refreshWhenActive() {
  if (
    state.accountId &&
    document.visibilityState !== "hidden" &&
    Date.now() - checkedAt >= REVALIDATE_AFTER
  )
    void loadContexts(state.accountId);
}

function contextChanged(event: StorageEvent) {
  if (event.key === "pokkan-context-changed" && state.accountId) {
    checkedAt = 0;
    if (document.visibilityState === "hidden") return;
    const accountId = state.accountId;
    void (request ?? Promise.resolve()).then(() => {
      if (state.accountId === accountId) void loadContexts(accountId);
    });
  }
}

function subscribe(listener: () => void) {
  if (!listeners.size) {
    stopForeground = onForeground(refreshWhenActive);
    window.addEventListener("storage", contextChanged);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stopForeground?.();
      window.removeEventListener("storage", contextChanged);
    }
  };
}

function snapshot() {
  return state;
}

export function useContexts(accountId?: string) {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!accountId) {
      if (state.accountId) {
        revision += 1;
        publish({
          loading: false,
          authorization_required: false,
          selected_context_id: "personal",
          guilds: [],
        });
      }
      return;
    }
    if (state.accountId !== accountId) void loadContexts(accountId);
  }, [accountId]);
  return current.accountId === accountId
    ? current
    : ({
        ...current,
        loading: Boolean(accountId),
        guilds: [],
        selected_context_id: "personal",
      } as ContextState);
}

export async function loadContexts(accountId: string, force = false) {
  if (request && !force && state.accountId === accountId) return request;
  if (state.accountId === accountId && Date.now() < retryAt) return;
  if (state.accountId !== accountId) retryAt = 0;
  checkedAt = Date.now();
  const currentRevision = ++revision;
  const sameAccount = state.accountId === accountId;
  publish({
    ...(sameAccount
      ? state
      : {
          authorization_required: false,
          selected_context_id: "personal",
          guilds: [],
        }),
    accountId,
    loading: !sameAccount || state.loading,
    refreshing: true,
    error: undefined,
  });
  const operation = (async () => {
    try {
      const response = force
        ? await apiMutation("/api/v1/contexts/refresh", { method: "POST" })
        : await apiFetch("/api/v1/contexts");
      const body = (await response.json()) as Omit<
        ContextState,
        "accountId" | "loading"
      >;
      if (revision === currentRevision && state.accountId === accountId) {
        retryAt = 0;
        publish({ ...body, accountId, loading: false, refreshing: false });
      }
    } catch (error) {
      if (revision === currentRevision && state.accountId === accountId) {
        if (error instanceof ApiError && error.status === 429)
          retryAt = Date.now() + (error.retryAfter ?? 1) * 1000;
        publish({
          ...state,
          ...(error instanceof ApiError && [401, 403].includes(error.status)
            ? {
                guilds: [],
                selected_context_id: "personal",
                authorization_required: true,
              }
            : {}),
          loading: false,
          refreshing: false,
          error:
            error instanceof Error ? error.message : "Discord is unavailable.",
        });
      }
    }
  })();
  request = operation;
  await operation;
  if (request === operation) request = undefined;
}

export async function selectContext(accountId: string, contextId: string) {
  const currentRevision = ++revision;
  try {
    const response = await apiMutation("/api/v1/contexts/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context_id: contextId }),
    });
    const body = (await response.json()) as Omit<
      ContextState,
      "accountId" | "loading"
    >;
    if (revision === currentRevision && state.accountId === accountId) {
      checkedAt = Date.now();
      publish({ ...body, accountId, loading: false });
    }
    try {
      localStorage.setItem("pokkan-context-changed", String(Date.now()));
    } catch {
      /* storage is optional */
    }
  } catch (error) {
    if (revision === currentRevision && state.accountId === accountId)
      publish({ ...state, loading: false });
    throw error;
  }
}
