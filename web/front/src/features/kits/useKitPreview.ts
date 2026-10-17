import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "../../shared/session";
import { useContexts } from "../../shared/contexts";
import { useServerMetadata } from "../../shared/serverMetadata";
import { placeholderCatalog } from "../editor/placeholders";
import type { Kit } from "./domain";

/** Presentation only: delivery always uses the original message payload. */
export function useKitPreview(kit?: Kit) {
  const { i18n } = useTranslation();
  const session = useSession();
  const contexts = useContexts(session.account?.id);
  const guild = contexts.guilds.find((item) => item.id === kit?.guild_id);
  const server = useServerMetadata(
    session.account?.id,
    guild?.status === "installed" ? (kit?.guild_id ?? undefined) : undefined,
  );
  const data =
    kit?.guild_id && !server.denied && server.data?.guild_id === kit.guild_id
      ? server.data
      : undefined;
  return useMemo(
    () => ({
      placeholders: placeholderCatalog(
        kit?.placeholders ?? [],
        data?.guild ??
          (!server.denied && !contexts.authorization_required
            ? guild
            : undefined),
      ),
      references: [
        ...(data?.emojis ?? []).map((emoji) => ({
          ...emoji,
          kind: "emoji" as const,
        })),
        ...(data?.channels ?? []).map((channel) => ({
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
    [
      kit?.placeholders,
      kit?.guild_id,
      data,
      server.denied,
      contexts.guilds,
      contexts.authorization_required,
      i18n.resolvedLanguage,
    ],
  );
}
