import { kitStore } from "../features/kits/store";
import { useSyncExternalStore } from "react";
import { ApiError, apiFetch, resetCsrfToken } from "./api";
import { clearServerMetadata } from "./serverMetadata";

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
const listeners = new Set<() => void>();

export function useSession() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!requested) void refreshSession();
  return snapshot;
}

export async function refreshSession(force = false) {
  if (request && !force) return request;
  requested = true;
  const version = ++generation;
  const operation = (async () => {
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
    listeners.forEach((listener) => listener());
  })();
  request = operation;
  await operation;
  if (request === operation) request = undefined;
}

function refreshWhenActive() {
  if (document.visibilityState !== "hidden") void refreshSession();
}

function subscribe(listener: () => void) {
  if (!listeners.size) {
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    }
  };
}

function getSnapshot() {
  return state;
}
