import i18n from "../../app/i18n";
import { toWebhookJson, type DiscordMessagePayload } from "./domain";

export async function deliverWebhook(
  value: string,
  message: DiscordMessagePayload,
) {
  const url = discordWebhookUrl(value);
  const payload = toWebhookJson(message);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError")
      throw new Error(i18n.t("apiErrors.webhook_timeout"));
    throw new Error(i18n.t("apiErrors.webhook_unavailable"));
  }
  if (response.ok) {
    const body = await response.text();
    return body ? (JSON.parse(body) as { message?: unknown }) : undefined;
  }

  let errorMessage = i18n.t("apiErrors.webhook_rejected", {
    status: response.status,
  });
  try {
    const body = (await response.json()) as { message?: string };
    if (typeof body.message === "string" && body.message)
      errorMessage = body.message;
  } catch {
    // Keep the stable status error for non-JSON Cloudflare/Discord responses.
  }
  throw new Error(errorMessage);
}

export function discordWebhookUrl(value: string | undefined) {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error(i18n.t("apiErrors.webhook_url_invalid"));
  }
  const validHost =
    url.hostname === "discord.com" || url.hostname === "discordapp.com";
  const validPath = /^\/api\/webhooks\/\d{17,20}\/[A-Za-z0-9._-]+$/.test(
    url.pathname,
  );
  const duplicates =
    new Set(url.searchParams.keys()).size !==
    [...url.searchParams.keys()].length;
  const supportedParameters = [...url.searchParams.keys()].every((key) =>
    ["thread_id", "wait", "with_components"].includes(key),
  );
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !validHost ||
    !validPath ||
    !supportedParameters ||
    duplicates
  ) {
    throw new Error(i18n.t("apiErrors.webhook_url_invalid"));
  }
  const threadId = url.searchParams.get("thread_id");
  if (threadId !== null && !/^\d{17,20}$/.test(threadId))
    throw new Error(i18n.t("apiErrors.webhook_thread_invalid"));

  url.hostname = "discord.com";
  url.searchParams.set("wait", "true");
  url.searchParams.set("with_components", "true");
  return url;
}

export function rememberWebhook(value: string, accountId = "guest") {
  try {
    const key = `pokkan.webhook.${accountId}`;
    if (!value) localStorage.removeItem(key);
    else
      localStorage.setItem(
        key,
        JSON.stringify({
          url: discordWebhookUrl(value).toString(),
          expires: Date.now() + 2_592_000_000,
        }),
      );
  } catch {
    /* Sending does not require persistent browser storage. */
  }
}

export function rememberedWebhook(accountId = "guest") {
  try {
    const key = `pokkan.webhook.${accountId}`;
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    if (
      typeof value?.url === "string" &&
      typeof value.expires === "number" &&
      value.expires > Date.now()
    )
      return discordWebhookUrl(value.url).toString();
    localStorage.removeItem(key);
    return "";
  } catch {
    return "";
  }
}
