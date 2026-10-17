// @vitest-environment jsdom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch, apiMutation } from "./api";
import { loadContexts, useContexts } from "./contexts";

vi.mock("./api", async (original) => ({
  ...(await original<typeof import("./api")>()),
  apiFetch: vi.fn(),
  apiMutation: vi.fn(),
}));

afterEach(() => vi.useRealTimers());
beforeEach(() => vi.resetAllMocks());

function response(selected_context_id = "personal") {
  return new Response(
    JSON.stringify({
      authorization_required: false,
      selected_context_id,
      guilds: [],
    }),
  );
}

it("waits for Retry-After across focus and manual revalidation without blocking another account", async () => {
  vi.useFakeTimers();
  vi.mocked(apiFetch).mockRejectedValueOnce(
    new ApiError(429, "Wait before checking Discord.", { retryAfter: 120 }),
  );
  await loadContexts("first-account");
  await loadContexts("first-account");
  await loadContexts("first-account", true);
  expect(apiFetch).toHaveBeenCalledTimes(1);
  expect(apiMutation).not.toHaveBeenCalled();

  vi.advanceTimersByTime(120_000);
  vi.mocked(apiFetch).mockImplementation(async () => response());
  await loadContexts("first-account");
  expect(apiFetch).toHaveBeenCalledTimes(2);

  vi.mocked(apiFetch).mockRejectedValueOnce(
    new ApiError(429, "Wait before checking Discord.", { retryAfter: 120 }),
  );
  await loadContexts("first-account");
  await loadContexts("second-account");
  expect(apiFetch).toHaveBeenCalledTimes(4);
});

it("shares foreground refresh across consumers while cross-tab and manual changes bypass its freshness window", async () => {
  vi.useFakeTimers();
  let selected = "personal";
  vi.mocked(apiFetch).mockImplementation(async () => response(selected));
  vi.mocked(apiMutation).mockImplementation(async () => response());
  function Consumer() {
    const state = useContexts("focus-account");
    return createElement(
      "span",
      null,
      state.loading || state.refreshing
        ? "loading"
        : (state.error ?? state.selected_context_id),
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        createElement(
          "div",
          null,
          [1, 2, 3].map((key) => createElement(Consumer, { key })),
        ),
      ),
    );
    await vi.waitFor(() =>
      expect(host.textContent).toBe("personalpersonalpersonal"),
    );
    expect(apiFetch).toHaveBeenCalledTimes(1);
    for (let index = 0; index < 6; index++) {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    }
    expect(apiFetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(61_000);
    selected = "1001";
    window.dispatchEvent(new Event("focus"));
    await vi.waitFor(() => expect(host.textContent).toBe("100110011001"));
    expect(apiFetch).toHaveBeenCalledTimes(2);

    selected = "personal";
    window.dispatchEvent(
      new StorageEvent("storage", { key: "pokkan-context-changed" }),
    );
    await vi.waitFor(() =>
      expect(host.textContent).toBe("personalpersonalpersonal"),
    );
    expect(apiFetch).toHaveBeenCalledTimes(3);
    await loadContexts("focus-account", true);
    expect(apiMutation).toHaveBeenCalledTimes(1);
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
  vi.advanceTimersByTime(31_000);
  window.dispatchEvent(new Event("focus"));
  expect(apiFetch).toHaveBeenCalledTimes(3);
});
