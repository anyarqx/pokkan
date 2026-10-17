import {
  deserializeDiscordJson,
  deserializePokkanKit,
  ImportError,
  readKit,
  type ImportErrorCode,
  type Kit,
} from "./domain";

export class KitImportError extends Error {
  constructor(readonly code: "invalidJson" | ImportErrorCode) {
    super(code);
  }
}

let account: string | undefined;
let persistedDrafts: Kit[] = [];
let drafts: Kit[] = loadDrafts();
let saved: Kit[] = [];
let savedVersion = 0;
let kits = drafts;
const listeners = new Set<() => void>();
let persistenceTimer: ReturnType<typeof setTimeout> | undefined;

export const kitStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => kits,
  find: (id: string) => kits.find((kit) => kit.id === id),
  isDirty: (id: string) => drafts.some((kit) => kit.id === id),
  isSaved: (id: string) => saved.some((kit) => kit.id === id),
  savedVersion: () => savedVersion,
  flush: flushDrafts,
  setAccount(next: string | undefined) {
    if (account === next) return;
    flushDrafts();
    const guestDrafts = account === undefined ? drafts : [];
    if (guestDrafts.length) {
      drafts = [];
      publish();
    }
    account = next;
    drafts = [...guestDrafts, ...loadDrafts()];
    saved = [];
    publish();
  },
  replaceSaved(
    next: readonly Kit[],
    owner: string,
    contextId = "personal",
    startedAt?: number,
  ) {
    if (
      owner !== account ||
      (startedAt !== undefined && startedAt !== savedVersion)
    )
      return false;
    const others = saved.filter(
      (kit) => (kit.guild_id ?? "personal") !== contextId,
    );
    const currentById = new Map(saved.map((kit) => [kit.id, kit]));
    saved = [
      ...next.map((kit) => {
        const existing = currentById.get(kit.id);
        return existing && (existing.revision ?? -1) > (kit.revision ?? -1)
          ? existing
          : structuredClone(kit);
      }),
      ...others,
    ];
    publish();
    return true;
  },
  upsertSaved(kit: Kit, owner: string) {
    if (owner !== account) return;
    const existing = saved.find((item) => item.id === kit.id);
    const current =
      existing && (existing.revision ?? -1) > (kit.revision ?? -1)
        ? existing
        : kit;
    saved = [current, ...saved.filter((item) => item.id !== kit.id)];
    drafts = drafts.map((draft) =>
      draft.id === kit.id
        ? {
            ...draft,
            guild_id: current.guild_id,
            creator_id: current.creator_id,
            // A draft is based on the revision at which editing began. A fresh read
            // must not silently authorize overwriting another person's newer changes.
            revision: draft.revision ?? current.revision,
            can_edit: current.can_edit,
            can_manage_sharing: current.can_manage_sharing,
            sharing_restricted: current.sharing_restricted,
            sharing_restriction_reason: current.sharing_restriction_reason,
          }
        : draft,
    );
    publish();
  },
  clearSavedContext(owner: string, contextId: string) {
    if (owner !== account) return;
    saved = saved.filter((kit) => (kit.guild_id ?? "personal") !== contextId);
    savedVersion += 1;
    publish();
  },
  removeSaved(id: string) {
    saved = saved.filter((kit) => kit.id !== id);
    savedVersion += 1;
    publish();
  },
  markSaved(kit: Kit, owner: string, submitted: Kit) {
    if (owner !== account) return;
    const current = kitStore.find(kit.id);
    if (
      current &&
      current.name === submitted.name &&
      current.message === submitted.message &&
      current.arguments === submitted.arguments &&
      current.placeholders === submitted.placeholders
    )
      drafts = drafts.filter((item) => item.id !== kit.id);
    else
      drafts = drafts.map((draft) =>
        draft.id === kit.id ? { ...draft, revision: kit.revision } : draft,
      );
    saved = [kit, ...saved.filter((item) => item.id !== kit.id)];
    savedVersion += 1;
    publish();
  },
  discard(id: string) {
    drafts = drafts.filter((kit) => kit.id !== id);
    publish();
  },
  createDraft(name: string, message: Kit["message"], guildId?: string) {
    return add({
      id: crypto.randomUUID(),
      name: name.trim(),
      arguments: [],
      message,
      placeholders: [],
      ...(guildId ? { guild_id: guildId } : {}),
    });
  },
  import(name: string, raw: string, guildId?: string) {
    try {
      const value: unknown = JSON.parse(raw);
      const data =
        value && typeof value === "object" && "schema" in value
          ? deserializePokkanKit(value)
          : {
              arguments: [],
              message: deserializeDiscordJson(value),
              placeholders: [],
            };
      return add({
        id: crypto.randomUUID(),
        name: name.trim(),
        arguments: data.arguments,
        message: data.message,
        placeholders: data.placeholders,
        ...(guildId ? { guild_id: guildId } : {}),
      });
    } catch (error) {
      if (error instanceof SyntaxError) throw new KitImportError("invalidJson");
      if (error instanceof ImportError) throw new KitImportError(error.code);
      throw error;
    }
  },
  duplicate(id: string) {
    const original = kitStore.find(id);
    return original
      ? add({
          ...structuredClone(original),
          id: crypto.randomUUID(),
          name: `${original.name} copy`,
          revision: undefined,
          creator_id: undefined,
          can_edit: true,
          can_manage_sharing: undefined,
          sharing_restricted: undefined,
          sharing_restriction_reason: undefined,
        })
      : undefined;
  },
  update(id: string, update: Partial<Omit<Kit, "id">>, deferred = false) {
    const kit = kitStore.find(id);
    if (kit) add({ ...kit, ...update }, deferred);
  },
  remove(id: string) {
    drafts = drafts.filter((kit) => kit.id !== id);
    saved = saved.filter((kit) => kit.id !== id);
    savedVersion += 1;
    publish();
  },
};

