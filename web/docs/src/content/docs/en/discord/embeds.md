---
title: Embeds
description: Compose Legacy embeds with linked titles, fields, media and footer details, and fix their common validation errors.
sidebar:
  order: 4
---

An embed groups related information in one block. Use a description for the main explanation and fields for details a reader should scan, such as an event date and meeting point.

## Build an announcement

1. Create a **Legacy** message and add an embed at the insertion point.
2. Click the title and description to write them directly.
3. Select the embed and choose its accent color. Clear it for no explicit accent; black is a real color, not “unset”.
4. Add fields inside the embed. Fill both the field name and value.
5. Use each field's inline control to place short fields beside others. Keep long explanations as block fields.
6. Add media and optional author/footer details, then inspect validation.

![Legacy editor showing an announcement and its embed fields](/screenshots/pokkan-legacy-editor.webp)

## Links and media

A title URL makes the title a link. Author links and icons are separate properties. Edit these in Configure; do not put a URL into the title expecting it to become a destination automatically.

A **thumbnail** is the smaller image beside the body. The **image** is the larger media area. Click media or its unavailable-image control to edit the address. Use a publicly reachable image URL, not a local filename or webpage URL.

Remote hosts can deny access or delete assets later. Previewing an image does not upload it to Pokkan or guarantee Discord will fetch it.

## Fields and width

Inline is a request to arrange fields together, not a fixed pixel width. Thumbnails, long words, codeblocks and the available message column affect wrapping. Pokkan preserves one ordered field collection: switching inline/block does not move a field to a different list.

A field needs a name and value. Delete a field you do not need instead of leaving required text empty. Use the field's move/drag controls to reorder it.

## Limits and format

Embeds belong to Legacy, not Components V2. Discord applies individual text limits and a combined total across embeds. The editor reports the affected field and aggregate problems. Splitting a long description into more embeds does not bypass the total.

Author and footer text remain plain text. Supported formatting differs between title, description and field contexts; use the controls shown for the field.

Next: [Build your first embed](/en/guide/embed/) · [Validation](/en/using-pokkan/validation/)

Official reference: [Embed object and limits](https://docs.discord.com/developers/resources/message#embed-object).
