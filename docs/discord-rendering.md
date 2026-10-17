# Discord rendering boundary

The editor uses these text contexts. An absent formatting context means plain text.

| Context                                   | Inline emphasis/code/spoilers | Masked links and mentions  | Custom emoji syntax    | Quotes/code blocks | Headings/subtext/lists |
| ----------------------------------------- | ----------------------------- | -------------------------- | ---------------------- | ------------------ | ---------------------- |
| Legacy content / Text Display (`message`) | Yes                           | Yes                        | Yes                    | Yes                | Yes                    |
| Embed description / field value (`embed`) | Yes                           | Yes                        | Yes                    | Yes                | No                     |
| Embed title / field name (`inline`)       | Yes                           | No                         | Yes                    | No                 | No                     |
| Embed author / footer                     | No                            | Structured author URL only | No                     | No                 | No                     |
| Button label                              | No                            | No                         | Separate partial emoji | No                 | No                     |
| Poll question / answer                    | No                            | No                         | Separate answer emoji  | No                 | No                     |

Formatting controls follow the same contexts as the renderer. Embed title and
author URLs are structured links, separate from Markdown. Editable text never
navigates. Unknown user/channel/role names use controlled preview labels.

Legacy preview uses the fixed sequence content, poll, attachments, embeds,
then Action Rows. Only items within those arrays can be reordered. Embed fields
remain one array; inline runs determine columns without dividing the data.

Legacy content is an optional authoring item, not a component. Removing it unsets
`content`; root insertion offers it only when absent. Undo restores its exact
text. Empty content is retained while authoring but not invented for embed-only
messages. Editor and Send use the same Kit-scoped preview context; presentation
substitution never changes the webhook payload.

On screens up to 420px, Section Button accessories stack below their text to
avoid a demonstrated two-character-wide text column. This is a Pokkan compact
preview fallback, not a claim about Discord's precise responsive breakpoint.

Color controls edit optional `color` / `accent_color` values and can remove them.
The native color input and hex entry have no predefined palette. Emoji controls
combine manual Unicode/custom-ID entry with a lazily loaded, localized Emojibase
picker. Unicode is stored as text and rendered through Discord Twemoji.
Buttons preserve `name`, `id` and `animated`; Poll export emits only `id` or `name`.
Embed and Container colors and Button style and emoji are edited directly on their nodes;
Poll emoji belongs to each answer. Configure keeps the remaining properties.
Custom IDs preview directly from Discord's CDN. Animated and ID-only previews
request WebP with `animated=true`; unavailable images leave the entered ID intact.
Game-profile and guild-navigation mentions display neutral tokens without links.

Unknown components remain in Kit data and Pokkan Kit JSON, including when they
arrive through Discord JSON import. Discord JSON export omits them; validation
uses that sendable tree, so an omitted child cannot make a parent appear valid.
Section keeps its Text Displays and singular Button-or-Thumbnail accessory as
separate editor slots. A new Section intentionally asks for its accessory rather
than silently adding a Thumbnail.
The JSON sheet handles copy/download; the dock's Send action opens Messages with the current Kit selected for sending.
Parent content exposes insertion points and singular slots using the same parent
constraints. Leaf nodes do not expose child insertion. Nested node toolbars yield
to the hovered child; menus flip around their anchor when space permits.
Canvas placeholders and the accessory prompt contribute to intrinsic sizing.
Incomplete Sections and Action Rows reserve the capacity needed to complete
their required structure; an editable Action Row keeps its internal insertion
slot while that completion remains possible.

Renderer styles live under `features/editor/styles`: `message.css` owns Discord
components, media and polls; `embeds.css` owns Embed layout; `markdown.css` owns
text formatting. `canvas.css` owns authoring controls and dragging, while
`sheets.css` owns configuration and JSON surfaces. Public and workspace styles stay
outside the renderer. `InlineField` owns editable text and context-aware tools;
Color and emoji inputs power normal node controls.

Browser verification is manual using external Playwright tooling; it is not a
package test command and adds no browser dependency to a fresh checkout. Unit
tests, including the shared Discord fixtures, run with `npm test`.

References reviewed September 2026:

- [Discord Markdown guide](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline): message syntax and nesting.
- [Component reference](https://docs.discord.com/developers/components/reference): Text Display/content equivalence, component composition, optional colors and partial emoji.
- [Message resource](https://docs.discord.com/developers/resources/message): Embed fields, structured URLs and limits.
- [Poll resource](https://docs.discord.com/developers/resources/poll): plain question/answer text and create-request emoji.
- [Message formatting and CDN](https://docs.discord.com/developers/reference#message-formatting): mentions, timestamp styles and emoji URLs.
- [Discord's field-heading link discussion](https://github.com/discord/discord-api-docs/discussions/3227): masked links intentionally excluded from field headings.

API documentation does not specify every Embed Markdown subset, pixel metric,
or the combined Legacy visual ordering. Those preview details remain a
conservative client approximation, not an API guarantee. Supplied Discord-client
screenshots support focused codeblock comparisons, but intrinsic Embed sizing
still requires a dedicated authenticated-client review.
