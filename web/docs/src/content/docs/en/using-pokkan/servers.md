---
title: Account and server messages
description: Choose an account or server for your Kits, and look up channels, roles and emoji when Pokkan is installed.
sidebar:
  order: 2
---

Choose a server in the topbar to open its collection of reusable messages. When editing one of its Kits, you can search for channels and roles by name, using the server data available to your account.

## Sign in and choose a server

1. Sign in with Discord from the account control in the topbar. Authorization covers your profile and the list of servers you belong to.
2. Use the selector beside your avatar to choose your personal account or a server.
3. Open **Messages** to view that collection and create a Kit in it.

The selector shows servers you own or where you have **Manage Server** or **Administrator**. These permissions are required for the private Kit collection, including opening a Kit by its direct URL. Installing Pokkan does not grant account permissions.

You can organize Kits before Pokkan is installed. Installation enables channel, role and emoji lookup, and is offered to members allowed to manage the server. Use the add icon on your account page, complete Discord authorization, and return to refresh the installation status. Visiting the invitation alone does not confirm it.

The selector's **+** entry opens account management, and your avatar opens the account page directly. Granting server-list access to an existing account keeps its Kits.

## Create and open server Kits

Open **Messages** after selecting a server, create a message, and save it. Other authorized members can find it in that server's list.

A direct Kit URL loads the resource only after access is checked. The visible context can follow the authorized Kit. Changing contexts does not turn an open personal Kit into a server Kit or move a server Kit elsewhere.

Eligible server managers can create, edit and delete Kits in that collection. A sharing link can separately allow viewing or editing without opening the private collection. [Read the full permission and draft behavior](/en/using-pokkan/kits/).

## Find channels and roles by name

With Pokkan installed, type `#` in a field that supports mentions to search channels, or `@` to search roles. Enter part of a name and choose a suggestion with the pointer, touch or Enter. Pokkan inserts fixed Discord syntax such as `<#123456789012345678>` or `<@&123456789012345678>`, without offering a user directory.

Search includes categories and the channel types present in authorized metadata, such as text, voice, announcement, stage and forum channels. `@` also offers `@everyone` and `@here`. Inserting these references does not enable notifications by itself, so check [allowed mentions](/en/using-pokkan/message-settings/) before sending.

The reference points to a specific channel or role. The Placeholders `{guild.name}` and `{guild.id}` can show known server details in preview, but webhook delivery still uses the stored text.

The emoji picker also offers available server emoji, filtered by your roles and Discord's availability information. Role-restricted emoji you cannot use are left out. Pokkan's configured collection appears in a separate picker section. An emoji appearing here does not guarantee it can be used in every destination, since Discord also applies channel and message permissions.

Pokkan filters channels using your membership and permissions. A server selection does not grant access to every channel the bot can see. Missing or incomplete permission data can prevent suggestions from appearing.

## Refresh and access changes

The account page shows whether server data is current or needs updating. Pokkan normally refreshes it after about 15 minutes, but you can request an update if a channel was renamed or a role is missing. Manual updates have a 60-second cooldown, which can be longer if Discord asks Pokkan to wait.

These are Pokkan caching policies. Names and permission changes can lag during the snapshot freshness window. A saved snapshot alone does not authorize Kit operations.

If you leave the server or lose authorization, access to its Kits can stop. Removing Pokkan prevents further channel, role and emoji lookups, but does not remove the Kit collection. Temporary Discord failures do not erase saved Kits. A confirmed access denial clears usable browser metadata.

Signing out ends the current Pokkan session without signing you out on other devices. To revoke Pokkan's access to your Discord account, remove its authorization in Discord's **Authorized Apps** settings.

Next: [Placeholders and known context](/en/using-pokkan/placeholders/) · [Troubleshooting](/en/using-pokkan/troubleshooting/)
