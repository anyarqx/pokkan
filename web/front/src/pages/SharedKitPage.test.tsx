// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../app/i18n";
import { SharedKitPage } from "./SharedKitPage";
import { getSharedKit, saveSharedKit } from "../features/kits/sharing";
import { kitStore } from "../features/kits/store";
import type { Kit } from "../features/kits/domain";
import {
  ApiError,
  discordLoginUrl,
  rememberAuthFragment,
  takeAuthFragment,
} from "../shared/api";
import { NotificationProvider } from "../shared/notifications";

let accountId: string | undefined;
vi.mock("../shared/session", () => ({
  useSession: () => ({
    loading: false,
    account: accountId ? { id: accountId } : undefined,
  }),
}));
vi.mock("../shared/contexts", () => ({
  useContexts: () => ({
    loading: false,
    guilds: [],
    selected_context_id: "unrelated-server",
  }),
}));
vi.mock("../shared/serverMetadata", () => ({
  useServerMetadata: () => ({ loading: false }),
  clearServerMetadata: vi.fn(),
}));
vi.mock("../features/kits/sharing", async (original) => ({
  ...(await original<typeof import("../features/kits/sharing")>()),
  getSharedKit: vi.fn(),
  saveSharedKit: vi.fn(),
}));

const id = "45454545-4545-4545-8545-454545454545";
const token = "T".repeat(43);
const original: Kit = {
  id,
  name: "Shared event",
  arguments: [],
  placeholders: [],
  message: { content: "Friday meetup" },
  revision: 3,
  can_edit: true,
};
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
  await i18n.changeLanguage("en");
  accountId = undefined;
  kitStore.setAccount(undefined);
  for (const kit of kitStore.getSnapshot()) kitStore.remove(kit.id);
  sessionStorage.clear();
  vi.mocked(getSharedKit)
    .mockReset()
    .mockResolvedValue({
      kit: structuredClone(original),
      share: { permission: "edit", audience: "anyone", expires_at: null },
    });
  vi.mocked(saveSharedKit).mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});

function render(locale = "en", hash = token) {
  flushSync(() =>
    root.render(
      <MemoryRouter initialEntries={[`/${locale}/shared/${id}#${hash}`]}>
        <NotificationProvider>
          <Routes>
            <Route element={<SharedKitPage />} path="/:locale/shared/:id" />
            <Route element={<p>Own messages</p>} path="/:locale/kits/:id" />
          </Routes>
        </NotificationProvider>
      </MemoryRouter>,
    ),
  );
}
function button(label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  )!;
}
async function opened() {
  await vi.waitFor(() => expect(host.textContent).toContain("Friday meetup"));
}
function edit(value: string) {
  const target = host.querySelector<HTMLElement>(
    '[role="textbox"][aria-label="Message content"]',
  )!;
  flushSync(() => target.click());
  const field = host.querySelector<HTMLElement>('[contenteditable="true"]')!;
  flushSync(() => {
    field.textContent = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
}

it.each(["en", "pt-BR", "es", "ja"])(
  "opens view-only links and imports a separate personal copy (%s)",
  async (locale) => {
    await i18n.changeLanguage(locale);
    vi.mocked(getSharedKit).mockResolvedValue({
      kit: { ...original, can_edit: false },
      share: { permission: "view", audience: "anyone", expires_at: null },
    });
    render(locale);
    await opened();
    flushSync(() =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Delete", bubbles: true }),
      ),
    );
    flushSync(() =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "s",
          ctrlKey: true,
          bubbles: true,
        }),
      ),
    );
    expect(saveSharedKit).not.toHaveBeenCalled();
    expect(kitStore.find(id)).toBeUndefined();
    flushSync(() => button(i18n.t("sharing.importCopy")).click());
    const copy = kitStore.getSnapshot()[0];
    expect(copy.id).not.toBe(id);
    expect(copy.message).toEqual(original.message);
    expect(copy.guild_id).toBeUndefined();
    expect(copy.revision).toBeUndefined();
  },
);

