---
title: Action Rows
description: Group related Discord buttons and understand the row's insertion space.
sidebar:
  order: 9
---

An Action Row groups controls together. For a webhook announcement, use it to hold Link Buttons such as “Read more” and “Register.”

A row can hold up to five buttons, or one select—not both kinds mixed together. Pokkan does not implement select interactions in its current sending workflow.

Add the row, then use the insertion space **inside** it to add a child. The plus is an editor control, not a button sent to Discord. It disappears when no compatible child fits. The row needs a valid child before it can be sent.

Drag buttons within a row when you want to change their order. Moving the last child out may remove the empty row. Use Undo if you moved the wrong item.

Next: [Buttons](/en/discord/buttons/) · [Editor controls](/en/guide/editor/).

Official reference: [Action Rows](https://docs.discord.com/developers/components/reference#action-row).
