---
title: Share a Kit
description: Share a saved message with view or edit access, or host a temporary copy without signing in.
sidebar:
  order: 3
---

Open **Share** in the editor or the message's **…** menu. The direct Kit URL keeps its existing permissions: a personal message still requires its owner, and a server message still requires membership. To give someone additional access, create an **access link** instead.

## Share a saved message

1. Save your Kit, then open **Share** and choose who can open the new link.
2. Leave **Can view** selected for a preview, or explicitly choose **Can edit** if recipients should change the saved message.
3. Choose an expiration and select **Create access link**, then copy the address from the new entry.

Server links initially require signed-in server members. Choose **Anyone with the link** to let people outside the server open that message without signing in. Public links do not include the server's private channel or role lists, and server links stop working if Pokkan is removed from the server.

Links open the saved version, so save pending changes before sending someone an address. Editing access does not grant deletion or sharing management. Those remain with the personal owner, or the server Kit's creator and authorized administrators.

## Change or withdraw access

Each link has its own permission and expiration settings. Change them and choose **Save** to apply them, or use **Revoke access** to stop that link immediately without affecting the Kit or its other links.

The secret part of a new link is available in the tab that created it. To recover an address in another tab or device, choose **Regenerate link** and confirm **Replace the old link**. Send the new address to recipients, because the previous one no longer works.

## Share without signing in

For a local draft, **Share** offers **Create temporary copy**. It uploads the current Kit as a separate message that lasts 24 hours by default, with options for one hour or seven days. Later changes to the original draft do not update this copy.

Keep the **Private management link** for yourself. It lets you edit the copy, change its access links or delete the copy, while recipients get only the view or edit permission you selected. Losing that management address can leave you unable to revoke the copy before it expires.

A temporary link cannot outlive its copy. Expired copies become unavailable immediately and are removed during maintenance. Creation is limited to ten copies per hour from the same network address, with the usual Kit size limits.

## Open and edit a received message

**Copy to my messages** creates an independent personal draft that you can keep after the link expires. Opening a link alone does not add it to your collection.

With editing permission, use the usual editor and **Save** to update the hosted message. Pending edits are recovered in the same tab and stay separate from your personal drafts. If someone saves a newer version first, your changes remain available: download them through **JSON → Pokkan Kit** before choosing **Reload latest** if you need to reapply them.

Revocation stops further reads and saves through that link, but cannot erase copies someone has already made. If a member-only link asks you to sign in again, use the same Discord account that belongs to the server.

Pending shared edits belong to the account that made them, or to the guest identity if you were not signed in. Another account using the same browser cannot recover those changes.

To report misuse, use **Contact / Report** below the shared message or the support icon in the site footer. The form requires an account to limit spam, with Discord support available if you cannot sign in. Reports are private and reviewed before a restriction is applied. If sharing is restricted, its manager can see the reason and request a review. Creating another link cannot bypass that restriction.

Related: [Kits and saving](/en/using-pokkan/kits/) · [Account and servers](/en/using-pokkan/servers/) · [Privacy and terms](https://pokkan.net/en/privacy)
