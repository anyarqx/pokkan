---
title: Editor controls
description: Find every shared and contextual editing control and the element it changes.
sidebar:
  order: 2
---

Selecting an element reveals controls for that element. Click its edge when clicking the content would start typing, or select the surrounding group to work with a Container, Section, row or gallery. Touch users can tap to select without relying on hover. Hovering an icon shows its name, and keyboard focus exposes its accessible label.

## Shared element actions

| Control                     | What changes                                                                                                      | Applies to                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drag handle                 | Moves the selected item to a compatible position. It does not convert its type.                                   | Components, [embeds](/en/discord/embeds/), [fields](/en/discord/embed-fields/), and supported lists. A Section accessory stays in its singular slot. |
| Configure                   | Opens remaining properties such as IDs, destination or descriptions. Text stays directly editable in the message. | The selected component or embed, with different fields for each type.                                                                                |
| Delete                      | Removes the selected item, including children if it is a group. Undo can restore it.                              | Removable elements. It does not mean deleting the entire Kit.                                                                                        |
| More actions                | Offers only the operations possible for that item and position.                                                   | Most elements, but not the Section accessory.                                                                                                        |
| Add element / internal plus | Inserts at that location or inside the selected parent.                                                           | Message root and parents that accept children, not leaf nodes.                                                                                       |

The component More actions menu offers **Configure**, **Add before**, **Add after**, **Duplicate**, **Copy**, **Cut**, **Paste**, **Move up**, **Move down** and **Delete** when allowed. Paste uses the internal component clipboard and must fit the destination. Cut removes the source only when it can also be copied. Incompatible destinations and full parents do not offer an insertion.

Legacy list menus are narrower: embeds, embed fields, poll answers and imported attachments offer duplication, movement and deletion as appropriate, with embed configuration available on the embed itself. These are not interchangeable with arbitrary V2 component paste.

<img src="/screenshots/pokkan-embed-field-actions.webp" alt="Selected embed field and its contextual action menu, with the rest of the editor still visible" width="2560" height="2254" loading="lazy" decoding="async" />

## Controls that depend on what is selected

| Element                                                 | Extra controls and their effect                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Legacy content](/en/discord/message-content/)          | Copy its text, or remove the content field. Reinsert it from the root plus.                                                                      |
| [Embed](/en/discord/embeds/)                            | Accent color, add missing thumbnail/image, Configure author/footer/link/date, delete and More actions. Click existing images to edit their URLs. |
| [Embed field](/en/discord/embed-fields/)                | Make inline/full width, delete and More actions, plus its drag handle.                                                                           |
| [Poll](/en/discord/polls/)                              | Clock opens duration. Multiple-answer toggle changes whether voters may choose several answers. Trash removes the poll.                          |
| [Poll answer](/en/discord/poll-answers/)                | Emoji, delete and movement/More actions within the answer limit.                                                                                 |
| [Container](/en/discord/containers/)                    | Accent color and spoiler for the whole group.                                                                                                    |
| [Button](/en/discord/buttons/)                          | Style picker, emoji and disabled toggle. Premium omits emoji and label. Configure changes URL, custom ID or SKU according to style.              |
| [Thumbnail](/en/discord/thumbnails/)                    | Spoiler and description in Configure. Its address is edited on the image.                                                                        |
| [Gallery item](/en/discord/gallery-items/)              | Individual spoiler and direct image-address editing. Select the gallery border for collection actions.                                           |
| [Media Gallery](/en/discord/media-galleries/)           | Configure adds, removes and orders items and edits descriptions.                                                                                 |
| [File](/en/discord/files/)                              | Spoiler and direct attachment-reference editing.                                                                                                 |
| [Separator](/en/discord/separators/)                    | Configure changes divider visibility and small/large spacing.                                                                                    |
| [Select menu](/en/discord/select-menus/)                | Direct prompt editing and Configure for custom ID, selection counts, disabled state and type-specific choices/defaults.                          |
| [Section accessory](/en/discord/sections/)              | Replace switches Button and Thumbnail. There is no independent drag/delete/More menu for the singular slot.                                      |
| [Imported attachment](/en/discord/attachments-replies/) | Move, duplicate and delete its metadata entry. This does not upload a file.                                                                      |

<img src="/screenshots/pokkan-button-style-picker.webp" alt="Button style controls and the six style choices" width="2560" height="1090" loading="lazy" decoding="async" />

**Color** accepts a picker or hex code and has a clear action. **Emoji** accepts manual Unicode/custom emoji plus a searchable picker and clear action. **Spoiler** changes which content is concealed in the delivered presentation. It does not remove it or grant privacy from someone who can open the Kit.

<img src="/screenshots/pokkan-color-control.webp" alt="Color picker and hexadecimal entry on the selected embed" width="2560" height="2254" loading="lazy" decoding="async" />

<img src="/screenshots/pokkan-emoji-picker.webp" alt="Emoji picker with a search for ticket emoji" width="2560" height="2000" loading="lazy" decoding="async" />

## While editing text

Editing a Markdown field opens the formatting toolbar on desktop at the bottom of the editor, above the editor actions. Select a passage and choose its format, or use Ctrl/⌘ B for bold, Ctrl/⌘ I for italic, Ctrl/⌘ Shift X for strikethrough and Ctrl/⌘ ` for inline code. Inline markers remain visible while editing and disappear in preview. On mobile the toolbar is hidden, and the document dock stays out of the way while typing. Button labels, poll text, author and footer remain plain text.

To link a passage, select its words and choose **Link**, then enter the destination address. With the caret inside an existing link, the same control lets you change its address or remove the link without deleting its text. Spoilers are revealed while their field is being edited, so their contents remain selectable.

<img src="/screenshots/pokkan-formatting-controls.webp" alt="Embed description retaining its formatting during editing, with formatting tools above the editor actions" width="600" height="498" loading="lazy" decoding="async" />

When authorized server references are available, type `#` to search channels or `@` to search roles and insert a fixed mention. Typing `{` offers Placeholder suggestions, while `:` opens the emoji picker. Neither action invents a runtime user or destination. See [Formatting](/en/discord/formatting/) and [Placeholders](/en/using-pokkan/placeholders/).

## Kit actions, dock and message settings

The title starts inline renaming, also available from the Kit's sidebar menu. Enter commits, Escape cancels, and leaving the name applies a valid edit. Names are limited to 160 characters. The sidebar's menu also duplicates, shares and deletes the Kit when your permission allows.

<img src="/screenshots/pokkan-kit-actions.webp" alt="Kit action menu open beside the current message" width="2560" height="2254" loading="lazy" decoding="async" />

The header offers **Share**, **Placeholders** and **JSON**. Save and Discard become available when there are pending changes. Discard restores saved work rather than one undo step, so use Undo for a local editing correction. JSON switches between the portable Pokkan Kit and Discord payload, supports copying/downloading and lets you apply a valid edited payload.

The bottom dock provides Undo, Redo, Send and Kit deletion as applicable. Kit deletion asks for confirmation on the control. A shared Kit instead offers copying into your messages, and view-only access omits mutation controls. [Sharing](/en/using-pokkan/sharing/) explains which permissions a link grants.

The issue counter opens the validation summary. Select an issue to reach the affected item, then repair it in the same editor. The canvas context menu also exposes [message settings and reply references](/en/using-pokkan/message-settings/). These settings affect the payload, not the Kit's ownership.

For keyboard operations and read-only limitations, continue with [Editing](/en/using-pokkan/editing/).
