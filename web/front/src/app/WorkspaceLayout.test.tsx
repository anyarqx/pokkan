// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "./i18n";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { kitStore } from "../features/kits/store";
import { messageWithContent } from "../features/kits/domain";
import { NotificationProvider } from "../shared/notifications";

vi.mock("../shared/session", () => ({
  useSession: () => ({ loading: false }),
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let compact = false;
let mediaChanged: (() => void) | undefined;
beforeEach(async () => {
  compact = false;
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return compact;
    },
    addEventListener: (_event: string, listener: () => void) => {
      mediaChanged = listener;
    },
    removeEventListener: () => {
      mediaChanged = undefined;
    },
  }));
  await i18n.changeLanguage("en");
  for (const kit of kitStore.getSnapshot()) kitStore.remove(kit.id);
  kitStore.createDraft("Announcement", messageWithContent("legacy", "Hello"));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root.render(
      <MemoryRouter initialEntries={["/en/kits"]}>
        <NotificationProvider>
          <Routes>
            <Route path="/:locale" element={<WorkspaceLayout />}>
              <Route path="kits/*" element={<p>Editor</p>} />
            </Route>
          </Routes>
        </NotificationProvider>
      </MemoryRouter>,
    ),
  );
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("keeps the compact drawer modal, restores focus and clears its state when returning to desktop", () => {
  flushSync(() => {
    compact = true;
    mediaChanged?.();
  });
  const opener = host.querySelector<HTMLButtonElement>(
    '[aria-controls="workspace-sidebar"]',
  )!;
  vi.spyOn(opener, "getClientRects").mockReturnValue([
    { width: 100 },
  ] as unknown as DOMRectList);
  const editor = [...host.querySelectorAll("p")].find(
    (item) => item.textContent === "Editor",
  )!.parentElement!;
  const navigation = host.querySelector("aside")!;
  expect(navigation.hasAttribute("inert")).toBe(true);
  flushSync(() => opener.click());
  expect(navigation.getAttribute("role")).toBe("dialog");
  expect(navigation.hasAttribute("inert")).toBe(false);
  expect(editor.inert).toBe(true);
  flushSync(() =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
  );
  expect(navigation.hasAttribute("inert")).toBe(true);
  expect(editor.inert).toBeFalsy();
  expect(document.activeElement).toBe(opener);
  flushSync(() => opener.click());
  flushSync(() => {
    compact = false;
    mediaChanged?.();
  });
  expect(navigation.hasAttribute("role")).toBe(false);
  expect(navigation.hasAttribute("inert")).toBe(false);
  expect(editor.inert).toBeFalsy();
  expect(opener.getAttribute("aria-expanded")).toBe("false");
});

it("exposes Kit actions without right click and duplicates the chosen Kit", () => {
  const trigger = host.querySelector<HTMLButtonElement>(
    '[aria-label="Actions for Announcement"]',
  )!;
  flushSync(() => trigger.click());
  const duplicate = [
    ...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
  ].find((button) => button.textContent?.includes("Duplicate"))!;
  flushSync(() => duplicate.click());
  expect(kitStore.getSnapshot()).toHaveLength(2);
  expect(kitStore.getSnapshot()[0].message.content).toBe("Hello");
  expect(document.querySelector('[role="menu"]')).toBeNull();
});

it("returns focus to Kit actions on Escape and dismisses on outside pointer input", () => {
  const trigger = host.querySelector<HTMLButtonElement>(
    '[aria-label="Actions for Announcement"]',
  )!;
  flushSync(() => trigger.click());
  expect(
    document.querySelector('[role="menu"]')?.contains(document.activeElement),
  ).toBe(true);
  flushSync(() =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
  );
  expect(document.activeElement).toBe(trigger);
  expect(document.querySelector('[role="menu"]')).toBeNull();
  flushSync(() => trigger.click());
  flushSync(() =>
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true })),
  );
  expect(document.querySelector('[role="menu"]')).toBeNull();
});
