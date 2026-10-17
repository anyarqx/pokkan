// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../app/i18n";
import { kitStore } from "../features/kits/store";
import { NotificationProvider } from "../shared/notifications";
import { KitsPage } from "./KitsPage";

const auth = vi.hoisted(() => ({ loading: false, guildStatus: "installed" }));
vi.mock("../shared/session", () => ({
  useSession: () => ({
    loading: auth.loading,
    account: auth.loading ? undefined : { id: "alice" },
  }),
}));
vi.mock("../shared/contexts", () => ({
  useContexts: () => ({
    loading: false,
    selected_context_id: auth.loading ? "personal" : "1001",
    guilds: [{ id: "1001", name: "Example Server", status: auth.guildStatus }],
  }),
}));

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
  auth.loading = false;
  auth.guildStatus = "installed";
  await i18n.changeLanguage("en");
  kitStore.setAccount("alice");
  for (const kit of kitStore.getSnapshot()) kitStore.remove(kit.id);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

it.each(["legacy", "import"])(
  "waits for initial identity before opening the %s example in the selected server",
  async (kind) => {
    const original = kitStore.createDraft("Personal draft", {
      content: "Keep this",
    });
    const example = {
      schema: "pokkan-kit",
      version: 1,
      id: original.id,
      name: "Support panel",
      arguments: [],
      placeholders: [],
      message: { content: "How can we help?" },
    };
    const query =
      kind === "import"
        ? `import#${encodeURIComponent(JSON.stringify(example))}`
        : kind;
    const render = () =>
      flushSync(() =>
        root.render(
          <MemoryRouter initialEntries={[`/en/kits?example=${query}`]}>
            <NotificationProvider>
              <Routes>
                <Route element={<KitsPage />} path="/:locale/kits" />
                <Route
                  element={<p>Editor opened</p>}
                  path="/:locale/kits/:id"
                />
              </Routes>
            </NotificationProvider>
          </MemoryRouter>,
        ),
      );
    auth.loading = true;
    render();
    expect(kitStore.getSnapshot()).toHaveLength(1);
    expect(host.textContent).not.toContain("Editor opened");
    auth.loading = false;
    render();
    await vi.waitFor(() => expect(host.textContent).toContain("Editor opened"));
    const created = kitStore
      .getSnapshot()
      .find((kit) => kit.id !== original.id)!;
    expect(created.guild_id).toBe("1001");
    expect(kitStore.find(original.id)?.message.content).toBe("Keep this");
    expect(kitStore.find(original.id)?.guild_id).toBeUndefined();
  },
);
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});

it.each([
  ["en", "invite"],
  ["pt-BR", "unavailable"],
  ["es", "unknown"],
  ["ja", "installed"],
])(
  "creates a %s Kit in the selected %s server without moving personal Kits",
  async (locale, status) => {
    auth.guildStatus = status;
    await i18n.changeLanguage(locale);
    const personal = kitStore.createDraft("Personal only", {
      content: "Personal",
    });
    flushSync(() =>
      root.render(
        <MemoryRouter initialEntries={[`/${locale}/kits`]}>
          <NotificationProvider>
            <Routes>
              <Route element={<KitsPage />} path="/:locale/kits" />
              <Route element={<p>Editor opened</p>} path="/:locale/kits/:id" />
            </Routes>
          </NotificationProvider>
        </MemoryRouter>,
      ),
    );
    expect(host.textContent).toContain("Example Server");
    expect(host.textContent).not.toContain("Personal only");
    flushSync(() =>
      host
        .querySelector<HTMLButtonElement>('.kit-create button[type="submit"]')!
        .click(),
    );
    await vi.waitFor(() => expect(host.textContent).toContain("Editor opened"));
    const created = kitStore
      .getSnapshot()
      .find((item) => item.id !== personal.id)!;
    expect(created.guild_id).toBe("1001");
    expect(kitStore.find(personal.id)?.guild_id).toBeUndefined();
  },
);

it("labels an empty server collection without implying personal ownership", () => {
  flushSync(() =>
    root.render(
      <MemoryRouter initialEntries={["/en/kits"]}>
        <NotificationProvider>
          <Routes>
            <Route element={<KitsPage />} path="/:locale/kits" />
          </Routes>
        </NotificationProvider>
      </MemoryRouter>,
    ),
  );
  expect(host.textContent).toContain("Server Kits");
  expect(host.textContent).toContain("No messages yet.");
  expect(host.textContent).not.toContain("Your Kits");
});
