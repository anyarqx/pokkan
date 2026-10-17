const listeners = new Set<() => void>();
let queued = false;

function resume() {
  if (document.visibilityState === "hidden" || queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    if (document.visibilityState !== "hidden")
      listeners.forEach((listener) => listener());
  });
}

/** One foreground signal; each resource retains its own freshness and authorization. */
export function onForeground(listener: () => void) {
  if (!listeners.size) {
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    }
  };
}

export const ACCESS_FRESH_FOR = 60_000;
