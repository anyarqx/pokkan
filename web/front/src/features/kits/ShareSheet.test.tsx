// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import { NotificationProvider } from "../../shared/notifications";
import { ShareSheet } from "./ShareSheet";
import { kitStore } from "./store";
import type { Kit } from "./domain";
import {
  changeKitShare,
  createTemporaryKit,
  listKitShares,
  regenerateKitShare,
  revokeKitShare,
} from "./sharing";

let accountId: string | undefined = "owner";
vi.mock("../../shared/session", () => ({
  useSession: () => ({
    loading: false,
    account: accountId ? { id: accountId } : undefined,
  }),
}));
vi.mock("./sharing", async (original) => ({
  ...(await original<typeof import("./sharing")>()),
  changeKitShare: vi.fn(),
  createTemporaryKit: vi.fn(),
  listKitShares: vi.fn(),
  regenerateKitShare: vi.fn(),
  revokeKitShare: vi.fn(),
}));
const id = "45454545-4545-4545-8545-454545454545";
const shareId = "56565656-5656-4565-8565-565656565656";
const link = {
  id: shareId,
  permission: "view" as const,
  audience: "anyone" as const,
  expires_at: null,
  created_at: new Date().toISOString(),
};
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
  await i18n.changeLanguage("en");
  accountId = "owner";
  sessionStorage.clear();
  kitStore.setAccount(accountId);
  for (const kit of kitStore.getSnapshot()) kitStore.remove(kit.id);
  vi.mocked(listKitShares).mockReset().mockResolvedValue([]);
  vi.mocked(changeKitShare)
    .mockReset()
    .mockResolvedValue({ share: link, token: "A".repeat(43) });
  vi.mocked(regenerateKitShare)
    .mockReset()
    .mockResolvedValue({ share: link, token: "B".repeat(43) });
  vi.mocked(revokeKitShare).mockReset().mockResolvedValue(undefined);
  vi.mocked(createTemporaryKit).mockReset();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});
