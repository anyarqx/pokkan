import { useSyncExternalStore } from "react";
import { kitStore } from "../features/kits/store";

export function useKits() {
  return useSyncExternalStore(
    kitStore.subscribe,
    kitStore.getSnapshot,
    kitStore.getSnapshot,
  );
}
