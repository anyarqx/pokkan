---
title: When something does not work
description: Troubleshoot webhook URLs, invalid layouts, missing images and local drafts without sharing secrets.
sidebar:
  order: 4
---

## Send is disabled

Choose a Kit and enter a webhook URL. Open validation in the editor and fix errors. A Section needs text and an accessory; an Action Row needs a child. An interactive button is not supported by the current direct webhook flow—use a Link Button for a website link.

## Discord rejects the message

Check the error shown beside the send flow. Verify the webhook still exists and belongs to the intended channel. Check message limits and remove unsupported delivery fields. If Discord asks you to wait, stop retrying and try later.

## Nothing appeared, but the request may have succeeded

Check the destination channel before sending again. A second successful send posts another message; it does not replace the first.

## An image or emoji is missing

Check that the URL or custom emoji ID is valid and still available. Your browser can block remote assets, and deleted Discord emoji no longer resolve. Pokkan does not upload a local image just because you typed its filename.

## My Kit is missing

Check the browser, Discord account and selected personal/server context. Unsaved drafts are local. Signing into another account changes the saved Kits you see. A server Kit requires current membership and an installed Pokkan application. Import a downloaded Pokkan Payload if you have a backup.

## I can view but cannot edit

Other members' server Kits are read-only unless you have server administrative authority. Make your own copy if you need a variation. If your own Kit suddenly becomes unavailable, reopen your account page and check authorization and installation status. Do not repeatedly save after an access error.

## Save reports a conflict

Another tab or person saved a newer revision. Your draft is retained. Download its Pokkan Payload before choosing **Reload latest** if you need the pending changes. Reload is an explicit replacement, not an automatic merge.

## Channel suggestions are missing or outdated

Check that the Kit belongs to an authorized server. Personal Kits do not inherit a server's private channel list. Use the account page's metadata refresh when available. Respect its cooldown; incomplete permission information can deliberately hide potentially private channels.

## The preview shows a value, but Discord received a token

Placeholder examples and known guild names are presentation aids. Direct sending does not substitute them. Replace the stored token before delivery and inspect Discord Payload in JSON to confirm the actual text.

## Ask for help safely

Describe the action, expected result, language and screen size. Share a minimal message example or cropped screenshot. Remove webhook URLs, tokens and personal information first.

Next: [Webhook setup](/en/guide/create-webhook/) · [Import/export backups](/en/using-pokkan/import-export/)
