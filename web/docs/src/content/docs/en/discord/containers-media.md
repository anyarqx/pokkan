---
title: Containers and media
description: Group Components V2 content, add gallery media and edit images directly without confusing URLs with uploads.
sidebar:
  order: 10
---

A **Container** groups related V2 content, such as a welcome introduction, useful links and an image. It is not a separate message.

## Group a message

1. Add a Container at a V2 root insertion point.
2. Use its internal plus to add supported children, such as Text Displays, Sections, an Action Row or a gallery.
3. Select the Container for its accent and spoiler controls.
4. Select a child when you want to change that child's properties instead.

The accent is optional. Clearing it differs from choosing black. Spoiler settings belong to the selected structure; inspect which item is selected before changing them.

## Add gallery media

Insert a Media Gallery and click a media item or its unavailable-media affordance to enter its URL. Each item has its own media properties. Select the gallery surface for collection-level actions, and an item for item-level editing.

Use reachable media URLs. A local path, pasted filename or website page is not an upload. Pokkan does not provide attachment upload UX in this stage.

A gallery displays multiple media items as one collection. Reordering changes their order in the payload. Undo restores changes, including spoiler changes.

## Choose Thumbnail, Gallery or File

- **Thumbnail:** the small accessory beside Section text.
- **Media Gallery:** a collection of images or other supported media.
- **File:** an attachment reference with Discord's file requirements; the current browser Send flow cannot upload multipart attachments.

Do not use a File component as a generic link to a webpage. Use a Link Button or supported Markdown link instead.

If a remote image fails, check its URL and host. Pokkan preserves the entered value and shows an unavailable state; it does not silently replace the media.

Next: [Sections](/en/discord/sections/) · [Buttons](/en/discord/buttons/) · [Troubleshooting](/en/using-pokkan/troubleshooting/)

Official reference: [Discord components](https://docs.discord.com/developers/components/reference).
