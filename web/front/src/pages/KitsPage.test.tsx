// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import i18n from "../app/i18n";
import { kitStore } from "../features/kits/store";
import { KitsPage } from "./KitsPage";
import { NotificationProvider } from "../shared/notifications";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-location>
      {location.pathname}
      {location.search}
    </output>
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  for (const kit of kitStore.getSnapshot()) kitStore.remove(kit.id);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});

describe("built-in Kit examples", () => {
  it("opens a documentation example as a fresh independent draft and clears its URL data", async () => {
    const original = kitStore.createDraft("Existing", { content: "Keep me" });
    const example = {
      schema: "pokkan-kit",
      version: 1,
      id: original.id,
      name: "Workshop",
      arguments: [],
      placeholders: [],
      message: { content: "Try **editing** this" },
    };
    flushSync(() =>
      root.render(
        <MemoryRouter
          initialEntries={[
            `/en/kits?example=import#${encodeURIComponent(JSON.stringify(example))}`,
          ]}
        >
          <NotificationProvider>
            <Routes>
              <Route element={<KitsPage />} path="/:locale/kits" />
              <Route element={<LocationProbe />} path="/:locale/kits/:id" />
            </Routes>
          </NotificationProvider>
        </MemoryRouter>,
      ),
    );
    await vi.waitFor(() => expect(kitStore.getSnapshot()).toHaveLength(2));
    const copy = kitStore.getSnapshot().find((kit) => kit.id !== original.id)!;
    expect(copy.name).toBe(example.name);
    expect(copy.message).toEqual(example.message);
    expect(
      kitStore.getSnapshot().find((kit) => kit.id === original.id)?.message
        .content,
    ).toBe("Keep me");
    await vi.waitFor(() =>
      expect(host.querySelector("[data-location]")?.textContent).toBe(
        `/en/kits/${copy.id}`,
      ),
    );
  });

  it.each([
    "not-json",
    encodeURIComponent(
      JSON.stringify({ name: "Invalid", schema: "pokkan-kit", version: 99 }),
    ),
    "x".repeat(100_001),
  ])(
    "rejects an invalid documentation example without creating a draft",
    async (fragment) => {
      flushSync(() =>
        root.render(
          <MemoryRouter
            initialEntries={[`/en/kits?example=import#${fragment}`]}
          >
            <NotificationProvider>
              <Routes>
                <Route element={<KitsPage />} path="/:locale/kits" />
              </Routes>
            </NotificationProvider>
          </MemoryRouter>,
        ),
      );
      await vi.waitFor(() =>
        expect(host.querySelector('[role="alert"]')).not.toBeNull(),
      );
      expect(kitStore.getSnapshot()).toHaveLength(0);
    },
  );

  it("lists existing Kits with an explicit action menu and offers example starting points", async () => {
    const kit = kitStore.createDraft("Weekly announcement", {
      content: "Hello",
    });
    flushSync(() =>
      root.render(
        <MemoryRouter initialEntries={["/en/kits"]}>
          <NotificationProvider>
            <Routes>
              <Route element={<KitsPage />} path="/:locale/kits" />
              <Route element={<LocationProbe />} path="/:locale/kits/:id" />
            </Routes>
          </NotificationProvider>
        </MemoryRouter>,
      ),
    );
    expect(
      host.querySelector(`a[href="/en/kits/${kit.id}"]`)?.textContent,
    ).toContain(kit.name);
    expect(host.querySelectorAll('a[href*="?example="]')).toHaveLength(3);
    expect(host.textContent).toContain(i18n.t("app.legacyChoice"));
    flushSync(() =>
      host.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!.click(),
    );
    const duplicate = [
      ...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    ].find((button) => button.textContent?.includes(i18n.t("app.duplicate")))!;
    flushSync(() => duplicate.click());
    await vi.waitFor(() => expect(kitStore.getSnapshot()).toHaveLength(2));
    expect(
      kitStore.getSnapshot().every((item) => item.message.content === "Hello"),
    ).toBe(true);
  });
  it("turns a valid example query into one ordinary local Kit editor", async () => {
    flushSync(() =>
      root.render(
        <MemoryRouter initialEntries={["/en/kits?example=legacy"]}>
          <NotificationProvider>
            <Routes>
              <Route element={<KitsPage />} path="/:locale/kits" />
              <Route element={<LocationProbe />} path="/:locale/kits/:id" />
            </Routes>
          </NotificationProvider>
        </MemoryRouter>,
      ),
    );

    await vi.waitFor(() =>
      expect(host.querySelector("[data-location]")?.textContent).toBe(
        "/en/kits/" + kitStore.getSnapshot()[0]?.id,
      ),
    );
    const [kit] = kitStore.getSnapshot();
    expect(kit?.name).toBe("Legacy");
    expect(kit?.message.content).toBe(i18n.t("landing.sampleLegacyContent"));
  });
});

