---
title: Understand the editor
description: Edit text, select components, add content, use node controls, and undo changes.
sidebar:
  order: 3
---

Click or tap the text you want to change and write directly in the message. Formatting remains visible as you type, including headings, lists and links. Press Escape to finish typing and return to the element's controls. Button labels and poll answers use plain text.

While editing a Markdown field, its inline markers stay visible in a muted color, so you can select or remove the `**` around bold text without losing the words. On desktop, the formatting toolbar stays at the bottom of the editor, above the document actions. On mobile, there is no formatting toolbar and the action dock hides while typing, leaving room for the message and keyboard. Enter adds a line in these fields. In plain-text labels, Enter finishes editing.

Component actions remain available at the side while editing their children, and follow scrolling within the component. The same controls work in Legacy and Components V2 messages.

<img src="/screenshots/pokkan-components-complete.webp" alt="Components V2 editor showing a container, text and a link button" width="2560" height="1752" loading="lazy" decoding="async" />

Use **+** where you want a new part to appear. A plus inside a group adds content to that group. Selecting an element reveals controls for properties such as color and emoji, while **Configure** holds the remaining details. Items that can change position also have a drag handle.

Try changes freely and return with **Undo** in the bottom dock. When you want a backup, download one through **JSON**. **Send** opens the delivery step with this Kit selected, where you can check the destination before posting.

On a phone, **Messages** opens the sidebar over the editor. Choose a Kit, press Escape or tap outside the list to return to editing. The close button is beside **Create message**.

<img src="/screenshots/pokkan-components-mobile.webp" alt="Compact editor with Messages navigation and the same V2 editing surface" loading="lazy" width="780" height="2056" />

The [control reference](/en/using-pokkan/controls/) identifies each contextual action and links to the element it changes.

## Put a website on a Button

1. Select the Button and open the small style swatch in its controls.
2. Choose **Link**. Click the Button text to write a label such as “View schedule”.
3. Open **Configure** and enter the complete website address.

<img src="/screenshots/pokkan-section-link-styles.webp" alt="Style choices in a Section Button&#x27;s controls" width="2560" height="2000" loading="lazy" decoding="async" />

With a keyboard, open the swatch with Enter and move between styles with the arrow keys. Enter confirms your choice, and Escape closes without changing the Button. Switching to Link replaces the application-action field with a website address. **Undo** restores the previous style and its fields if you need to go back.

## Keep only the Embed, or bring the text back

1. Click the text above the Embed and press Escape to leave typing mode.
2. Choose the trash icon in that text's controls. The Embed remains.
3. To write above it again, open **+** below the message and choose **Message content**.

To rewrite the text, delete the words and keep typing in the empty field. Use the trash icon when you no longer want that field in the message. **Undo** can restore it with its text.

## Emoji and validation

In a Button or poll answer's emoji control, open **Choose emoji** to search by name or browse categories. The same control also accepts typed emoji and custom Discord emoji IDs.

If a plus is missing, that position may have reached its Discord limit or need a different component type. Validation explains incomplete structures. An unfinished Section needs both text and an accessory.

Continue with [selecting, removing and moving parts](/en/using-pokkan/editing/) for more editing options, or follow [fixing errors](/en/using-pokkan/validation/) when validation points to something that needs attention before sending.

Next: **[Add an embed →](/en/guide/embed/)**
