---
title: Webhooks
description: What a Discord webhook does and why its URL must stay private.
sidebar:
  order: 2
---

A webhook is a channel-specific posting link. Pokkan uses that link to send the message you built. For this workflow, you do not need to create a Discord application or install a bot.

The webhook has a name and avatar managed in Discord. Its destination channel is chosen there too. Keep the entire URL private: possession of the link grants the ability to use it.

A bot is different. It can respond to interactions when its application implements that behavior. A website Button can open its link directly, while a custom action needs the application to handle the click. Pokkan's current Send flow does not supply that handler.

Start with [Create a webhook](/en/guide/create-webhook/), then [Send your message](/en/guide/send/).

Official references: [Webhook introduction](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) · [Webhook API](https://docs.discord.com/developers/resources/webhook).