it("preserves unsaved editing and history through background checks, then saves only to the capability resource", async () => {
  render();
  await opened();
  edit("Pending shared edit");
  const canvas = host.querySelector(".editor-canvas");
  flushSync(() => window.dispatchEvent(new Event("focus")));
  await vi.waitFor(() => expect(getSharedKit).toHaveBeenCalledTimes(2));
  expect(host.querySelector(".editor-canvas")).toBe(canvas);
  expect(host.textContent).toContain("Pending shared edit");
  flushSync(() => button("Undo").click());
  expect(host.textContent).toContain("Friday meetup");
  flushSync(() => button("Redo").click());
  expect(host.textContent).toContain("Pending shared edit");
  vi.mocked(saveSharedKit).mockImplementation(async (_access, kit) => ({
    ...kit,
    revision: 4,
  }));
  flushSync(() => button("Save").click());
  await vi.waitFor(() => expect(saveSharedKit).toHaveBeenCalledTimes(1));
  expect(vi.mocked(saveSharedKit).mock.calls[0]).toEqual([
    { id, token, manager: false },
    { ...original, message: { content: "Pending shared edit" } },
  ]);
  expect(kitStore.find(id)).toBeUndefined();
});

it("keeps pending content on a revision conflict and reloads only after explicit confirmation", async () => {
  render();
  await opened();
  edit("My pending edit");
  vi.mocked(saveSharedKit).mockRejectedValue(
    new ApiError(409, "Conflict", { code: "kit_conflict" }),
  );
  flushSync(() => button("Save").click());
  await vi.waitFor(() => expect(button("Reload latest")).toBeDefined());
  expect(host.textContent).toContain("My pending edit");
  expect(
    JSON.stringify(
      [...Array(sessionStorage.length)].map((_, index) =>
        sessionStorage.getItem(sessionStorage.key(index)!),
      ),
    ),
  ).toContain("My pending edit");
  vi.mocked(getSharedKit).mockResolvedValue({
    kit: {
      ...original,
      message: { content: "Newer saved version" },
      revision: 4,
    },
  });
  flushSync(() => button("Reload latest").click());
  await vi.waitFor(() =>
    expect(host.textContent).toContain("Newer saved version"),
  );
  expect(host.textContent).not.toContain("My pending edit");
});

it("removes content after revocation and downgrades editing when a link becomes view-only", async () => {
  render();
  await opened();
  edit("Pending");
  vi.mocked(getSharedKit).mockResolvedValue({
    kit: { ...original, can_edit: false },
  });
  flushSync(() => window.dispatchEvent(new Event("focus")));
  await vi.waitFor(() =>
    expect(host.textContent).toContain(i18n.t("sharing.viewAccess")),
  );
  expect(host.textContent).not.toContain("Pending");
  vi.mocked(getSharedKit).mockRejectedValue(new ApiError(404, "Unavailable"));
  flushSync(() => window.dispatchEvent(new Event("focus")));
  await vi.waitFor(() =>
    expect(host.textContent).toContain(i18n.t("sharing.unavailable")),
  );
  expect(host.textContent).not.toContain("Friday meetup");
  expect(sessionStorage.length).toBe(0);
});

it("does not send bearer fragments to the OAuth return URL", () => {
  const path = `/en/shared/${id}`;
  const destination = `https://pokkan.net${path}#${token}`;
  rememberAuthFragment(destination);
  const login = new URL(discordLoginUrl(destination), window.location.origin);
  expect(login.searchParams.get("return_to")).toBe(`https://pokkan.net${path}`);
  expect(login.href).not.toContain(token);
  expect(takeAuthFragment("/en/account")).toBeUndefined();
  expect(takeAuthFragment(path)).toBe(`#${token}`);
  expect(takeAuthFragment(path)).toBeUndefined();
});

