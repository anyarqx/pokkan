---
title: Select, move and edit message parts
description: Use direct editing, node controls, insertion points, keyboard shortcuts and mobile sheets without losing your draft.
sidebar:
  order: 4
---

Click text to write directly in the message, or select a component's surface to change its properties and position. Leaving text editing with Escape lets you work with the whole element without changing its words.

## Write and format

Select words to open the formatting toolbar, whose options depend on the field. Message text supports headings and lists, while Button labels and poll answers remain plain text.

Use the text-style control in full-message text for headings 1–3 or subtext. Code fences preserve source text and can specify a supported language. [Formatting reference](/en/discord/formatting/) explains the syntax.

## Remove and restore Legacy content

To keep only an Embed, remove the ordinary text above it:

1. Click the text, then press Escape to leave typing mode and show its controls.
2. Choose the trash icon, **Remove message content**. The Embed stays in place.
3. To write text above the Embed again, open **+** below the message and choose **Message content**.

Clearing the text leaves an empty field for rewriting. Removing the field takes it out of the message, and **Undo** restores it with its text. Discord allows only one ordinary Content field, positioned above the Embeds.

## Insert into the right parent

Use the **+ inside a group** to add content to that group. For example, an Action Row holds Buttons, while a Section has places for text and a separate Button or Thumbnail. A Container can group these parts together. Individual elements such as Buttons do not accept children.

To replace a Section's Thumbnail with a Button, select the accessory and choose the new type. Configure its website or action afterward, since the image address is not reused as a Button destination.

## Node controls and sheets

Select a component surface to reveal its compact controls. Immediate properties such as color, emoji or spoiler state stay beside their content. Configure contains the remaining properties.

For a website Button, select the Button, open its **Style** swatch and choose **Link**. Click the label to write it, then use **Configure** to enter the URL. The swatch shows the current style, so you can change it again without reopening Configure.

![Style choices in a Section Button's controls](/screenshots/pokkan-button-style.webp)

Click an image to edit its address, including when it has not loaded. In a gallery, select the image whose address or spoiler state you want to change. Select the gallery's outer edge for actions on the whole gallery.

To change a poll's duration, select the poll and click its clock, then enter the number of hours in the field that opens. Enter confirms and returns focus to the clock, Escape closes it, and Tab continues to the next control. The adjacent multiple-answer control changes whether a voter may choose more than one answer.

![Welcome message with a Section and links open for editing](/screenshots/pokkan-editor-overview.webp)

## Move, copy and undo

Drag an item's handle to a compatible destination to move it. Places that cannot accept that item, or have no remaining room, reject the drop. If moving the last text out of a Section leaves it incomplete, its accessory remains so you can add replacement text. An Action Row disappears when its last item is removed.

The selected component's menu offers the operations available at that location. Copying a group includes its contents, so pasting or duplicating it needs room for the whole group, including anything still required to complete it. A Section's single accessory is replaced in its slot rather than reordered like a list item.

While typing, Copy and Cut apply to the selected text. To work with a whole component, leave typing mode first and select its surface. **Undo** and **Redo** in the bottom dock restore message changes, including deleted content and Button style changes.

## On a phone or keyboard

On a phone, **Messages** opens the sidebar over the editor. Tap outside it, use its close button beside **Create message**, or press Escape to return to editing. If a **…** menu is open, the first Escape closes that menu and a second closes the sidebar.

Use Tab to reach controls and Enter or Space to activate them. When a Kit link has focus, F2 edits its name, Enter accepts the change and Escape cancels. In read-only Kits, you can inspect the message and use the available copy actions without changing the original.

Next: [Kits and saving](/en/using-pokkan/kits/) · [Validation](/en/using-pokkan/validation/)
