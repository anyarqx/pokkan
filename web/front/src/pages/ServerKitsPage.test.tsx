// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../app/i18n";
import { kitStore } from "../features/kits/store";
import { NotificationProvider } from "../shared/notifications";
import { KitsPage } from "./KitsPage";

vi.mock("../shared/session", () => ({
  useSession: () => ({ loading: false, account: { id: "alice" } }),
}));
vi.mock("../shared/contexts", () => ({
  useContexts: () => ({
    loading: false,
    selected_context_id: "1001",
    guilds: [{ id: "1001", name: "Example Server", status: "installed" }],
  }),
}));

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
  await i18n.changeLanguage("en");
  kitStore.setAccount("alice");
  for (const kit of kitStore.getSnapshot()) kitStore.remove(kit.id);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});

it.each(["en", "pt-BR", "es", "ja"])("creates a %s Kit in the selected server without moving personal Kits", async (locale) => {
  await i18n.changeLanguage(locale);
  const personal = kitStore.createDraft("Personal only", { content: "Personal" });
  flushSync(() => root.render(
    <MemoryRouter initialEntries={[`/${locale}/kits`]}>
      <NotificationProvider>
        <Routes>
          <Route element={<KitsPage />} path="/:locale/kits" />
          <Route element={<p>Editor opened</p>} path="/:locale/kits/:id" />
        </Routes>
      </NotificationProvider>
    </MemoryRouter>,
  ));
  expect(host.textContent).toContain("Example Server");
  expect(host.textContent).not.toContain("Personal only");
  flushSync(() => host.querySelector<HTMLButtonElement>('.kit-create button[type="submit"]')!.click());
  await vi.waitFor(() => expect(host.textContent).toContain("Editor opened"));
  const created = kitStore.getSnapshot().find((item) => item.id !== personal.id)!;
  expect(created.guild_id).toBe("1001");
  expect(kitStore.find(personal.id)?.guild_id).toBeUndefined();
});

it("labels an empty server collection without implying personal ownership", () => {
  flushSync(() => root.render(
    <MemoryRouter initialEntries={["/en/kits"]}>
      <NotificationProvider>
        <Routes><Route element={<KitsPage />} path="/:locale/kits" /></Routes>
      </NotificationProvider>
    </MemoryRouter>,
  ));
  expect(host.textContent).toContain("Server Kits");
  expect(host.textContent).toContain("No messages yet.");
  expect(host.textContent).not.toContain("Your Kits");
});
