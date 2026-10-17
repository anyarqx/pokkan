import { createContext } from "react";
import type { Placeholder } from "./placeholders";
import type { ComponentPath } from "./schema";

export const PlaceholderContext = createContext<readonly Placeholder[]>([]);
export const PlaceholderPreviewContext = createContext(false);
export const ReadOnlyContext = createContext(false);

export interface InteractionState {
  readonly revealed: ReadonlySet<string>;
  toggleSpoiler(path: ComponentPath): void;
  toggleSpoilerKey(key: string): void;
}

export const InteractionContext = createContext<InteractionState | undefined>(
  undefined,
);
