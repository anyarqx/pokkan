import { CircleUserRound, Server } from "lucide-react";
import type { GuildContext } from "./contexts";
import type { SessionAccount } from "./session";

export function DiscordIdentityImage({ account }: { readonly account: SessionAccount }) {
  return account.avatar ? (
    <img alt="" referrerPolicy="no-referrer" src={`https://cdn.discordapp.com/avatars/${account.id}/${encodeURIComponent(account.avatar)}.webp?size=64`} />
  ) : <CircleUserRound aria-hidden="true" size={20} />;
}

export function GuildImage({ guild }: { readonly guild: GuildContext }) {
  return guild.icon ? (
    <img alt="" referrerPolicy="no-referrer" src={`https://cdn.discordapp.com/icons/${guild.id}/${encodeURIComponent(guild.icon)}.webp?size=64`} />
  ) : <Server aria-hidden="true" size={20} />;
}
