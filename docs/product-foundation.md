# Message-first product foundation

Pokkan's central surface is the visual message editor. Future server context may
scope messages and Kits, then open them in this same editor for send/update/delete
actions. Keep that dashboard small. Do not introduce moderation/automation module
settings or a second message builder.

No server selector, Go bot, delivery persistence or scripting model is introduced
by this pass. A future Kit-to-Discord-message relationship must be researched
before assuming one lifetime message per Kit. Templates and MayaStrings remain
separate from Placeholder preview values. A future Text/Source editor belongs in
the current field/sheet context; this pass adds no source fields, runtime or LSP.

## Research decisions (October 2026)

API facts come from Discord's [messages](https://docs.discord.com/developers/resources/message),
[webhooks](https://docs.discord.com/developers/resources/webhook),
[component reference](https://docs.discord.com/developers/components/reference),
[polls](https://docs.discord.com/developers/resources/poll),
[permissions](https://docs.discord.com/developers/topics/permissions) and
[interactions](https://docs.discord.com/developers/interactions/overview).
Beginner instructions use the official [webhook guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
and [formatting guide](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline).
Competitor UX is not an authority for Discord payload semantics.

- [Dyno](https://docs.dyno.gg/en/faq): troubleshooting is reachable from initial guidance.
- [Sapphire](https://docs.sapph.xyz/): getting started precedes advanced feature reference.
- [YAGPDB](https://docs.yagpdb.xyz/): learning resources are separate from scripting reference.
- [ProBot](https://docs.probot.io/docs/getting-started/setup): prerequisites, numbered setup and next steps.
- [Carl-bot](https://docs.carl.gg/): visible entry points back to the product and support.
- [Ticket Tool](https://docs.tickettool.xyz/general/setup): short outcome-based setup, screenshots and mobile navigation instructions.

These informed the Guide path, concise webhook help link and explicit next steps;
their module dashboards were deliberately not adopted. The landing combines an
actual editor screenshot with the existing live presets, not marketing mockups.

[Starlight](https://starlight.astro.build/) supplies static navigation, translated
chrome and local search. [Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
fits the existing hosting account and supports a separate docs custom domain.
[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
is also technically suitable for static documentation, but adds another hosting
workflow without reducing this site's requirements.

## Visual and interaction review

Use controlled local drafts and never send a real webhook during automation.
Inspect landing, Kits, Legacy/V2 editors, Send, sheets and menus at 320, 360, 390,
768, 1024 and 1440px. Include long translated labels, touch, keyboard focus,
Escape/outside dismissal, mouse/touch reorder and a zoom/reflow check.
Capture screenshots only after example bootstrap has reached the ordinary Kit
URL. Documentation search must be tested against a static build.

Browser verification uses external Playwright tooling; it is not part of the
repository's npm test command. The normal frontend suite checks domain behavior,
locale parity and rendered UI. Public docs add their independent build/link check.

### Visual comfort refinement

The screenshot review found competing near-black regions, heavy page headings and
long insertion/divider lines. Node action groups were already content-sized; their
geometry did not need replacing. Use lighter structural surfaces, moderate product
headings and short insertion marks, while keeping Discord content styles separate.

- [Fluent color](https://fluent2.microsoft.design/color) and
  [Primer color usage](https://primer.style/product/getting-started/foundations/color-usage/):
  surface contrast can separate navigation from content without repeated borders.
- [Carbon typography](https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview):
  distinguish productive page headings from expressive landing typography.
- [Atlassian color](https://atlassian.design/foundations/color/): selected, actionable
  and destructive states use semantic color, not decorative color panels.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): retain readable secondary text, visible
  focus, control boundaries and reflow while reducing chrome.
- [Linear's UI review](https://linear.app/now/how-we-redesigned-the-linear-ui)
  is product inspiration for alignment and less chrome, not a theme to copy.

Emojibase 17 compact records use `label` and localized `tags`. The picker derives
its TypeScript shape from the installed dataset and offers only complete emoji
accepted by the message field and recognized by Discord Twemoji 16. This avoids
exposing newer unsupported glyphs or isolated regional indicators as choices.
