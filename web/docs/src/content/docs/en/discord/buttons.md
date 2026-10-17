---
title: Buttons
description: Choose a Link Button for websites and understand why other buttons need an application.
sidebar:
  order: 7
---

Add a **Link Button** when readers should open an event page, help article or signup website:

1. Add an Action Row, then a Button, or choose Button in a Section's accessory slot.
2. Select the Button and open **Style** in its node controls. Choose **Link**.
3. Click the Button text to write its label, then open **Configure** to enter a complete `https://` URL.
4. Optionally use the Button's emoji control.

![The six Button styles in the picker, beside an existing Section Button](/screenshots/pokkan-button-style.webp)

## Choose what the Button does

| Style                               | What to configure                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| Primary, Secondary, Success, Danger | A label and custom ID for an application action. The colors distinguish the action visually.      |
| Link                                | A label and website URL. This is the usual choice for a message sent by webhook.                  |
| Premium                             | A purchasable SKU. Discord supplies its purchase presentation instead of your own label or emoji. |

To try the link, open **Send** and click the Button in its preview. In the editor, clicking the label lets you change its text. Turn **Disabled** off before testing the link.

Pokkan's direct webhook flow does not run application actions. If Send reports an interactive Button, use Link for a website, or keep the interactive design as JSON for an application that handles it. Choosing a colored style in the editor does not configure an application action.

Changing style removes fields the new style cannot use. Switching to Link replaces the custom ID with a URL field, while Premium uses a SKU instead of a label and emoji. Undo restores the previous Button, including those fields.

## Keyboard and touch

Tap the style swatch to open the same picker on a phone. With a keyboard, focus the swatch and press Enter. Arrow keys move between styles, Enter selects, and Escape closes without changing the Button. After selecting or cancelling, focus returns to the swatch.

Next: [Action Rows](/en/discord/action-rows/) · [Send](/en/guide/send/).

Official reference: [Buttons](https://docs.discord.com/developers/components/reference#button).
