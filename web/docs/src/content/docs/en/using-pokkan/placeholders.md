---
title: Placeholders and preview values
description: Distinguish stored Placeholder tokens, example values, verified guild context and actual webhook delivery.
sidebar:
  order: 3
---

A Placeholder marks a value that may vary, such as `{user.name}`, `{user.mention}`, `{guild.name}` or `{channel.name}`. It is ordinary message text, not executable code.

## Insert and customize

1. Open **Placeholders** in the editor.
2. Inspect the built-in catalog or add a custom token and example value.
3. In a supported text field, type `{` and choose a suggestion.
4. Leave the field to see its preview representation. Return to editing or inspect JSON to see the stored token.

Custom examples help judge a sentence's length. They are not fetched from Discord and do not prove that a real value exists.

## What context is known?

For a server-owned Kit with authorized metadata, Editor and Send previews use the server's actual name and ID for `{guild.name}` and `{guild.id}`. A personal Kit does not inherit whichever server was selected elsewhere.

Selecting a server does **not** identify a triggering member, channel or message. Unknown runtime values remain unresolved unless you supplied an illustrative example. Channel and role suggestions insert fixed references; they do not establish a runtime context.

## Before sending

:::caution[Preview substitution is not delivery substitution]
Direct webhook sending uses the stored message. It does not silently replace Placeholder tokens with the preview examples or guild metadata.
:::

Replace tokens with the actual text you want to post before sending. Check **JSON → Discord Payload** if an example shown in preview makes the stored value unclear. Unresolved tokens can appear literally in Discord.

Older double-brace Pokkan tokens are normalized to single braces when loaded. Use the single-brace form in new messages. Placeholders are separate from any future scripting language.

Next: [Send safely](/en/guide/send/) · [Server references](/en/using-pokkan/servers/)
