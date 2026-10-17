// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../app/i18n";
import { KitEditorPage } from "./KitEditorPage";
import { NotificationProvider } from "../shared/notifications";
import { refreshSession } from "../shared/session";
import { ApiError, apiFetch } from "../shared/api";
import { kitStore } from "../features/kits/store";
import type { Kit } from "../features/kits/domain";
import { nodeAt } from "../features/editor/tree";

vi.mock("../shared/api", async (original) => ({
  ...(await original<typeof import("../shared/api")>()),
  apiFetch: vi.fn(),
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let account = 0;
let clock = Date.now();
let kit: Kit;
let kitFailure: number | undefined;
let authenticated = true;
let unavailable = false;
let release: (() => void) | undefined;
let hold = false;
const nextId = "66666666-6666-4666-8666-666666666666";

async function act(work: () => void | Promise<void>) {
  let result: void | Promise<void>;
  flushSync(() => {
    result = work();
  });
  await result!;
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(async () => {
  clock = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => clock);
  await i18n.changeLanguage("en");
  account++;
  kitFailure = undefined;
  authenticated = true;
  unavailable = false;
  hold = false;
  kit = {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Welcome",
    revision: 1,
    can_edit: true,
    arguments: [],
    placeholders: [],
    message: {
      flags: 32768,
      components: [
        { type: 17, components: [{ type: 10, content: "Original text" }] },
      ],
    },
  };
  vi.mocked(apiFetch).mockImplementation(async (path) => {
    if (unavailable) throw new ApiError(503, "Unavailable");
    if (path.includes("auth/session"))
      return Response.json({
        authenticated,
        account: { id: String(account), username: "Demo" },
      });
    if (path.endsWith("/contexts")) {
      if (hold)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      return Response.json({
        selected_context_id: kit.guild_id ?? "personal",
        authorization_required: false,
        guilds: kit.guild_id
          ? [{ id: kit.guild_id, name: "Community", status: "installed" }]
          : [],
      });
    }
    if (path.includes("metadata"))
      return Response.json({
        guild_id: kit.guild_id,
        status: "current",
        fetched_at: new Date().toISOString(),
        retry_after: 0,
        guild: { id: kit.guild_id, name: "Community" },
        channels: [],
        roles: [],
      });
    if (kitFailure) throw new ApiError(kitFailure, "Kit unavailable");
    if (path.endsWith(nextId))
      return Response.json({
        kit: {
          ...kit,
          id: nextId,
          name: "Second Kit",
          message: { content: "Another message" },
        },
      });
    return Response.json({ kit });
  });
  await refreshSession(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  release?.();
  release = undefined;
  await act(async () => root.unmount());
  host.remove();
});
async function render() {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[`/en/kits/${kit.id}`]}>
        <NotificationProvider>
          <Link to={`/en/kits/${nextId}`}>Open another Kit</Link>
          <Routes>
            <Route path="/:locale/kits/:id" element={<KitEditorPage />} />
          </Routes>
        </NotificationProvider>
      </MemoryRouter>,
    ),
  );
  await vi.waitFor(() =>
    expect(host.querySelector(".editor-canvas")).not.toBeNull(),
  );
}
function button(label: string) {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find(
    (item) =>
      item.getAttribute("aria-label") === label ||
      item.textContent?.trim() === label,
  );
  if (!found) throw new Error(`Button missing: ${label}`);
  return found;
}
async function returnToPage() {
  clock += 61_000;
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

it("coalesces rapid foreground events without refetching or disturbing an active edit", async () => {
  await render();
  const before = vi.mocked(apiFetch).mock.calls.length;
  const preview = host.querySelector<HTMLElement>(
    ".node-textDisplay .inline-preview",
  )!;
  await act(() => preview.click());
  const source = host.querySelector("[contenteditable]");
  for (let index = 0; index < 5; index++)
    await act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
  expect(vi.mocked(apiFetch).mock.calls.length).toBe(before);
  expect(host.querySelector("[contenteditable]")).toBe(source);
});

it("detects logout in another tab even while foreground data is fresh", async () => {
  await render();
  authenticated = false;
  await act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "pokkan-session-changed",
        newValue: "changed",
      }),
    );
  });
  await vi.waitFor(() =>
    expect(host.querySelector(".editor-canvas")).toBeNull(),
  );
  expect(kitStore.isSaved(kit.id)).toBe(false);
});

