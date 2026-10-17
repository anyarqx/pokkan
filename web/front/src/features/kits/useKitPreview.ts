import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "../../shared/session";
import { useServerMetadata } from "../../shared/serverMetadata";
import { placeholderCatalog } from "../editor/placeholders";
import type { Kit } from "./domain";

/** Presentation only: delivery always uses the original message payload. */
export function useKitPreview(kit?: Kit) {
  const { i18n } = useTranslation();
  const session = useSession();
  const server = useServerMetadata(
    session.account?.id,
    kit?.guild_id ?? undefined,
  );
  const data =
    kit?.guild_id && !server.denied && server.data?.guild_id === kit.guild_id
      ? server.data
      : undefined;
  return useMemo(
    () => ({
      placeholders: placeholderCatalog(kit?.placeholders ?? [], data?.guild),
      references: [
        ...(data?.channels ?? [])
          .filter((channel) => channel.type !== 4)
          .map((channel) => ({
            id: channel.id,
            name: channel.name,
            kind: "channel" as const,
          })),
        ...(data?.roles ?? [])
          .filter((role) => role.id !== data?.guild_id)
          .map((role) => ({
            id: role.id,
            name: role.name,
            kind: "role" as const,
          })),
      ],
    }),
    [kit?.placeholders, data, i18n.resolvedLanguage],
  );
}