function open(kit: Kit) {
  const close = vi.fn();
  flushSync(() =>
    root.render(
      <MemoryRouter initialEntries={["/en"]}>
        <NotificationProvider>
          <Routes>
            <Route
              path="/:locale"
              element={<ShareSheet kit={kit} close={close} />}
            />
          </Routes>
        </NotificationProvider>
      </MemoryRouter>,
    ),
  );
  return close;
}
function button(label: string, scope: ParentNode = host) {
  return [...scope.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  )!;
}
function choose(label: string, value: string, scope: ParentNode = host) {
  const select = scope.querySelector<HTMLSelectElement>(
    `select[aria-label="${label}"]`,
  );
  if (!select) {
    const toggle = scope.querySelector<HTMLButtonElement>(
      `button[role="switch"][aria-label^="${label}:"]`,
    )!;
    const checked = value === "edit" || value === "anyone";
    if ((toggle.getAttribute("aria-checked") === "true") !== checked)
      flushSync(() => toggle.click());
    return;
  }
  flushSync(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
it.each([undefined, "1001"])(
  "creates view-only access in the appropriate context (%s)",
  async (guild_id) => {
    const kit: Kit = {
      id,
      name: "Event",
      arguments: [],
      placeholders: [],
      message: { content: "Meetup" },
      guild_id,
      revision: 1,
      can_manage_sharing: true,
    };
    kitStore.upsertSaved(kit, "owner");
    open(kit);
    await vi.waitFor(() => expect(listKitShares).toHaveBeenCalledWith({ id }));
    await vi.waitFor(() =>
      expect(button("Create access link").disabled).toBe(false),
    );
    flushSync(() => button("Create access link").click());
    await vi.waitFor(() =>
      expect(changeKitShare).toHaveBeenCalledWith(
        { id },
        {
          permission: "view",
          audience: guild_id ? "members" : "anyone",
          lifetime_hours: 168,
        },
      ),
    );
    expect(kitStore.find(id)).toEqual(kit);
  },
);

it("updates permissions, regenerates explicitly and revokes a link without changing the Kit", async () => {
  const kit: Kit = {
    id,
    name: "Event",
    arguments: [],
    placeholders: [],
    message: { content: "Meetup" },
    revision: 1,
    can_manage_sharing: true,
  };
  kitStore.upsertSaved(kit, "owner");
  vi.mocked(listKitShares).mockResolvedValue([link]);
  open(kit);
  await vi.waitFor(() =>
    expect(host.querySelector('form[aria-label="Access link"]')).not.toBeNull(),
  );
  const row = host.querySelector<HTMLFormElement>(
    'form[aria-label="Access link"]',
  )!;
  choose("Permission", "edit", row);
  flushSync(() => button("Save", row).click());
  await vi.waitFor(() =>
    expect(changeKitShare).toHaveBeenCalledWith(
      { id },
      { permission: "edit", audience: "anyone" },
      shareId,
    ),
  );
  await vi.waitFor(() =>
    expect(button("Regenerate link", row).disabled).toBe(false),
  );
  flushSync(() => button("Regenerate link", row).click());
  expect(regenerateKitShare).not.toHaveBeenCalled();
  flushSync(() => button("Replace the old link", row).click());
  await vi.waitFor(() =>
    expect(regenerateKitShare).toHaveBeenCalledWith({ id }, shareId),
  );
  await vi.waitFor(() =>
    expect(row.querySelector<HTMLInputElement>("input")?.value).toContain(
      `#${"B".repeat(43)}`,
    ),
  );
  flushSync(() => button("Revoke access", row).click());
  await vi.waitFor(() =>
    expect(revokeKitShare).toHaveBeenCalledWith({ id }, shareId),
  );
  await vi.waitFor(() =>
    expect(host.querySelector('form[aria-label="Access link"]')).toBeNull(),
  );
  expect(kitStore.find(id)).toEqual(kit);
});

it("creates an anonymous hosted copy with separate recoverable management access", async () => {
  accountId = undefined;
  kitStore.setAccount(undefined);
  const original = kitStore.createDraft("Original", { content: "Local work" });
  const copy = { ...original, id, revision: 0, can_edit: true };
  vi.mocked(createTemporaryKit).mockResolvedValue({
    kit: copy,
    share: link,
    token: "A".repeat(43),
    management_token: "M".repeat(43),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  });
  vi.mocked(listKitShares).mockResolvedValue([link]);
  open(original);
  flushSync(() => button("Create temporary copy").click());
  await vi.waitFor(() =>
    expect(createTemporaryKit).toHaveBeenCalledWith(original, 24, "view"),
  );
  await vi.waitFor(() =>
    expect(
      host.querySelector('input[aria-label="Private management link"]'),
    ).not.toBeNull(),
  );
  expect(kitStore.find(original.id)).toEqual(original);
  expect(kitStore.find(copy.id)).toBeUndefined();
  const expiration = host.querySelector<HTMLSelectElement>(
    'form[aria-label="Create access link"] select[aria-label="Expires"]',
  )!;
  expect(expiration.value).toBe("");
  expect([...expiration.options].some((option) => option.value === "168")).toBe(
    false,
  );
  expect(JSON.stringify(kitStore.getSnapshot())).not.toContain("M".repeat(43));
  expect(
    host.querySelector<HTMLInputElement>(
      'input[aria-label="Private management link"]',
    )?.value,
  ).toContain(`#manage=${"M".repeat(43)}`);
  await vi.waitFor(() =>
    expect(listKitShares).toHaveBeenCalledWith({
      id,
      token: "M".repeat(43),
      expires: expect.any(String),
    }),
  );
});

it("can dismiss sharing after a busy action leaves browser focus on the body", async () => {
  const kit: Kit = {
    id,
    name: "Event",
    arguments: [],
    placeholders: [],
    message: { content: "Meetup" },
    revision: 1,
    can_manage_sharing: true,
  };
  kitStore.upsertSaved(kit, "owner");
  const close = open(kit);
  await vi.waitFor(() =>
    expect(button("Create access link").disabled).toBe(false),
  );
  flushSync(() => button("Create access link").click());
  await vi.waitFor(() => expect(changeKitShare).toHaveBeenCalled());
  await vi.waitFor(() => expect(button("Create access link").disabled).toBe(false));
  flushSync(() =>
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  expect(close).toHaveBeenCalledOnce();
});
