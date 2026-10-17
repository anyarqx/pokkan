---
title: Try Components V2
description: Open a real sample, edit a container and add a Section with a Link Button accessory.
sidebar:
  order: 5
---

Components V2 lets you arrange text and other message parts as a layout. It is a different message format from Legacy, not an extra layer on an embed.

1. [Open the Components V2 example](https://pokkan.net/en/kits?example=components-v2). It becomes a new editable local Kit.
2. Edit the heading and opening hours.
3. Select the container to change or clear its accent color.
4. Use an insertion point to add a **Section**. Write its text, then choose **Button** or **Thumbnail** for the accessory slot.
5. For a website Button, choose **Link** in its node-control style picker, edit its label directly and enter the full URL in Configure.

<img src="/screenshots/pokkan-section-link.webp" alt="Section containing text and a Link Button in the editor" width="2560" height="2000" loading="lazy" decoding="async" />

Confirm that validation no longer reports an unfinished Section. Its accessory is separate from its text children.

V2 does not use Legacy embeds or polls. For those, create a Legacy Kit instead. Keep a copy before changing an existing message's format.

Next: **[Create a Discord webhook →](/en/guide/create-webhook/)**
