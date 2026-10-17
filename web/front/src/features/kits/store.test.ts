// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  window.sessionStorage.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: (() => {
      const values = new Map<string, string>();
      return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      };
    })(),
  });
  vi.resetModules();
});

describe("Kit drafts and account persistence", () => {
  it("recovers this tab's pending name after another tab edits the same Kit", async () => {
    const { kitStore: store } = await import("./store");
    const kit = store.createDraft("Original", { content: "Keep" });
    store.update(kit.id, { name: "This tab" });
    window.localStorage.setItem(
      "pokkan.kit-drafts.guest",
      JSON.stringify([{ ...kit, name: "Other tab" }]),
    );
    vi.resetModules();
    const { kitStore: reloaded } = await import("./store");
    expect(reloaded.find(kit.id)?.name).toBe("This tab");
  });

  it("does not erase another tab's unrelated new draft when persisting a local edit", async () => {
    const { kitStore: store } = await import("./store");
    const kit = store.createDraft("Original", { content: "Keep" });
    const elsewhere = {
      ...kit,
      id: "77777777-7777-4777-8777-777777777777",
      name: "Other tab",
    };
    window.localStorage.setItem(
      "pokkan.kit-drafts.guest",
      JSON.stringify([kit, elsewhere]),
    );
    store.update(kit.id, { name: "Local edit" });
    expect(
      JSON.parse(window.localStorage.getItem("pokkan.kit-drafts.guest")!),
    ).toEqual(
      expect.arrayContaining([elsewhere, { ...kit, name: "Local edit" }]),
    );
  });
  it("keeps a draft's base revision when a direct read finds newer saved content", async () => {
    const { kitStore: store } = await import("./store");
    store.setAccount("alice");
    const draft = store.createDraft("Shared", { content: "Original" }, "1001");
    store.markSaved({ ...draft, revision: 2 }, "alice", draft);
    store.update(draft.id, { name: "Pending rename" });
    store.upsertSaved(
      { ...draft, revision: 3, message: { content: "Someone else's edit" } },
      "alice",
    );
    expect(store.find(draft.id)).toMatchObject({
      name: "Pending rename",
      revision: 2,
      message: { content: "Original" },
    });
    store.discard(draft.id);
    expect(store.find(draft.id)).toMatchObject({
      revision: 3,
      message: { content: "Someone else's edit" },
    });
  });
  it("creates distinct IDs, duplicates, saves, discards and deletes", async () => {
    const { kitStore: store } = await import("./store");
    const { messageWithContent } = await import("./domain");
    store.setAccount("alice");
    const kit = store.createDraft(
      "Welcome",
      messageWithContent("legacy", "Welcome"),
    );
    const copy = store.duplicate(kit.id)!;
    expect(copy.id).not.toBe(kit.id);
    store.markSaved(kit, "alice", kit);
    store.update(kit.id, { name: "Changed" });
    expect(store.isDirty(kit.id)).toBe(true);
    store.discard(kit.id);
    expect(store.find(kit.id)?.name).toBe("Welcome");
    expect(store.isDirty(kit.id)).toBe(false);
    store.remove(kit.id);
    expect(store.find(kit.id)).toBeUndefined();
    expect(store.isSaved(kit.id)).toBe(false);
  });
  it("retains edits made while a save is in flight", async () => {
    const { kitStore: store } = await import("./store");
    const { messageWithContent } = await import("./domain");
    store.setAccount("alice");
    const kit = store.createDraft(
      "Welcome",
      messageWithContent("legacy", "Welcome"),
    );
    store.update(kit.id, { name: "New edit" });
    store.markSaved(kit, "alice", kit);
    expect(store.find(kit.id)?.name).toBe("New edit");
    expect(store.isDirty(kit.id)).toBe(true);
  });
  it("carries guest drafts into login and isolates account drafts and late responses", async () => {
    const { kitStore: store } = await import("./store");
    const { messageWithContent } = await import("./domain");
    const kit = store.createDraft(
      "Guest",
      messageWithContent("legacy", "Guest"),
    );
    store.setAccount("alice");
    expect(store.find(kit.id)).toEqual(kit);
    store.setAccount("bob");
    store.replaceSaved([kit], "alice");
    expect(store.find(kit.id)).toBeUndefined();
    store.setAccount(undefined);
    expect(store.find(kit.id)).toBeUndefined();
    store.setAccount("alice");
    expect(store.find(kit.id)).toEqual(kit);
  });
  it("reloads local drafts and imports a separate Kit identity", async () => {
    let { kitStore: store } = await import("./store");
    const { messageWithContent } = await import("./domain");
    const kit = store.createDraft(
      "Local",
      messageWithContent("legacy", "Local"),
    );
    const { toPokkanKit } = await import("./domain");
    vi.resetModules();
    ({ kitStore: store } = await import("./store"));
    expect(store.find(kit.id)).toEqual(kit);
    const imported = store.import("Imported", JSON.stringify(toPokkanKit(kit)));
    expect(imported.id).not.toBe(kit.id);
    expect(imported.message).toEqual(kit.message);
  });
  it("keeps personal and server Kits separate without changing a saved Kit's owner", async () => {
    const { kitStore: store } = await import("./store");
    const { messageWithContent, toPokkanKit } = await import("./domain");
    store.setAccount("alice");
    const personal = store.createDraft(
      "Personal",
      messageWithContent("legacy", "one"),
    );
    const server = store.createDraft(
      "Server",
      messageWithContent("legacy", "two"),
      "1001",
    );
    store.markSaved({ ...personal, revision: 0 }, "alice", personal);
    store.markSaved(
      { ...server, revision: 0, creator_id: "alice", can_edit: true },
      "alice",
      server,
    );
    store.replaceSaved([{ ...personal, revision: 0 }], "alice", "personal");
    expect(store.find(server.id)?.guild_id).toBe("1001");
    expect(store.find(personal.id)?.guild_id).toBeUndefined();
    expect(toPokkanKit(store.find(server.id)!)).not.toHaveProperty("guild_id");
    const copy = store.duplicate(server.id)!;
    expect(copy.guild_id).toBe("1001");
    expect(copy.revision).toBeUndefined();
    expect(copy.creator_id).toBeUndefined();
  });
  it("advances the revision of edits made while a save is in flight", async () => {
    const { kitStore: store } = await import("./store");
    const { messageWithContent } = await import("./domain");
    store.setAccount("alice");
    const kit = store.createDraft(
      "Shared",
      messageWithContent("legacy", "one"),
      "1001",
    );
    store.update(kit.id, { name: "Unsaved edit" });
    store.markSaved({ ...kit, revision: 1 }, "alice", kit);
    expect(store.find(kit.id)).toMatchObject({
      name: "Unsaved edit",
      revision: 1,
    });
    expect(store.isDirty(kit.id)).toBe(true);
  });
  it("does not replace a newer server Kit with an older list response", async () => {
    const { kitStore: store } = await import("./store");
    const { messageWithContent } = await import("./domain");
    store.setAccount("alice");
    const kit = store.createDraft(
      "Server",
      messageWithContent("legacy", "new"),
      "1001",
    );
    store.discard(kit.id);
    store.upsertSaved({ ...kit, revision: 5 }, "alice");
    store.replaceSaved([{ ...kit, name: "Old", revision: 4 }], "alice", "1001");
    expect(store.find(kit.id)).toMatchObject({ name: "Server", revision: 5 });
  });
  it("rejects a list response started before a Kit was saved", async () => {
    const { kitStore: store } = await import("./store");
    const { messageWithContent } = await import("./domain");
    store.setAccount("alice");
    const kit = store.createDraft(
      "New",
      messageWithContent("legacy", "new"),
      "1001",
    );
    const startedAt = store.savedVersion();
    store.markSaved({ ...kit, revision: 0 }, "alice", kit);
    expect(store.replaceSaved([], "alice", "1001", startedAt)).toBe(false);
    expect(store.find(kit.id)).toBeDefined();
  });
});
