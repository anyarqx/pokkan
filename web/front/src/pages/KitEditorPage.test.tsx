// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../app/i18n";
import { KitEditorPage } from "./KitEditorPage";
import { kitStore } from "../features/kits/store";
import { getKit, saveKit } from "../features/kits/api";
import { NotificationProvider } from "../shared/notifications";
import type { Kit } from "../features/kits/domain";

let selectedContext = "1001";
vi.mock("../shared/session", () => ({
  useSession: () => ({ loading: false, account: { id: "alice" } }),
  refreshSession: vi.fn(),
}));
vi.mock("../shared/contexts", () => ({
  useContexts: () => ({
    loading: false,
    selected_context_id: selectedContext,
    guilds: [{ id: "1001", name: "Server", status: "installed" }],
  }),
  selectContext: vi.fn(),
  loadContexts: vi.fn(),
}));
vi.mock("../shared/serverMetadata", () => ({
  useServerMetadata: () => ({ loading: false }),
  clearServerMetadata: vi.fn(),
}));
vi.mock("../features/kits/api", () => ({
  getKit: vi.fn(),
  saveKit: vi.fn(),
  deleteKit: vi.fn(),
}));

const id = "11d51f09-8c3c-49dc-94e0-aa4c090f81a4";
const serverKit: Kit = {
  id,
  name: "Server announcement",
  arguments: [],
  placeholders: [],
  message: { content: "Hello server" },
  guild_id: "1001",
  creator_id: "someone-else",
  revision: 4,
  can_edit: false,
};

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
  await i18n.changeLanguage("en");
  kitStore.setAccount("alice");
  selectedContext = "1001";
  for (const kit of kitStore.getSnapshot()) kitStore.remove(kit.id);
  vi.mocked(getKit).mockReset();
  vi.mocked(saveKit).mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});

function open() {
  flushSync(() =>
    root.render(
      <MemoryRouter initialEntries={[`/en/kits/${id}`]}>
        <NotificationProvider>
          <Routes>
            <Route element={<KitEditorPage />} path="/:locale/kits/:id" />
            <Route element={<p>Kit list</p>} path="/:locale/kits" />
          </Routes>
        </NotificationProvider>
      </MemoryRouter>,
    ),
  );
}

it("opens a direct server Kit URL and keeps a member's view read only", async () => {
  vi.mocked(getKit).mockResolvedValue(serverKit);
  open();
  await vi.waitFor(() => expect(host.textContent).toContain("Hello server"));
  expect(host.textContent).toContain("Read only");
  expect(host.querySelector(".editor-canvas.is-readonly")).not.toBeNull();
  expect(host.querySelector('[aria-label="Delete kit"]')).toBeNull();
  flushSync(() =>
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }),
    ),
  );
  expect(saveKit).not.toHaveBeenCalled();
});

it("keeps a draft after a stale revision is rejected", async () => {
  vi.mocked(getKit).mockResolvedValue({
    ...serverKit,
    can_edit: true,
    creator_id: "alice",
  });
  vi.mocked(saveKit).mockRejectedValue(
    new (await import("../shared/api")).ApiError(409, "Changed", {
      code: "kit_conflict",
    }),
  );
  open();
  await vi.waitFor(() => expect(host.textContent).toContain("Hello server"));
  const title = [...host.querySelectorAll<HTMLButtonElement>("h1 button")][0];
  flushSync(() => title.click());
  const name = host.querySelector<HTMLElement>(
    '[role="textbox"][aria-label="Rename Kit"]',
  )!;
  flushSync(() => {
    name.textContent = "My unfinished change";
    name.dispatchEvent(new Event("input", { bubbles: true }));
  });
  flushSync(() =>
    name.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  const button = await vi.waitFor(() => {
    const found = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (item) => item.textContent?.trim() === "Save",
    );
    expect(found).toBeDefined();
    return found!;
  });
  flushSync(() => button.click());
  await vi.waitFor(() => expect(host.textContent).toContain("Reload latest"));
  expect(kitStore.find(id)?.name).toBe("My unfinished change");
  expect(kitStore.isDirty(id)).toBe(true);
  expect(saveKit).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "My unfinished change",
      revision: 4,
      guild_id: "1001",
      message: serverKit.message,
    }),
  );
});

it("leaves the open server Kit when the selected context changes without losing a draft", async () => {
  vi.mocked(getKit).mockResolvedValue({
    ...serverKit,
    can_edit: true,
    creator_id: "alice",
  });
  open();
  await vi.waitFor(() => expect(host.textContent).toContain("Hello server"));
  flushSync(() => kitStore.update(id, { name: "Unfinished" }));
  selectedContext = "personal";
  open();
  await vi.waitFor(() => expect(host.textContent).toContain("Kit list"));
  expect(kitStore.find(id)?.name).toBe("Unfinished");
  expect(kitStore.isDirty(id)).toBe(true);
});

it("does not render a cached server Kit after direct access is denied", async () => {
  kitStore.upsertSaved(serverKit, "alice");
  vi.mocked(getKit).mockRejectedValue(
    new (await import("../shared/api")).ApiError(404, "Not found", {
      code: "not_found",
    }),
  );
  open();
  await vi.waitFor(() => expect(host.textContent).toContain("Not found"));
  expect(host.textContent).not.toContain("Hello server");
  expect(kitStore.isSaved(id)).toBe(false);
});

it("stops editor mutations when server access is lost during a save", async () => {
  vi.mocked(getKit).mockResolvedValue({
    ...serverKit,
    can_edit: true,
    creator_id: "alice",
  });
  vi.mocked(saveKit).mockRejectedValue(
    new (await import("../shared/api")).ApiError(403, "Denied", {
      code: "context_forbidden",
    }),
  );
  open();
  await vi.waitFor(() => expect(host.textContent).toContain("Hello server"));
  flushSync(() => kitStore.update(id, { name: "Unsaved" }));
  const save = await vi.waitFor(() => {
    const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (item) => item.textContent?.trim() === "Save",
    );
    expect(button).toBeDefined();
    return button!;
  });
  flushSync(() => save.click());
  await vi.waitFor(() =>
    expect(host.textContent).toContain("Access to this Kit changed"),
  );
  expect(host.querySelector(".editor-canvas.is-readonly")).not.toBeNull();
  expect(kitStore.find(id)?.name).toBe("Unsaved");
  expect(kitStore.isDirty(id)).toBe(true);
});
