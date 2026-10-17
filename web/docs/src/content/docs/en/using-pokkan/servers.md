---
title: Account and server messages
description: Sign in, install Pokkan, choose a server, and understand access to its Kits and channel references.
sidebar:
  order: 2
---

Choose a server in the topbar to open its collection of reusable messages. When editing one of its Kits, you can search for channels and roles by name, using the server data available to your account.

## Sign in and install

1. Use the account control in the topbar to sign in with Discord. Consent includes your profile and server list.
2. Open your account page. Your personal account remains available alongside server entries.
3. For an eligible server, choose its installation action. Discord checks whether you can add applications there.
4. Complete authorization, return to Pokkan and refresh the installation status. Visiting the invitation alone does not confirm installation.
5. Choose an installed server in the compact topbar selector. Its **+** entry returns to account management.

An account that previously granted only profile access may need to authorize the server-list permission. This does not create a new Pokkan account or transfer its Kits.

![Account page with demonstration server installation and selection states](/screenshots/pokkan-account-contexts.webp)

## Create and open server Kits

Open **Messages** after selecting a server, create a message, and save it. Other authorized members can find it in that server's list.

A direct Kit URL loads the resource only after access is checked. The visible context can follow the authorized Kit. Changing contexts does not turn an open personal Kit into a server Kit or move a server Kit elsewhere.

Ordinary members may create Kits. Editing and deletion are reserved for their creator or a server administrator. [Read the full permission and draft behavior](/en/using-pokkan/kits/).

## Find channels and roles by name

In a text field that supports mentions, use the formatting toolbar's server-reference control to search for a channel or role. Selecting a result inserts a fixed Discord reference such as `<#123456789012345678>` for a channel or `<@&123456789012345678>` for a role.

The reference is part of your message. It is different from `{channel.name}`, which describes a value that depends on a future execution context.

Pokkan filters channels using your membership and permissions. A server selection does not grant access to every channel the bot can see. Missing or incomplete permission data can prevent suggestions from appearing.

## Refresh and access changes

The account page shows whether server data is current or needs updating. Pokkan normally refreshes it after about 15 minutes, but you can request an update if a channel was renamed or a role is missing. Manual updates have a 60-second cooldown, which can be longer if Discord asks Pokkan to wait.

These are Pokkan caching policies. Names and permission changes can lag during the snapshot freshness window. A saved snapshot alone does not authorize Kit operations.

If you leave the server, lose authorization, or Pokkan is removed, access can stop. Temporary Discord failures do not erase saved Kits. A confirmed access denial clears usable browser metadata.

Signing out ends the current Pokkan session without signing you out on other devices. To revoke Pokkan's access to your Discord account, remove its authorization in Discord's **Authorized Apps** settings.

Next: [Placeholders and known context](/en/using-pokkan/placeholders/) · [Troubleshooting](/en/using-pokkan/troubleshooting/)
