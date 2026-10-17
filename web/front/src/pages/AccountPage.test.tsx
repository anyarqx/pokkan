// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, it, vi } from "vitest";
import i18n from "../app/i18n";
import { AccountPage } from "./AccountPage";

const { selectContext } = vi.hoisted(() => ({ selectContext: vi.fn(async () => {}) }));
vi.mock("../shared/session", () => ({
  useSession: () => ({ loading: false, account: { id: "42", username: "Demo" } }),
  refreshSession: vi.fn(),
}));
vi.mock("../shared/contexts", () => ({
  useContexts: () => ({ accountId: "42", loading: false, authorization_required: false, selected_context_id: "personal", guilds: [
    { id: "100", name: "Installed Server", status: "installed" },
    { id: "200", name: "Invite Server", status: "invite" },
    { id: "300", name: "Other Server", status: "unavailable" },
  ] }),
  selectContext,
  loadContexts: vi.fn(),
}));

it("shows real server states, invite action, personal Kit ownership and language preference", async () => {
  await i18n.changeLanguage("en");
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<MemoryRouter initialEntries={["/en/account"]}><Routes><Route element={<AccountPage />} path="/:locale/account" /></Routes></MemoryRouter>));
    expect(host.textContent).toContain("Demo");
    expect(host.textContent).toContain("Installed Server");
    expect(host.textContent).toContain("Invite Server");
    expect(host.textContent).toContain("Other servers (1)");
    expect(host.querySelector<HTMLDetailsElement>("details")!.open).toBe(false);
    host.querySelector<HTMLDetailsElement>("details")!.open = true;
    expect(host.textContent).toContain("Other Server");
    const invite = [...host.querySelectorAll<HTMLAnchorElement>("a")].find((link) => link.textContent?.includes("Add Pokkan"))!;
    expect(new URL(invite.href).searchParams.get("guild_id")).toBe("200");
    expect(host.querySelector<HTMLSelectElement>("#account-language")?.value).toBe("en");
    const installed = [...host.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Installed Server"))!;
    flushSync(() => installed.click());
    expect(selectContext).toHaveBeenCalledWith("42", "100");
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
});
