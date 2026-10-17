---
title: Message components
description: Learn the difference between layout pieces, visible content and interactive controls.
sidebar:
  order: 5
---

A component is one building block of a Discord message. Some organize content, some display content, and some invite an action.

- **Layout:** Action Rows, Sections and Containers arrange other pieces.
- **Content:** Text Displays and media components show information.
- **Controls:** Buttons and selects offer choices or actions. A Link Button simply opens its URL.

Pokkan only offers component types that fit the insertion point. A Section's accessory is not another text child. A Button fits an Action Row or the Section accessory slot, not any arbitrary location.

Seeing a control in the editor is not the same as having a running application behind it. Ordinary interaction buttons and select behavior are not simulated. For webhook delivery, use supported layouts and Link Buttons.

Next: [Components V2](/en/discord/components-v2/) · [Buttons](/en/discord/buttons/).

Official reference: [Component reference](https://docs.discord.com/developers/components/reference).
