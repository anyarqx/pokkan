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

A marker on the affected component opens the relevant diagnostics, while a dotted underline identifies an invalid field. These indicators disappear as you correct the problem and are never included in the Discord message.

<img src="/screenshots/pokkan-section-validation.webp" alt="Validation marker and message next to an incomplete Section" width="2560" height="2000" loading="lazy" decoding="async" />

## Common repairs

| Problem                          | Repair                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| Section missing accessory        | Choose Button or Thumbnail in its accessory slot                       |
| Section missing text             | Add a Text Display inside the Section                                  |
| Empty Action Row                 | Add a compatible child or remove the row                               |
| Empty embed field                | Fill both its name and value, or delete the field                      |
| Link Button without destination  | Set its URL in Configure                                               |
| Message without sendable content | Add text, an embed, poll or supported component                        |
| Too much text                    | Shorten the named field, keeping the combined Embed text limit in mind |

V2 has a global limit of 40 emitted components, including nested children. Pokkan reserves room for the minimum missing children of unfinished structures. An unrelated plus may disappear while the slot that completes a Section remains available.

## Unknown imported components

Pokkan preserves unsupported component objects in **Pokkan Payload** but omits them from **Discord Payload**. A warning explains the omission. If that omission leaves a required parent empty or incomplete, it is also an error. A preserved object is not a promise that Pokkan can send it.

## Valid message, unsupported transport

A Discord-valid message can still be incompatible with direct webhook sending. File uploads requiring multipart data and custom interactive actions are examples. Send identifies these restrictions before delivery. An interactive action still needs an application that handles it, even when its component ID is valid.

For a website action, use a Link Button. Pokkan does not execute bot behavior, commands or scripts.

Next: [Import/export](/en/using-pokkan/import-export/) · [Troubleshooting](/en/using-pokkan/troubleshooting/)
