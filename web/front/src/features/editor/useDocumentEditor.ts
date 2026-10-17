import { useCallback, useEffect, useRef, useState } from "react";
import type { DiscordMessagePayload } from "../kits/domain";

type ChangeKind = "edit" | "structural";

export interface DocumentEditor {
  readonly document: DiscordMessagePayload;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  change(next: DiscordMessagePayload, kind?: ChangeKind): void;
  beginEdit(): void;
  endEdit(): void;
  undo(): void;
  redo(): void;
}

/** A compact global timeline for every mutation of one kit document. */
export function useDocumentEditor(
  kitId: string,
  initial: DiscordMessagePayload,
  persist: (document: DiscordMessagePayload) => void,
): DocumentEditor {
  const [document, setDocument] = useState(initial);
  const [, setVersion] = useState(0);
  const current = useRef(initial);
  const past = useRef<DiscordMessagePayload[]>([]);
  const future = useRef<DiscordMessagePayload[]>([]);
  const editStart = useRef<DiscordMessagePayload | undefined>(undefined);
  const kit = useRef(kitId);

  useEffect(() => {
    if (kit.current === kitId && same(current.current, initial)) return;
    kit.current = kitId;
    current.current = initial;
    past.current = [];
    future.current = [];
    editStart.current = undefined;
    setDocument(initial);
    setVersion((value) => value + 1);
  }, [initial, kitId]);

  const apply = useCallback(
    (next: DiscordMessagePayload) => {
      current.current = next;
      setDocument(next);
      persist(next);
    },
    [persist],
  );

  const push = useCallback((snapshot: DiscordMessagePayload) => {
    past.current.push(structuredClone(snapshot));
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    setVersion((value) => value + 1);
  }, []);

  const beginEdit = useCallback(() => {
    if (!editStart.current)
      editStart.current = structuredClone(current.current);
  }, []);

  const endEdit = useCallback(() => {
    if (!editStart.current) return;
    if (!same(editStart.current, current.current)) push(editStart.current);
    editStart.current = undefined;
  }, [push]);

  const change = useCallback(
    (next: DiscordMessagePayload, kind: ChangeKind = "structural") => {
      if (same(next, current.current)) return;
      if (kind === "structural") push(current.current);
      apply(next);
    },
    [apply, push],
  );

  const undo = useCallback(() => {
    endEdit();
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(structuredClone(current.current));
    apply(previous);
    setVersion((value) => value + 1);
  }, [apply, endEdit]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(structuredClone(current.current));
    apply(next);
    setVersion((value) => value + 1);
  }, [apply]);

  return {
    document,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    change,
    beginEdit,
    endEdit,
    undo,
    redo,
  };
}

function same(a: DiscordMessagePayload, b: DiscordMessagePayload) {
  return JSON.stringify(a) === JSON.stringify(b);
}
