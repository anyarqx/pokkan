---
title: Discord Components V2
description: Build a message layout with Text Displays, Containers, Sections and other supported components.
sidebar:
  order: 6
---

Components V2 is Discord's component-based message format. In Pokkan, you arrange the message's pieces in the preview instead of writing a layout by hand.

Use a **Text Display** for formatted text, a **Container** to group related pieces with an optional accent, and a **Section** to place text beside an accessory. Separators provide spacing. Media components use image URLs or attachment references, depending on their type. Pokkan does not yet upload local attachments.

Discord permits 40 total V2 components, including nested components. Pokkan also reserves enough room to complete unfinished required structures. Near the limit, a missing insertion action can mean the remaining room is needed by an unfinished Section or Action Row.

V2 uses Text Displays and other components in place of Legacy content and embeds. Polls and stickers also belong in Legacy messages. Keep those in a Legacy Kit.

Next: [Try the V2 editor](/en/guide/components-v2/) · [Sections](/en/discord/sections/).

Official reference: [V2 component rules](https://docs.discord.com/developers/components/reference).
