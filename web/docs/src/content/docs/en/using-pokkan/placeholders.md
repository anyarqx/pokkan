---
title: Placeholders and preview values
description: Distinguish stored Placeholder tokens, example values, verified guild context and actual webhook delivery.
sidebar:
  order: 3
---

A Placeholder marks a value that can vary. The built-in catalog offers `{guild.name}` and `{guild.id}` for the Kit's server, plus `{bot.name}` for Pokkan's name. You can add custom tokens and examples, such as `{event.name}`, to prepare other text. Placeholders remain ordinary message text and do not execute code.

## Insert and customize

1. Open **Placeholders** in the editor.
2. Inspect the built-in catalog or add a custom token and example value.
3. In a supported text field, type `{` and choose a suggestion.
4. Leave the field to see its preview representation. Return to editing or inspect JSON to see the stored token.

Custom examples help judge a sentence's length. They are not fetched from Discord and do not prove that a real value exists.

<img src="/screenshots/pokkan-placeholders.webp" alt="Placeholder catalog and preview controls in the editor" loading="lazy" width="2560" height="2000" />

## What context is known?

For a server-owned Kit available to your account, Editor and Send previews use the server's actual name and ID for `{guild.name}` and `{guild.id}`. A personal Kit does not inherit whichever server was selected elsewhere.

The catalog does not offer a user, avatar, channel or source message, because selecting a server does not identify who will use the Kit or where it will be posted. You can still add your own examples, but these do not retrieve information from Discord.

## Before sending

:::caution[Preview substitution is not delivery substitution]
Direct webhook sending uses the stored message. It does not silently replace Placeholder tokens with the preview examples or guild metadata.
:::

Replace tokens with the actual text you want to post before sending. Check **JSON → Discord Payload** if an example shown in preview makes the stored value unclear. Unresolved tokens can appear literally in Discord.

Next: [Send safely](/en/guide/send/) · [Server references](/en/using-pokkan/servers/)
