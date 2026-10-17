---
title: Create a Discord webhook
description: Get a channel webhook URL safely, then use it with Pokkan.
sidebar:
  order: 6
---

A webhook is a special Discord link that lets Pokkan post a message to a particular channel. You do not need to install a bot for this.

## In Discord

Use a server where you have **Manage Webhooks** permission. Start with a text channel used for testing. Discord's desktop app or browser interface is the easiest place to manage webhooks.

![Path through Discord settings: Server menu, Server Settings, Integrations, Webhooks, New Webhook, then Copy Webhook URL](/illustrations/discord-webhook-path.svg)

1. In Discord, open the server menu beside its name and choose **Server Settings**.
2. Open **Integrations**, then **Webhooks**.
3. Choose **New Webhook**, or open an existing webhook you are allowed to use.
4. Give it a recognizable name and select the destination channel.
5. Save any changes and choose **Copy Webhook URL**. The copied link starts with `https://discord.com/api/webhooks/`.

## In Pokkan

Open **Messages → Send**, choose your Kit and paste the link into **Webhook URL**. Check that the selected Kit and Discord channel are the ones you intend to use.

<picture>
  <source media="(max-width: 48rem)" srcset="/screenshots/pokkan-send-workshop-mobile.webp" width="780" height="2084" />
  <img src="/screenshots/pokkan-send-workshop.webp" alt="Pokkan Messages page with Send selected and an empty webhook URL field" width="2560" height="2322" loading="lazy" decoding="async" />
</picture>

:::caution[Keep the webhook link private]
Anyone with the link can use the webhook. Never put it in a message, Kit name, screenshot or support request. If you expose it, delete and recreate the webhook in Discord.
:::

If Webhooks is missing, check your permissions with an administrator. Copy the webhook URL, not the channel link or server invite. After pasting, check the channel in Discord before sending.

If your Discord menus differ, the [official illustrated webhook guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) shows where to look. The screens and labels can vary by language and client version.

Next: **[Send your message →](/en/guide/send/)**