it.each([undefined, "100100100100100100"])(
  "preserves inline editing, undo, selection, sheet and rename during background verification (%s)",
  async (guild_id) => {
    kit = { ...kit, guild_id };
    await render();
    const field = host.querySelector<HTMLElement>(
      '[role="textbox"][aria-label="Message content"]',
    )!;
    await act(async () => field.click());
    const input = host.querySelector<HTMLElement>('[contenteditable="true"]')!;
    await act(async () => {
      input.textContent = "Pending text";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const canvas = host.querySelector(".editor-canvas");
    hold = true;
    await returnToPage();
    expect(canvas?.isConnected).toBe(true);
    expect(host.querySelector('[contenteditable="true"]')).toBe(input);
    expect(input.textContent).toBe("Pending text");
    await act(async () => {
      release?.();
    });
    hold = false;
    expect(
      nodeAt(kitStore.find(kit.id)!.message, ["components", 0, "components", 0])
        ?.content,
    ).toBe("Pending text");
    await act(async () => input.blur());
    await act(async () => button("Undo").click());
    expect(host.textContent).toContain("Original text");
    await returnToPage();
    expect(button("Redo").disabled).toBe(false);
    await act(async () => button("Redo").click());
    await act(async () => button("Configure Container").click());
    const sheet = document.querySelector('[role="dialog"]');
    await returnToPage();
    expect(document.querySelector('[role="dialog"]')).toBe(sheet);
    await act(async () => button("Close").click());
    await act(async () => button("Welcome").click());
    const rename = host.querySelector(
      '[role="textbox"][aria-label="Rename Kit"]',
    );
    await returnToPage();
    expect(
      host.querySelector('[role="textbox"][aria-label="Rename Kit"]'),
    ).toBe(rename);
    expect(canvas?.isConnected).toBe(true);
  },
);

it("keeps the editor through temporary network failures, then removes content on revoked resource access", async () => {
  await render();
  const canvas = host.querySelector(".editor-canvas");
  unavailable = true;
  await returnToPage();
  expect(canvas?.isConnected).toBe(true);
  unavailable = false;
  kitFailure = 403;
  await returnToPage();
  expect(host.querySelector(".editor-canvas")).toBeNull();
  expect(host.textContent).toContain("Kit unavailable");
});

it("updates editing permission without remounting and clears an expired account", async () => {
  await render();
  const canvas = host.querySelector(".editor-canvas");
  kit = { ...kit, can_edit: false };
  await returnToPage();
  expect(canvas?.isConnected).toBe(true);
  expect(host.querySelector('[contenteditable="true"]')).toBeNull();
  expect(host.textContent).toContain(i18n.t("app.readOnlyKit"));
  authenticated = false;
  await returnToPage();
  expect(host.querySelector(".editor-canvas")).toBeNull();
});

it("initializes a different document on real Kit navigation", async () => {
  await render();
  const canvas = host.querySelector(".editor-canvas");
  await act(async () =>
    host.querySelector<HTMLAnchorElement>(`a[href$="${nextId}"]`)!.click(),
  );
  await vi.waitFor(() => expect(host.textContent).toContain("Another message"));
  expect(canvas?.isConnected).toBe(false);
  expect(host.querySelector("h1")?.textContent).toBe("Second Kit");
  expect(button("Undo").disabled).toBe(true);
});

it("ignores an earlier session response after a confirmed logout", async () => {
  await render();
  let finish!: (response: Response) => void;
  vi.mocked(apiFetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const earlier = refreshSession();
  authenticated = false;
  await act(async () => {
    await refreshSession(true);
  });
  await act(async () => {
    finish(
      Response.json({
        authenticated: true,
        account: { id: String(account), username: "Demo" },
      }),
    );
    await earlier;
  });
  expect(host.querySelector(".editor-canvas")).toBeNull();
});
