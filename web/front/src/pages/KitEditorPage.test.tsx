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
let installation = "installed";
vi.mock("../shared/session", () => ({
  useSession: () => ({ loading: false, account: { id: "alice" } }),
  refreshSession: vi.fn(),
}));
vi.mock("../shared/contexts", () => ({
  useContexts: () => ({
    loading: false,
    selected_context_id: selectedContext,
    guilds: [{ id: "1001", name: "Server", status: installation }],
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
  installation = "installed";
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

it("opens a direct server Kit URL without bot installation and keeps a member's view read only", async () => {
  installation = "invite";
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

it("keeps text activation and editing shortcuts separate from selected-component actions", async () => {
  vi.mocked(getKit).mockResolvedValue({
    ...serverKit,
    can_edit: true,
    message: { flags: 32768, components: [{ type: 10, content: "A message" }] },
  });
  open();
  await vi.waitFor(() => expect(host.textContent).toContain("A message"));
  flushSync(() =>
    host.querySelector<HTMLElement>(".node-textDisplay")!.click(),
  );
  const preview = host.querySelector<HTMLElement>(
    '[role="textbox"][aria-label="Message content"]',
  )!;
  const back = new KeyboardEvent("keydown", {key: "Backspace", bubbles: true, cancelable: true});
  flushSync(() => preview.dispatchEvent(back));
  expect(back.defaultPrevented).toBe(true);
  expect(host.textContent).toContain("A message");
  flushSync(() =>
    preview.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  const field = host.querySelector<HTMLElement>('[contenteditable="true"]')!;
  expect(document.activeElement).toBe(field);
  const contextMenu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  flushSync(() => field.dispatchEvent(contextMenu));
  expect(contextMenu.defaultPrevented).toBe(false);
  expect(document.querySelector('[role="menu"]')).toBeNull();
  vi.useFakeTimers();
  try {
    const touch = new Event("pointerdown", { bubbles: true });
    Object.defineProperty(touch, "pointerType", { value: "touch" });
    flushSync(() => field.dispatchEvent(touch));
    flushSync(() => vi.advanceTimersByTime(500));
    expect(document.querySelector('[role="menu"]')).toBeNull();
  } finally {
    vi.useRealTimers();
  }
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "d",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(host.querySelectorAll(".node-textDisplay")).toHaveLength(1);
  expect(kitStore.find(id)?.message).toMatchObject({
    components: [{ content: "A message\n" }],
  });
  expect(document.activeElement).toBe(field);
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
  await vi.waitFor(() =>
    expect(host.textContent).toContain(i18n.t("app.recoverAndReload")),
  );
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
  vi.mocked(getKit).mockResolvedValue({
    ...serverKit,
    revision: 5,
    can_edit: true,
    name: "Latest saved name",
  });
  const recover = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent === i18n.t("app.recoverAndReload"),
  )!;
  flushSync(() => recover.click());
  await vi.waitFor(() =>
    expect(kitStore.find(id)?.name).toBe("Latest saved name"),
  );
  expect(kitStore.getSnapshot()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "My unfinished change — recovered",
        guild_id: "1001",
        message: serverKit.message,
      }),
    ]),
  );
  expect(
    kitStore.getSnapshot().find((kit) => kit.name === "My unfinished change — recovered")
      ?.id,
  ).not.toBe(id);
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
