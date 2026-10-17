---
title: Message settings
description: Understand mentions, message flags, reply data and advanced payload settings.
---

Message settings apply to the payload as a whole. Open the blank canvas context menu and choose **Message settings**. Many messages do not need these advanced fields. If you are preparing a direct webhook delivery, check Send compatibility before relying on a field intended for other Discord senders.

| Setting                | Meaning and practical effect                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text to speech         | Requests TTS delivery. Whether a viewer hears it depends on Discord's permissions and client settings.                                                                                  |
| Suppress embeds        | Sets the message's embed-suppression flag. It does not delete stored embed data.                                                                                                        |
| Suppress notifications | Requests a message without a push/desktop notification, rather than making the message invisible.                                                                                       |
| Allowed mentions       | Controls which mentions may notify people. User/role lists name allowed IDs, while broader toggles permit categories. A visible mention is not by itself permission to notify everyone. |
| Nonce                  | An optional sender-side identifier, up to 25 characters in the editor. It is not a Kit ID or share credential.                                                                          |
| Enforce nonce          | Requests duplicate detection for supported message-creation paths. The direct webhook flow does not support every general message field.                                                |
| Stickers               | Legacy-only list of up to three sticker IDs. The IDs are not sticker uploads.                                                                                                           |
| Shared client theme    | Legacy-only structured JSON preserved for compatible payload use. Leave it absent unless the sender actually supports it.                                                               |

<img src="/screenshots/pokkan-message-settings.webp" alt="Message settings showing message flags and allowed-mention controls" width="1216" height="1648" loading="lazy" decoding="async" />

For allowed mentions, enable only the people or roles you intend to notify. The default avoids broadly enabling notification categories. A role/channel reference inserted from server search is fixed text syntax, not a change to this notification policy.

<img src="/screenshots/pokkan-message-settings-advanced.webp" alt="The lower settings section with nonce, stickers and structured theme data" width="1216" height="1648" loading="lazy" decoding="async" />

**Reply to** is a separate canvas-menu action. Its sheet contains the reference kind, message ID, optional channel/server IDs, the choice to fail if the original is missing, and whether to mention the replied-to user. Click an existing reply line to reopen it. [Attachments and reply references](/en/discord/attachments-replies/) explains transport limitations.

Changes to these fields participate in Undo/Redo. Invalid JSON in a structured field stays unapplied until it becomes valid. Use [validation](/en/using-pokkan/validation/) and the Send compatibility message to distinguish malformed data from a field the webhook transport does not support.
