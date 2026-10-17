import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import type { PartialEmoji } from "../features/editor/Emoji";

let cached: readonly PartialEmoji[] = [];
let expires = 0;
let request: Promise<readonly PartialEmoji[]> | undefined;

export function useBuiltInEmojis(enabled: boolean) {
  const [items, setItems] = useState(cached);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    if (Date.now() < expires) {
      setItems(cached);
      return;
    }
    request ??= apiFetch("/api/v1/emojis")
      .then((response) => response.json())
      .then((body: { emojis?: PartialEmoji[] }) => {
        cached = Array.isArray(body.emojis) ? body.emojis : [];
        expires = Date.now() + 15 * 60_000;
        return cached;
      })
      .catch(() => {
        expires = Date.now() + 60_000;
        return cached;
      })
      .finally(() => {
        request = undefined;
      });
    void request.then((value) => {
      if (active) setItems(value);
    });
    return () => {
      active = false;
    };
  }, [enabled]);
  return items;
}
