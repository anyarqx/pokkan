// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, it, vi } from "vitest";
import i18n from "../app/i18n";
import { AccountMenu } from "./AccountMenu";

const { selectContext } = vi.hoisted(() => ({ selectContext: vi.fn(async () => {}) }));
vi.mock("./session", () => ({
  useSession: () => ({ loading: false, account: { id: "42", username: "Demo" } }),
}));
vi.mock("./contexts", () => ({
  useContexts: () => ({
    accountId: "42", loading: false, authorization_required: false,
    selected_context_id: "personal",
    guilds: [
      { id: "100", name: "Installed Server", status: "installed" },
      { id: "200", name: "Invite Server", status: "invite" },
      { id: "300", name: "Other Server", status: "unavailable" },
    ],
  }),
  selectContext,
  loadContexts: vi.fn(),
}));

it("separates account management from selection of available contexts", async () => {
  await i18n.changeLanguage("en");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<MemoryRouter initialEntries={["/en"]}><Routes><Route element={<AccountMenu />} path="/:locale" /></Routes></MemoryRouter>));
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Choose account or server: Personal"]')!;
    flushSync(() => trigger.click());
    expect(host.textContent).toContain("Installed Server");
    expect(host.textContent).not.toContain("Invite Server");
    expect(host.textContent).not.toContain("Other Server");
    expect(host.querySelector('a[href="/en/account"]')).not.toBeNull();
    expect(host.querySelector('a[href="/en/account#servers"]')).not.toBeNull();
    expect(host.querySelectorAll('a[href^="/auth/discord/install"]')).toHaveLength(0);
    const installed = [...host.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Installed Server"))!;
    flushSync(() => installed.click());
    expect(selectContext).toHaveBeenCalledWith("42", "100");
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
});
