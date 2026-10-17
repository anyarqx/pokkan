import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { DiscordMessagePayload } from "../kits/domain";

type ChangeKind = "edit" | "structural";

export interface DocumentEditor {
  readonly document: DiscordMessagePayload;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  change(next: DiscordMessagePayload, kind?: ChangeKind): void;
  beginEdit(): void;
  endEdit(): void;
  undo(): ChangeKind | undefined;
  redo(): ChangeKind | undefined;
}

/** A compact global timeline for every mutation of one kit document. */
export function useDocumentEditor(
  kitId: string,
  initial: DiscordMessagePayload,
  persist: (document: DiscordMessagePayload, deferred?: boolean) => void,
): DocumentEditor {
  const [document, setDocument] = useState(initial);
  const [, setVersion] = useState(0);
  const current = useRef(initial);
  const past = useRef<{ document: DiscordMessagePayload; kind: ChangeKind }[]>(
    [],
  );
  const future = useRef<
    { document: DiscordMessagePayload; kind: ChangeKind }[]
  >([]);
  const editStart = useRef<DiscordMessagePayload | undefined>(undefined);
  const lastEditAt = useRef(0);
  const kit = useRef(kitId);

  useLayoutEffect(() => {
    if (
      kit.current === kitId &&
      (current.current === initial || same(current.current, initial))
    )
      return;
    kit.current = kitId;
    current.current = initial;
    past.current = [];
    future.current = [];
    editStart.current = undefined;
    setDocument(initial);
    setVersion((value) => value + 1);
  }, [initial, kitId]);

  const apply = useCallback(
    (next: DiscordMessagePayload, deferred = false) => {
      current.current = next;
      setDocument(next);
      persist(next, deferred);
    },
    [persist],
  );

  const push = useCallback(
    (snapshot: DiscordMessagePayload, kind: ChangeKind) => {
      past.current.push({ document: snapshot, kind });
      if (past.current.length > 100) past.current.shift();
      future.current = [];
      setVersion((value) => value + 1);
    },
    [],
  );

  const beginEdit = useCallback(() => {
    if (!editStart.current) editStart.current = current.current;
  }, []);

  const endEdit = useCallback(() => {
    if (!editStart.current) return;
    if (editStart.current !== current.current) push(editStart.current, "edit");
    editStart.current = undefined;
  }, [push]);

  const change = useCallback(
    (next: DiscordMessagePayload, kind: ChangeKind = "structural") => {
      if (next === current.current) return;
      if (kind === "structural") {
        endEdit();
        push(current.current, "structural");
      } else {
        if (editStart.current && Date.now() - lastEditAt.current > 1500)
          endEdit();
        editStart.current ??= current.current;
        future.current = [];
        lastEditAt.current = Date.now();
      }
      apply(next, kind === "edit");
    },
    [apply, push, endEdit],
  );

  const undo = useCallback(() => {
    endEdit();
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push({ document: current.current, kind: previous.kind });
    apply(previous.document);
    setVersion((value) => value + 1);
    return previous.kind;
  }, [apply, endEdit]);

  const redo = useCallback(() => {
    endEdit();
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ document: current.current, kind: next.kind });
    apply(next.document);
    setVersion((value) => value + 1);
    return next.kind;
  }, [apply, endEdit]);

  return {
    document,
    canUndo:
      past.current.length > 0 ||
      Boolean(editStart.current && editStart.current !== current.current),
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
