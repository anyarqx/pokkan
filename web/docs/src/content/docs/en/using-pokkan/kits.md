---
title: Kits, drafts and renaming
description: Create reusable messages, rename them, save personal or server Kits, and resolve conflicting edits safely.
sidebar:
  order: 1
---

An event announcement, a community introduction or a poll can become a **Kit**: a message you keep to edit and use again. Give it a recognizable name so you can find it on **Messages**, alongside the options to create, import and send. This name is for organizing your work and does not appear in the Discord post.

## Choose where it belongs

To keep a message for yourself, choose your account in the topbar selector. For a community message, choose a server with Pokkan installed before creating the Kit, so other members can find it in the same list. Changing this selection later does not transfer Kits you have already created.

Without signing in, you can create local personal drafts and send compatible messages through a webhook. Server Kits require an authorized Discord account.

## Rename without rebuilding

1. Open the Kit's **…** menu and choose **Rename Kit**. You can also click its name again in the sidebar when already selected, or click the editor title.
2. Write the new name and confirm with **Enter**, or cancel with **Escape**. Clicking elsewhere also accepts the name, provided it is not blank.
3. Choose **Save** to persist the renamed draft when signed in.

If you use the keyboard, focus the Kit in the list and press **F2** to rename it. Names can include spaces and contain up to 160 characters.

![Message name being edited in the title](/screenshots/pokkan-title-rename.webp)

## Come back to a message later

When you reopen a Kit in this browser, your draft includes the latest local changes. To continue on another device, sign in with Discord and choose **Save**. To prepare a variation without changing the original, choose **Duplicate** from the **…** menu.

If you decide to abandon your edits, **Discard** returns to the saved version. For a Kit that has never been saved, it removes the draft instead. Before discarding work you might need later, download a copy through **JSON → Pokkan Payload**. Do the same before clearing your browser's site data.

To remove a Kit from the list, choose **Delete**. Messages you have already sent to Discord remain in their channel.

## Server permissions and read-only messages

Verified server members can view and create server Kits. The creator, server owner, and members with Administrator or Manage Server permission can edit or delete them. Other members see a read-only preview and can make their own copy.

The direct Kit URL requires the server permissions described above. Its creator or an authorized administrator can also [create a sharing link](/en/using-pokkan/sharing/) with separate view or edit access. If the creator leaves the server, the Kit stays in the collection and administrators can maintain it.

## If someone saves first

Pokkan checks the saved revision. If another person or tab saved a newer version, your save is rejected rather than overwriting theirs. Your local draft, including a pending name, stays intact.

Before choosing **Reload latest**, download your draft as a Pokkan Payload if you need to compare or reapply changes. Reloading replaces the pending work without combining the two versions.

Next: [Account and servers](/en/using-pokkan/servers/) · [JSON backups](/en/using-pokkan/import-export/)
