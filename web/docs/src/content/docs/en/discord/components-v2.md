---
title: Discord Components V2
description: Build a message layout with Text Displays, Containers, Sections and other supported components.
sidebar:
  order: 6
---

Components V2 is Discord's component-based message format. In Pokkan, you arrange the message's pieces in the preview instead of writing a layout by hand.

Use a **Text Display** for formatted text, a **Container** to group related pieces with an optional accent, and a **Section** to place text beside an accessory. Separators provide spacing. Media and file components have their own source requirements; Pokkan does not upload local attachments yet.

Discord permits 40 total V2 components, including nested components. Pokkan also reserves enough room to complete unfinished required structures. Near the limit, a missing insertion action can mean the remaining room is needed by an unfinished Section or Action Row.

V2 replaces Legacy message content and embeds; it also excludes polls and stickers. Keep those in a Legacy Kit.

Next: [Try the V2 editor](/en/guide/components-v2/) · [Sections](/en/discord/sections/).

Official reference: [V2 component rules](https://docs.discord.com/developers/components/reference).
