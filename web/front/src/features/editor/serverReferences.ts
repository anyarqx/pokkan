import { createContext } from "react";

export interface ServerReference {
  readonly id: string;
  readonly name: string;
  readonly kind: "channel" | "role" | "emoji";
  readonly animated?: boolean;
}

export const ServerReferencesContext = createContext<
  readonly ServerReference[]
>([]);
