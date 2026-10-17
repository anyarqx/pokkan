// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, apiMutation, resetCsrfToken } from "./api";

afterEach(() => {
  resetCsrfToken();
  vi.unstubAllGlobals();
});

describe("API mutations", () => {
  it("refreshes a rotated CSRF token once and preserves the requested mutation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "old-token" }))
      .mockResolvedValueOnce(
        Response.json(
          { error: "expired", code: "csrf_invalid", request_id: "request-1" },
          { status: 422 },
        ),
      )
      .mockResolvedValueOnce(Response.json({ token: "new-token" }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await apiMutation("/api/v1/kits/example", {
      method: "PUT",
    });

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(
      new Headers(fetchMock.mock.calls[1][1]?.headers).get("X-CSRF-Token"),
    ).toBe("old-token");
    expect(
      new Headers(fetchMock.mock.calls[3][1]?.headers).get("X-CSRF-Token"),
    ).toBe("new-token");
  });

  it("maps transport failures without exposing raw browser errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("private network details")),
    );

    await expect(apiFetch("/api/v1/health")).rejects.toMatchObject({
      code: "network_unavailable",
      message: "Não foi possível acessar a API.",
      status: 0,
    } satisfies Partial<ApiError>);
  });

  it("uses the localized stable API code instead of server implementation text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: "internal English detail",
            code: "authentication_required",
            request_id: "request-2",
          },
          { status: 401 },
        ),
      ),
    );

    await expect(apiFetch("/api/v1/kits")).rejects.toMatchObject({
      code: "authentication_required",
      message: "Entre para continuar.",
      requestId: "request-2",
      status: 401,
    } satisfies Partial<ApiError>);
  });

  it("does not expose an untranslated backend message for an unknown error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: "private upstream implementation detail",
            code: "future_error",
          },
          { status: 503 },
        ),
      ),
    );

    await expect(apiFetch("/api/v1/future")).rejects.toMatchObject({
      code: "future_error",
      message: "A solicitação falhou (503).",
      status: 503,
    } satisfies Partial<ApiError>);
  });

  it("keeps a server retry delay for rate-limited metadata requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: "refresh_cooldown" },
            { status: 429, headers: { "Retry-After": "37" } },
          ),
        ),
    );
    await expect(
      apiFetch("/api/v1/contexts/1001/metadata"),
    ).rejects.toMatchObject({
      status: 429,
      retryAfter: 37,
    } satisfies Partial<ApiError>);
  });
});
