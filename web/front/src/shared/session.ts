import { kitStore } from "../features/kits/store";
import { useSyncExternalStore } from "react";
import { ApiError, apiFetch, resetCsrfToken } from "./api";
import { clearServerMetadata } from "./serverMetadata";
import { ACCESS_FRESH_FOR, onForeground } from "./foreground";

export interface SessionAccount {
  readonly id: string;
  readonly username?: string;
  readonly global_name?: string;
  readonly avatar?: string;
  readonly banner?: string;
}

interface SessionState {
  readonly loading: boolean;
  readonly account?: SessionAccount;
}

let state: SessionState = { loading: true };
let requested = false;
let request: Promise<void> | undefined;
let generation = 0;
let checkedAt = 0;
let stopForeground: (() => void) | undefined;
const listeners = new Set<() => void>();

export function useSession() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!requested) void refreshSession();
  return snapshot;
}

export async function refreshSession(force = false) {
  if (request && !force) return request;
  requested = true;
  checkedAt = Date.now();
  const version = ++generation;
  const operation = (async () => {
    const previousAccount = state.account?.id;
    try {
      const response = await apiFetch("/api/v1/auth/session");
      const body = (await response.json()) as {
        authenticated?: boolean;
        account?: SessionAccount;
      };
      const account = body.authenticated ? body.account : undefined;
      if (version !== generation) return;
      if (state.account?.id !== account?.id) {
        resetCsrfToken();
        clearServerMetadata();
      }
      kitStore.setAccount(account?.id);
      state = { loading: false, account };
    } catch (error) {
      if (version !== generation) return;
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clearServerMetadata();
        resetCsrfToken();
        kitStore.setAccount(undefined);
        state = { loading: false };
      } else state = { ...state, loading: false };
    }
    if (previousAccount !== state.account?.id) {
      try {
        localStorage.setItem("pokkan-session-changed", crypto.randomUUID());
      } catch {
        /* Storage is optional. */
      }
    }
    listeners.forEach((listener) => listener());
  })();
  request = operation;
  await operation;
  if (request === operation) request = undefined;
}

function refreshWhenActive() {
  if (Date.now() - checkedAt >= ACCESS_FRESH_FOR) void refreshSession();
}

function sessionChanged(event: StorageEvent) {
  if (event.key === "pokkan-session-changed") void refreshSession(true);
}

function subscribe(listener: () => void) {
  if (!listeners.size) {
    stopForeground = onForeground(refreshWhenActive);
    window.addEventListener("storage", sessionChanged);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stopForeground?.();
      window.removeEventListener("storage", sessionChanged);
    }
  };
}

function getSnapshot() {
  return state;
}
