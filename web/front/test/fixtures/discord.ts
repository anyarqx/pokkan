import type { DiscordMessagePayload } from "../../src/features/kits/domain";

export const fullMarkdown = "# Heading one\n## Heading two\n### Heading three\n-# Subtext\n\n**Bold *italic*** and __underline__\n- First\n  - Nested\n- Second\n3. Third\n4. Fourth\n[Guide](https://example.test/guide_(part))\n```js\nconst value = `literal`;\n```\n>>> Quoted first\nQuoted second\n\nQuoted after blank";

export const richLegacy = {
  content: fullMarkdown,
  allowed_mentions: { parse: [] },
  poll: {
    question: { text: "**Plain poll question**" },
    answers: [
      { poll_media: { text: "Answer A", emoji: { name: "🌱" } } },
      { poll_media: { text: "Answer B", emoji: { id: "123456789012345678" } } },
      { poll_media: { text: "Answer C" } }
    ]
  },
  embeds: [{
    author: { name: "Author", url: "https://example.test/author", icon_url: "https://example.test/icon.png" },
    title: "**Linked title**",
    url: "https://example.test/title",
    description: "Description with **bold**, [guide](https://example.test/guide) and <:leaf:123456789012345678>.",
    thumbnail: { url: "https://example.test/thumbnail.png" },
    image: { url: "https://example.test/image.png" },
    fields: [
      { name: "A", value: "Value A", inline: true },
      { name: "B", value: "Value B", inline: true },
      { name: "C", value: "Block value C", inline: false },
      { name: "D", value: "Value D", inline: true },
      { name: "E", value: "Value E", inline: true },
      { name: "F", value: "Value F", inline: true },
      { name: "G", value: "Block value G", inline: false }
    ],
    footer: { text: "Footer", icon_url: "https://example.test/icon.png" },
    timestamp: "2026-09-12T12:00:00Z"
  }, { title: "Second Embed", description: "Second description", color: 0 }],
  attachments: [{ id: "0", filename: "first.txt" }, { id: "1", filename: "second.txt" }],
  components: [{ type: 1, components: [
    { type: 2, style: 1, label: "Unicode", custom_id: "unicode", emoji: { name: "🌱" } },
    { type: 2, style: 2, label: "Custom", custom_id: "custom", emoji: { id: "123456789012345678", name: "leaf", animated: true } },
    { type: 2, style: 5, label: "Link", url: "https://example.test/button" }
  ] }]
} satisfies DiscordMessagePayload;

export const richV2 = {
  flags: 32768,
  allowed_mentions: { parse: [] },
  components: [
    { type: 10, content: fullMarkdown },
    { type: 17, components: [
      { type: 10, content: "Uncolored container" },
      { type: 9, components: [{ type: 10, content: "Section text" }], accessory: { type: 11, media: { url: "https://example.test/thumbnail.png" }, description: "Section thumbnail" } },
      { type: 14 },
      { type: 12, items: [
        { media: { url: "https://example.test/first.png" }, description: "First gallery image" },
        { media: { url: "https://example.test/second.png" }, description: "Second gallery image", spoiler: true }
      ] },
      { type: 13, file: { url: "attachment://first.txt" }, spoiler: true }
    ] },
    { type: 17, accent_color: 0x248046, components: [{ type: 10, content: "Colored container" }] },
    richLegacy.components![0]
  ],
  attachments: richLegacy.attachments
} satisfies DiscordMessagePayload;
