// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../app/i18n";
import { PrivacyPage } from "./PrivacyPage";
import { ReportPage } from "./ReportPage";
import { apiMutation } from "../shared/api";

let accountId: string | undefined;
vi.mock("../shared/session", () => ({
  useSession: () => ({
    loading: false,
    account: accountId ? { id: accountId } : undefined,
  }),
}));
vi.mock("../shared/api", async (original) => ({
  ...(await original<typeof import("../shared/api")>()),
  apiMutation: vi.fn(),
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  accountId = undefined;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  vi.mocked(apiMutation)
    .mockReset()
    .mockResolvedValue(Response.json({ reference: "received-reference" }));
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});
function render(path: string) {
  flushSync(() =>
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/:locale/privacy" element={<PrivacyPage />} />
          <Route path="/:locale/report" element={<ReportPage />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

it.each(["en", "pt-BR", "es", "ja"])(
  "offers localized unified policies and an authenticated contact form in %s",
  async (locale) => {
    await i18n.changeLanguage(locale);
    render(`/${locale}/privacy`);
    await vi.waitFor(() =>
      expect(host.querySelector("#terms h2")).not.toBeNull(),
    );
    expect(host.querySelector("#privacy h2")).not.toBeNull();
    expect(host.textContent).not.toMatch(/Rails|SQLite|React/);
    host.querySelector<HTMLAnchorElement>('a[href*="/report"]')!.click();
    await vi.waitFor(() =>
      expect(host.querySelector('a[href*="/auth/discord"]')).not.toBeNull(),
    );
    expect(host.querySelector("form")).toBeNull();
  },
);

it("sends a shared-resource report without putting bearer credentials into the report body", async () => {
  accountId = "alice";
  await i18n.changeLanguage("en");
  const id = "45454545-4545-4545-8545-454545454545";
  const token = "T".repeat(43);
  render(`/en/report?share=${id}#${token}`);
  await vi.waitFor(() => expect(host.querySelector("textarea")).not.toBeNull());
  const textarea = host.querySelector("textarea")!;
  Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )!.set!.call(textarea, "Please review this reported message.");
  flushSync(() =>
    textarea.dispatchEvent(new Event("input", { bubbles: true })),
  );
  flushSync(() =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  await vi.waitFor(() =>
    expect(host.textContent).toContain("received-reference"),
  );
  const [url, init] = vi.mocked(apiMutation).mock.calls[0];
  expect(url).toBe("/api/v1/reports");
  expect(new Headers(init?.headers).get("Authorization")).toBe(
    `Bearer ${token}`,
  );
  expect(String(init?.body)).not.toContain(token);
  expect(JSON.parse(String(init?.body)).report).toMatchObject({
    share_id: id,
    kind: "abuse",
    details: "Please review this reported message.",
  });
});
