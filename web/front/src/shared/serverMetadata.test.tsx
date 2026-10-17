// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, apiFetch: vi.fn(), apiMutation: vi.fn() };
});

import { ApiError, apiFetch, apiMutation } from "./api";
import {
  clearServerMetadata,
  loadServerMetadata,
  useServerMetadata,
} from "./serverMetadata";

const metadata = (name: string, fetchedAt = new Date().toISOString()) => ({
  guild_id: "1001",
  status: "current",
  fetched_at: fetchedAt,
  retry_after: 0,
  guild: { id: "1001", name },
  channels: [{ id: "2001", name: "general", type: 0, position: 0 }],
  roles: [{ id: "3001", name: "Staff", position: 1 }],
});

beforeEach(() => {
  clearServerMetadata();
  vi.mocked(apiFetch).mockReset();
  vi.mocked(apiMutation).mockReset();
});

afterEach(() => {
  clearServerMetadata();
  vi.useRealTimers();
});

describe("authorized server metadata in the browser", () => {
  it.each([401, 403])(
    "removes channels and roles after HTTP %s authorization loss",
    async (status) => {
      vi.mocked(apiFetch).mockResolvedValueOnce(
        Response.json(metadata("Server")),
      );
      await loadServerMetadata("account", "1001");
      let visible = "";
      const host = document.createElement("div");
      const root = createRoot(host);
      function View() {
        const result = useServerMetadata("account", "1001");
        visible = `${result.data?.channels?.length ?? 0}:${result.data?.roles?.length ?? 0}:${result.denied ?? false}`;
        return null;
      }
      flushSync(() => root.render(<View />));
      expect(visible).toBe("1:1:false");
      vi.mocked(apiMutation).mockRejectedValueOnce(
        new ApiError(status, "Denied", { code: "context_forbidden" }),
      );
      await loadServerMetadata("account", "1001", true);
      flushSync(() => root.render(<View />));
      expect(visible).toBe("0:0:true");
      flushSync(() => root.unmount());
    },
  );

  it("keeps a temporary failure stale and ignores an older response", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(Response.json(metadata("First")));
    await loadServerMetadata("account", "1001");
    vi.mocked(apiMutation).mockRejectedValueOnce(
      new ApiError(503, "Unavailable"),
    );
    await loadServerMetadata("account", "1001", true);
    const staleHost = document.createElement("div");
    const staleRoot = createRoot(staleHost);
    let stale = "";
    function StaleView() {
      const result = useServerMetadata("account", "1001");
      stale = `${result.data?.guild?.name}:${result.data?.channels?.length}:${result.data?.status}`;
      return null;
    }
    flushSync(() => staleRoot.render(<StaleView />));
    expect(stale).toBe("First:0:stale");
    flushSync(() => staleRoot.unmount());
    let resolveOld!: (value: Response) => void;
    vi.mocked(apiMutation).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    const old = loadServerMetadata("account", "1001", true);
    vi.mocked(apiMutation).mockResolvedValueOnce(
      Response.json(metadata("Latest")),
    );
    await loadServerMetadata("account", "1001", true);
    resolveOld(Response.json(metadata("Older")));
    await old;
    const host = document.createElement("div");
    const root = createRoot(host);
    let name = "";
    function View() {
      const result = useServerMetadata("account", "1001");
      name = result.data?.guild?.name ?? "";
      return null;
    }
    flushSync(() => root.render(<View />));
    expect(name).toBe("Latest");
    flushSync(() => root.unmount());
  });

  it("refreshes active server data, pauses in personal context and stops after unmount", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    vi.mocked(apiFetch).mockResolvedValueOnce(
      Response.json(metadata("Before")),
    );
    vi.mocked(apiFetch).mockResolvedValueOnce(
      Response.json(
        metadata("After", new Date(Date.now() + 15 * 60_000).toISOString()),
      ),
    );
    await loadServerMetadata("account", "1001");
    const root = createRoot(document.createElement("div"));
    function View({ guildId }: { guildId?: string }) {
      useServerMetadata("account", guildId);
      return null;
    }
    try {
      flushSync(() => root.render(<View guildId="1001" />));
      await vi.advanceTimersByTimeAsync(15 * 60_000 + 200);
      expect(apiFetch).toHaveBeenCalledTimes(2);
      flushSync(() => root.render(<View />));
      await vi.advanceTimersByTimeAsync(15 * 60_000 + 200);
      window.dispatchEvent(new Event("focus"));
      expect(apiFetch).toHaveBeenCalledTimes(2);
      vi.mocked(apiFetch).mockResolvedValueOnce(
        Response.json(metadata("Returned")),
      );
      flushSync(() => root.render(<View guildId="1001" />));
      await vi.advanceTimersByTimeAsync(200);
      expect(apiFetch).toHaveBeenCalledTimes(3);
    } finally {
      flushSync(() => root.unmount());
    }
    await vi.advanceTimersByTimeAsync(15 * 60_000 + 200);
    window.dispatchEvent(new Event("focus"));
    expect(apiFetch).toHaveBeenCalledTimes(3);
  });

  it("honors Retry-After instead of immediately retrying a 429", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    vi.mocked(apiFetch).mockResolvedValueOnce(
      Response.json(
        metadata("Before", new Date(Date.now() - 16 * 60_000).toISOString()),
      ),
    );
    await loadServerMetadata("account", "1001");
    const root = createRoot(document.createElement("div"));
    function View() {
      useServerMetadata("account", "1001");
      return null;
    }
    flushSync(() => root.render(<View />));
    try {
      vi.mocked(apiMutation).mockRejectedValueOnce(
        new ApiError(429, "Wait", { retryAfter: 45 }),
      );
      await loadServerMetadata("account", "1001", true);
      vi.mocked(apiFetch).mockResolvedValueOnce(
        Response.json(metadata("After")),
      );
      await vi.advanceTimersByTimeAsync(44_000);
      expect(apiFetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1_200);
      expect(apiFetch).toHaveBeenCalledTimes(2);
    } finally {
      flushSync(() => root.unmount());
    }
  });

  it("waits for a hidden tab to resume before refreshing expired metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    vi.mocked(apiFetch).mockResolvedValueOnce(
      Response.json(metadata("Before")),
    );
    await loadServerMetadata("account", "1001");
    const host = document.createElement("div");
    const root = createRoot(host);
    function View() {
      useServerMetadata("account", "1001");
      return null;
    }
    flushSync(() => root.render(<View />));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    await vi.advanceTimersByTimeAsync(15 * 60_000 + 200);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    vi.mocked(apiFetch).mockResolvedValueOnce(Response.json(metadata("After")));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    await Promise.resolve();
    expect(apiFetch).toHaveBeenCalledTimes(2);
    flushSync(() => root.unmount());
  });
});