it("isolates recovered edits between authenticated accounts and restores the original account's work", async () => {
  accountId = "alice";
  render();
  await opened();
  edit("Alice's pending edit");
  accountId = "bob";
  render();
  await vi.waitFor(() => expect(getSharedKit).toHaveBeenCalledTimes(2));
  await opened();
  expect(host.textContent).not.toContain("Alice's pending edit");
  edit("Bob's pending edit");
  accountId = "alice";
  render();
  await vi.waitFor(() =>
    expect(host.textContent).toContain("Alice's pending edit"),
  );
  expect(host.textContent).not.toContain("Bob's pending edit");
  expect(kitStore.find(id)).toBeUndefined();
});

it("does not discard the original account's draft when its pending save fails after an account change", async () => {
  accountId = "alice";
  render();
  await opened();
  edit("Alice's unsaved work");
  let rejectSave!: (reason: Error) => void;
  vi.mocked(saveSharedKit).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectSave = reject;
      }),
  );
  flushSync(() => button("Save").click());
  accountId = "bob";
  render();
  await vi.waitFor(() => expect(getSharedKit).toHaveBeenCalledTimes(2));
  await opened();
  rejectSave(new ApiError(401, "Expired session"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(host.textContent).toContain("Friday meetup");
  accountId = "alice";
  render();
  await vi.waitFor(() =>
    expect(host.textContent).toContain("Alice's unsaved work"),
  );
});

it("hides a member-only message on account change without discarding the original account's recovery", async () => {
  accountId = "member";
  vi.mocked(getSharedKit).mockResolvedValue({
    kit: original,
    share: { audience: "members", permission: "edit", expires_at: null },
  });
  render();
  await opened();
  edit("Private pending edit");
  accountId = "other";
  vi.mocked(getSharedKit).mockRejectedValue(
    new ApiError(401, "Authorize again"),
  );
  render();
  expect(host.textContent).not.toContain("Private pending edit");
  await vi.waitFor(() => expect(host.textContent).toContain("Authorize again"));
  expect(host.textContent).not.toContain("Friday meetup");
  expect(saveSharedKit).not.toHaveBeenCalled();
  expect(
    JSON.stringify(
      [...Array(sessionStorage.length)].map((_, index) =>
        sessionStorage.getItem(sessionStorage.key(index)!),
      ),
    ),
  ).toContain("Private pending edit");
});

it("retains changes made during a save and advances their base revision", async () => {
  render();
  await opened();
  edit("First edit");
  let finish!: (kit: Kit) => void;
  vi.mocked(saveSharedKit).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  flushSync(() => button("Save").click());
  edit("Second edit");
  finish({ ...original, message: { content: "First edit" }, revision: 4 });
  await vi.waitFor(() => expect(button("Save")?.disabled).toBe(false));
  expect(host.textContent).toContain("Second edit");
  vi.mocked(saveSharedKit).mockImplementationOnce(async (_access, kit) => ({
    ...kit,
    revision: 5,
  }));
  flushSync(() => button("Save").click());
  await vi.waitFor(() =>
    expect(vi.mocked(saveSharedKit).mock.calls.at(-1)?.[1]).toMatchObject({
      revision: 4,
      message: { content: "Second edit" },
    }),
  );
});

it("does not restore content from a late save response after access was revoked", async () => {
  render();
  await opened();
  edit("Pending save");
  let finish!: (kit: Kit) => void;
  vi.mocked(saveSharedKit).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  flushSync(() => button("Save").click());
  vi.mocked(getSharedKit).mockRejectedValue(new ApiError(404, "Revoked"));
  flushSync(() => window.dispatchEvent(new Event("focus")));
  await vi.waitFor(() =>
    expect(host.textContent).toContain(i18n.t("sharing.unavailable")),
  );
  finish({ ...original, message: { content: "Pending save" }, revision: 4 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(host.textContent).not.toContain("Pending save");
  expect(host.querySelector("[contenteditable]")).toBeNull();
});
