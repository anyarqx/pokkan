---
title: Find and fix message errors
description: Follow validation messages to the affected field and distinguish Discord structure from webhook compatibility.
sidebar:
  order: 5
---

You can keep an unfinished draft. Before exporting a Discord payload or sending, complete its required structure and fix errors.

## Follow a diagnostic

1. Open the validation summary in the editor dock when it reports issues.
2. Read whether each issue is an **error** or **warning**.
3. Select an issue to reveal the related field or component. Message-wide settings may open their sheet instead.
4. Edit the value. The summary and inline feedback update from the same validation result.

A small marker on an affected component opens its messages. Invalid fields have a restrained underline; this is editor feedback, not part of the Discord message.

![Validation marker and message next to an incomplete Section](/screenshots/pokkan-validation.webp)

## Common repairs

| Problem                          | Repair                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------- |
| Section missing accessory        | Choose Button or Thumbnail in its accessory slot                                |
| Section missing text             | Add a Text Display inside the Section                                           |
| Empty Action Row                 | Add a compatible child or remove the row                                        |
| Empty embed field                | Fill both its name and value, or delete the field                               |
| Link Button without destination  | Set its URL in Configure                                                        |
| Message without sendable content | Add text, an embed, poll or supported component                                 |
| Too much text                    | Shorten the named field; splitting embeds may still exceed their combined limit |

V2 has a global limit of 40 emitted components, including nested children. Pokkan reserves room for the minimum missing children of unfinished structures. An unrelated plus may disappear while the slot that completes a Section remains available.

## Unknown imported components

Pokkan preserves unsupported component objects in **Pokkan Payload** but omits them from **Discord Payload**. A warning explains the omission. If that omission leaves a required parent empty or incomplete, it is also an error. A preserved object is not a promise that Pokkan can send it.

## Valid message, unsupported transport

A Discord-valid message can still be incompatible with direct webhook sending. File uploads requiring multipart data and custom interactive actions are examples. Send explains this separately; changing an arbitrary component ID does not make an interaction work.

For a website action, use a Link Button. Pokkan does not execute bot behavior, commands or scripts.

Next: [Import/export](/en/using-pokkan/import-export/) · [Troubleshooting](/en/using-pokkan/troubleshooting/)