function add(kit: Kit, deferred = false) {
  drafts = [kit, ...drafts.filter((item) => item.id !== kit.id)];
  publish(deferred);
  return kit;
}

function storageKey() {
  return `pokkan.kit-drafts.${account ?? "guest"}`;
}

function loadDrafts(): Kit[] {
  const shared = readDrafts("localStorage");
  const recovery = readDrafts("sessionStorage");
  persistedDrafts = [
    ...recovery,
    ...shared.filter((kit) => !recovery.some((draft) => draft.id === kit.id)),
  ];
  return persistedDrafts;
}

function readDrafts(storage: "localStorage" | "sessionStorage"): Kit[] {
  try {
    const value: unknown = JSON.parse(
      window[storage].getItem(storageKey()) ?? "[]",
    );
    return Array.isArray(value) ? value.map(readKit) : [];
  } catch {
    return [];
  }
}

function publish(deferred = false) {
  kits = [
    ...drafts,
    ...saved.filter((kit) => !drafts.some((draft) => draft.id === kit.id)),
  ];
  if (deferred) {
    // A bounded write interval also protects a long uninterrupted typing session.
    persistenceTimer ??= setTimeout(flushDrafts, 400);
  } else flushDrafts();
  listeners.forEach((listener) => listener());
}

function flushDrafts() {
  clearTimeout(persistenceTimer);
  persistenceTimer = undefined;
  if (
    drafts.length === persistedDrafts.length &&
    drafts.every((draft, index) => draft === persistedDrafts[index])
  )
    return;
  // Merge only this tab's changes. A stale list must not erase another tab's
  // unrelated drafts; session storage also recovers this tab's conflicting edit.
  const shared = new Map(
    readDrafts("localStorage").map((kit) => [kit.id, kit]),
  );
  for (const previous of persistedDrafts) {
    if (
      !drafts.some((kit) => kit.id === previous.id) &&
      JSON.stringify(shared.get(previous.id)) === JSON.stringify(previous)
    )
      shared.delete(previous.id);
  }
  for (const draft of drafts) {
    const previous = persistedDrafts.find((kit) => kit.id === draft.id);
    if (previous !== draft) shared.set(draft.id, draft);
  }
  let stored = false;
  try {
    window.localStorage.setItem(
      storageKey(),
      JSON.stringify([...shared.values()]),
    );
    stored = true;
  } catch {
    /* In-memory editing remains available. */
  }
  try {
    window.sessionStorage.setItem(storageKey(), JSON.stringify(drafts));
  } catch {
    /* Tab recovery is best effort when browser storage is unavailable. */
  }
  if (stored) persistedDrafts = drafts;
}

window.addEventListener("pagehide", flushDrafts);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushDrafts();
});
