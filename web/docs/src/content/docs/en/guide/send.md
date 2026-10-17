---
title: Send your message
description: Select a Kit, check its preview, and send it to a Discord channel using a webhook.
sidebar:
  order: 7
---

You need an editable Kit and a [webhook URL](/en/guide/create-webhook/). Use a test channel for your first send.

## In Pokkan

1. In the editor, choose **Send**. You can also open **Messages → Send** and choose your Kit.
2. Review the message preview. Check text, links, images and mentions.
3. Paste the webhook URL. If Pokkan reports an error, fix it before continuing.
4. Choose **Send now** once.

<img src="/screenshots/pokkan-send-workshop.webp" alt="Messages page with Send selected, showing the message preview and webhook field" width="2560" height="2322" loading="lazy" decoding="async" />

## In Discord

Open the webhook's channel and confirm that the message arrived.

:::caution[Each send makes a new post]
Sending again creates another message. Changing or deleting the Kit does not update a post already sent to Discord.
:::

Pokkan stores a successfully used webhook in this browser for up to 30 days, separately for each account or guest. Clear the field to remove the saved URL. It is not included in saved or shared Kits, and you should avoid remembering it on a shared device.

Link Buttons open websites. Buttons that expect a response and file uploads do not work in this flow. Replace unresolved Placeholders with the text you want to send.

If delivery fails, [check the sending checklist](/en/using-pokkan/troubleshooting/). Avoid repeatedly clicking Send while a request is still pending.

Next: **[Save and reopen →](/en/guide/save/)**
