---
title: Kits, drafts and renaming
description: Create reusable messages, rename them, save personal or server Kits, and resolve conflicting edits safely.
sidebar:
  order: 1
---

An event announcement, a community introduction or a poll can become a **Kit**: a message you keep to edit and use again. Give it a recognizable name so you can find it on **Messages**, alongside the options to create, import and send. This name is for organizing your work and does not appear in the Discord post.

## Choose where it belongs

To keep a message for yourself, choose your account in the topbar selector. For a community message, choose your server before creating the Kit, so other members can find it in the same list. Changing this selection later does not transfer Kits you have already created.

Without signing in, you can create local personal drafts and send compatible messages through a webhook. Server Kits require an authorized Discord account.

## Rename without rebuilding

Your personal account can hold up to 15 saved Kits, and each server has its own collection of up to 15. When a collection is full, remove a Kit before saving another. Existing Kits remain editable, including collections already above the limit. Local drafts and JSON backups do not use these slots.

1. Open the Kit's **…** menu and choose **Rename Kit**, or press F2 on its sidebar entry. You can also click the editor title.
2. Write the new name and confirm with **Enter**, or cancel with **Escape**. Clicking elsewhere also accepts the name, provided it is not blank.
3. Choose **Save** to persist the renamed draft when signed in.

If you use the keyboard, focus the Kit in the list and press **F2** to rename it. Names can include spaces and contain up to 160 characters.

<img src="/screenshots/pokkan-rename-title.webp" alt="Message name being edited in the title" width="2560" height="2254" loading="lazy" decoding="async" />

## Come back to a message later

When you reopen a Kit in this browser, your draft includes the latest local changes. To continue on another device, sign in with Discord and choose **Save**. To prepare a variation without changing the original, choose **Duplicate** from the **…** menu.

If you decide to abandon your edits, **Discard** returns to the saved version. For a Kit that has never been saved, it removes the draft instead. Before discarding work you might need later, download a copy through **JSON → Pokkan Payload**. Do the same before clearing your browser's site data.

To remove a Kit from the list, choose **Delete**. Messages you have already sent to Discord remain in their channel.

## Server permissions and read-only messages

Server owners and members with Administrator or Manage Server permission can view, create, edit and delete server Kits. Ordinary membership does not open the private collection. A sharing link may grant separate view or edit access, including a members-only link, without granting server management permissions.

The direct Kit URL requires the server permissions described above. Its creator or an authorized administrator can also [create a sharing link](/en/using-pokkan/sharing/) with separate view or edit access. If the creator leaves the server, the Kit stays in the collection and administrators can maintain it.

## If someone saves first

Pokkan checks the saved revision. If another person or tab saved a newer version, your save is rejected rather than overwriting theirs. Your local draft, including a pending name, stays intact.

Choose **Keep a copy and load latest** to preserve your pending work as a separate local draft and open the saved version. Open that copy from Messages when you want to review or reapply its changes.

Next: [Account and servers](/en/using-pokkan/servers/) · [JSON backups](/en/using-pokkan/import-export/)
