---
title: Import and export
description: Choose Discord Payload or Pokkan Payload, copy or download JSON, and import a Kit.
sidebar:
  order: 2
---

The editor's **JSON** action is also its export tool. There is no separate Export menu.

## Choose the right format

- **Discord Payload:** message data for Discord. It does not include the Kit name, arguments or Placeholder catalog. Validation can block export until errors are fixed.
- **Pokkan Payload:** a portable Kit, including the message and supporting Kit data. Use this for a backup or to continue editing later.

After selecting the format, use the **Copy** or **Download** icon above the code. Hover over either icon to check its action. If the browser denies clipboard access, Download lets you keep the same data as a file.

<img src="/screenshots/pokkan-json-editor.webp" alt="JSON panel with actions above the code" width="2880" height="1900" loading="lazy" decoding="async" />

## Import a copy

Open [Messages](https://pokkan.net/en/kits), choose **Import**, enter a name, and paste your JSON. Import creates a new Kit rather than replacing another one. When working in an existing Kit, use **Apply** above the code to replace its message, then review the result before saving. The code scrolls independently so the actions remain available for long messages.

Unsupported component data can remain in a Pokkan Kit, but Discord Payload omits components Pokkan cannot serialize. Read validation warnings rather than assuming both exports contain identical data.

Never include a webhook URL in JSON. The delivery credential belongs only in Send.

Next: [Kits and drafts](/en/using-pokkan/kits/) · [Placeholders](/en/using-pokkan/placeholders/)