describe("creating and sending Kits from one route", () => {
  it.each(["en", "pt-BR", "es", "ja"])(
    "uses the localized suggested name when %s is left blank",
    async (locale) => {
      await i18n.changeLanguage(locale);
      const first = i18n.t("app.suggestedKitName.componentsV2", { number: 1 });
      kitStore.createDraft(first, { content: "Existing" });
      flushSync(() =>
        root.render(
          <MemoryRouter initialEntries={[`/${locale}/kits`]}>
            <NotificationProvider>
              <Routes>
                <Route element={<KitsPage />} path="/:locale/kits" />
                <Route element={<LocationProbe />} path="/:locale/kits/:id" />
              </Routes>
            </NotificationProvider>
          </MemoryRouter>,
        ),
      );
      const suggestion = i18n.t("app.suggestedKitName.componentsV2", {
        number: 2,
      });
      expect(
        host.querySelector<HTMLInputElement>("#kit-name")?.placeholder,
      ).toBe(suggestion);
      expect(host.querySelector<HTMLInputElement>("#kit-name")?.maxLength).toBe(
        160,
      );
      flushSync(() =>
        host
          .querySelector<HTMLButtonElement>(
            '.kit-create button[type="submit"]',
          )!
          .click(),
      );
      await vi.waitFor(() =>
        expect(
          kitStore.getSnapshot().find((kit) => kit.name === suggestion),
        ).toBeDefined(),
      );
    },
  );

  it("selects a Kit for sending without leaving /kits", async () => {
    const first = kitStore.createDraft("First", { content: "First" });
    const second = kitStore.createDraft("Second", { content: "Second" });
    flushSync(() =>
      root.render(
        <MemoryRouter initialEntries={[`/en/kits?kit=${first.id}`]}>
          <NotificationProvider>
            <LocationProbe />
            <Routes>
              <Route element={<KitsPage />} path="/:locale/kits" />
            </Routes>
          </NotificationProvider>
        </MemoryRouter>,
      ),
    );
    const picker = host.querySelector<HTMLSelectElement>(
      ".kits-send-picker select",
    )!;
    expect(picker.value).toBe(first.id);
    expect(
      host.querySelector('section[aria-label="Message preview"]'),
    ).not.toBeNull();
    expect(host.querySelector('button[type="submit"]:disabled')).not.toBeNull();
    flushSync(() => {
      picker.value = second.id;
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await vi.waitFor(() =>
      expect(host.querySelector("[data-location]")?.textContent).toBe(
        `/en/kits?kit=${second.id}`,
      ),
    );
    expect(
      host.querySelector<HTMLSelectElement>(".kits-send-picker select")?.value,
    ).toBe(second.id);
  });

  it("shows transport incompatibility without blocking Kit creation", () => {
    const kit = kitStore.createDraft("Interactive", {
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 1, label: "Run", custom_id: "run" }],
        },
      ],
    });
    flushSync(() =>
      root.render(
        <MemoryRouter initialEntries={[`/en/kits?kit=${kit.id}`]}>
          <NotificationProvider>
            <Routes>
              <Route element={<KitsPage />} path="/:locale/kits" />
            </Routes>
          </NotificationProvider>
        </MemoryRouter>,
      ),
    );
    expect(host.textContent).toContain("Interactive controls");
    expect(
      host.querySelector<HTMLButtonElement>(
        '.kit-delivery button[type="submit"]',
      )?.disabled,
    ).toBe(true);
    expect(
      host.querySelector('.kits-actions button[aria-pressed="false"]'),
    ).not.toBeNull();
  });
});
