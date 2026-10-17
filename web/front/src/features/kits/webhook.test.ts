// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { rememberWebhook, rememberedWebhook, deliveredMessageUrl } from "./webhook";

beforeEach(() => vi.stubGlobal("localStorage", window.sessionStorage));
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("uses only complete Discord response identifiers for a sent-message link", () => {
  expect(deliveredMessageUrl({id:"123456789012345678",channel_id:"223456789012345678",guild_id:"323456789012345678"})).toBe("https://discord.com/channels/323456789012345678/223456789012345678/123456789012345678");
  for (const value of [null,{}, {id:"123456789012345678",channel_id:"223456789012345678"}, {id:"https://evil.test",channel_id:"223456789012345678",guild_id:"323456789012345678"}]) expect(deliveredMessageUrl(value)).toBeUndefined();
});

it("remembers webhook credentials only in the account's browser storage and expires them after 30 days", () => {
  vi.useFakeTimers();
  const url =
    "https://discord.com/api/webhooks/123456789012345678/example_token";
  rememberWebhook(url, "alice");
  expect(rememberedWebhook("alice")).toContain("example_token");
  expect(rememberedWebhook("bob")).toBe("");
  expect(rememberedWebhook()).toBe("");
  expect(document.cookie).not.toContain("example_token");
  vi.advanceTimersByTime(30 * 24 * 60 * 60 * 1000);
  expect(rememberedWebhook("alice")).toBe("");
});

it("clearing a remembered webhook leaves another account's credential intact", () => {
  const url =
    "https://discord.com/api/webhooks/123456789012345678/example_token";
  rememberWebhook(url, "alice");
  rememberWebhook(url, "bob");
  rememberWebhook("", "alice");
  expect(rememberedWebhook("alice")).toBe("");
  expect(rememberedWebhook("bob")).toContain("example_token");
});
