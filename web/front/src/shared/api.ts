import i18n from "../app/i18n";

const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim() || undefined;
const localApiOrigin =
  !import.meta.env.PROD &&
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ? "http://localhost:3000"
    : undefined;
const productionApiOrigin = import.meta.env.PROD
  ? "https://pokkan.squareweb.app"
  : undefined;

// A production Worker must never accidentally call its own static origin or a
// developer localhost. Deployments can still override this public URL.
export const apiOrigin =
  configuredOrigin?.replace(/\/$/, "") ??
  localApiOrigin ??
  productionApiOrigin ??
  "";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly retryAfter?: number;

  constructor(
    status: number,
    message: string,
    options: { code?: string; requestId?: string; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.retryAfter = options.retryAfter;
  }
}

export function apiUrl(path: string) {
  if (!path.startsWith("/")) throw new Error("API paths must start with '/'.");
  return `${apiOrigin}${path}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  let response: Response;
  try {
    const timeout = AbortSignal.timeout(timeoutMs);
    response = await fetch(apiUrl(path), {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw localizedError(
        0,
        "network_timeout",
        "The API took too long to respond.",
      );
    }
    throw localizedError(
      0,
      "network_unavailable",
      "The API could not be reached.",
    );
  }

  if (response.ok) return response;
  const details = await responseError(response);
  throw localizedError(
    response.status,
    details.code,
    details.message,
    details.requestId,
    response.headers.get("Retry-After"),
  );
}

let csrfToken: string | undefined;

/** A Discord login/logout rotates the Rails session, so its CSRF token cannot be reused. */
export function resetCsrfToken() {
  csrfToken = undefined;
}

/** Uses the Rails CSRF contract for cookie-authenticated API mutations. */
export async function apiMutation(
  path: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  const mutate = async () =>
    apiFetch(
      path,
      {
        ...init,
        headers: { "X-CSRF-Token": await currentCsrfToken(), ...init.headers },
      },
      timeoutMs,
    );

  try {
    return await mutate();
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== "csrf_invalid")
      throw error;
    resetCsrfToken();
    return mutate();
  }
}

export function discordLoginUrl(returnTo = window.location.href) {
  const url = new URL(apiUrl("/auth/discord"), window.location.origin);
  url.searchParams.set("return_to", safeAuthReturnTo(returnTo));
  return url.toString();
}

export function discordInstallUrl(
  guildId: string,
  returnTo = window.location.href,
) {
  const url = new URL(apiUrl("/auth/discord/install"), window.location.origin);
  url.searchParams.set("guild_id", guildId);
  url.searchParams.set("return_to", safeAuthReturnTo(returnTo));
  return url.toString();
}

function safeAuthReturnTo(value: string) {
  const destination = new URL(value, window.location.origin);
  destination.hash = "";
  return destination.href;
}

const authFragmentKey = "pokkan.auth-return-fragment";

export function rememberAuthFragment(returnTo = window.location.href) {
  const destination = new URL(returnTo, window.location.origin);
  try {
    if (destination.hash)
      sessionStorage.setItem(
        authFragmentKey,
        JSON.stringify({ path: destination.pathname, hash: destination.hash }),
      );
    else sessionStorage.removeItem(authFragmentKey);
  } catch {
    /* The original share URL remains usable if tab storage is disabled. */
  }
}

export function takeAuthFragment(path: string): string | undefined {
  try {
    const saved = JSON.parse(sessionStorage.getItem(authFragmentKey) ?? "null");
    if (
      saved?.path !== path ||
      typeof saved.hash !== "string" ||
      !saved.hash.startsWith("#")
    )
      return;
    sessionStorage.removeItem(authFragmentKey);
    return saved.hash;
  } catch {
    return;
  }
}

async function currentCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await apiFetch("/api/v1/csrf");
  const body = (await response.json()) as { token?: string };
  if (typeof body.token !== "string" || !body.token)
    throw localizedError(
      419,
      "csrf_unavailable",
      "Could not establish a secure API session.",
    );
  csrfToken = body.token;
  return csrfToken;
}

async function responseError(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: string;
      code?: string;
      request_id?: string;
    };
    return {
      message:
        typeof body.error === "string" && body.error
          ? body.error
          : `Request failed (${response.status}).`,
      code: typeof body.code === "string" ? body.code : undefined,
      requestId:
        typeof body.request_id === "string" ? body.request_id : undefined,
    };
  } catch {
    // A non-JSON reverse-proxy response still gets a useful status error.
  }
  return { message: `Request failed (${response.status}).` };
}

function localizedError(
  status: number,
  code: string | undefined,
  fallback: string,
  requestId?: string,
  retryAfter?: string | null,
) {
  const key = code ? `apiErrors.${code}` : undefined;
  const message =
    key && i18n.exists(key)
      ? i18n.t(key)
      : status > 0
        ? i18n.t("apiErrors.request_failed", { status })
        : fallback;
  const seconds = Number(retryAfter);
  return new ApiError(status, message, {
    code,
    requestId,
    retryAfter:
      retryAfter && Number.isFinite(seconds) && seconds > 0
        ? seconds
        : undefined,
  });
}
