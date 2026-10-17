---
title: Polls
description: Write a Legacy poll, add emoji, set its duration and choose whether people can select multiple answers.
sidebar:
  order: 10
---

A poll offers choices people can vote on in Discord. It belongs to a **Legacy** message; Components V2 cannot contain a poll.

## Compose a poll

1. Open [the poll example](https://pokkan.net/en/kits?example=poll), or insert a poll into a Legacy Kit.
2. Click the question and replace it with a clear question.
3. Edit each answer. Use the insertion point immediately below the answers to add another.
4. Select an answer and open its emoji control for Unicode emoji or a custom Discord ID.
5. Click the **clock** to open the duration selector. Select the duration and dismiss the popover.
6. Select the poll to change multiple selection through its node control.

Discord accepts up to ten answers; Pokkan requires at least two. Removing answers stops at that minimum. The insertion control disappears at the maximum.

Question and answer text are plain text. Markdown markers do not create headings, links or bold text there.

## Preview and delivery

The editor does not simulate votes, live results or elapsed time. Duration describes the poll you will create when sending, not how long you have kept the Kit open.

Use a test channel and confirm the question, choices and selection mode after delivery. Saving changes to the Kit does not update a posted poll. Sending again creates a separate post.

A custom emoji preview uses Discord's public CDN without a guild API call. If an emoji is unavailable, the ID stays in your draft so you can correct or remove it.

Next: [Send your message](/en/guide/send/) · [Formatting differences](/en/discord/formatting/)

Official references: [Poll API](https://docs.discord.com/developers/resources/poll) · [Polls FAQ](https://support.discord.com/hc/en-us/articles/22163184112407-Polls-FAQ).
