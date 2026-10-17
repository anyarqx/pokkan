---
title: Message formatting
description: Format Discord text, write codeblocks, insert references and understand which fields support Markdown.
sidebar:
  order: 11
---

Markdown uses text markers to style a message. Select text and use Pokkan's toolbar, or type the markers directly. Legacy message content and V2 Text Displays share full-message formatting.

## Common syntax

| Source                                | Use                                 |
| ------------------------------------- | ----------------------------------- |
| `**Important**`                       | Bold                                |
| `*A note*`                            | Italic                              |
| `__Underlined__`                      | Underline                           |
| `~~Outdated~~`                        | Strikethrough                       |
| `# Heading`                           | Heading at the start of a line      |
| `## Heading` or `### Heading`         | Smaller headings                    |
| `-# Small note`                       | Subtext at the start of a line      |
| `- Item` or `1. Item`                 | Bulleted or numbered list           |
| `> Quote`                             | One quoted line                     |
| `>>> Quote`                           | Quote continuing over several lines |
| `[Help](https://docs.pokkan.net/en/)` | Named link                          |

For a spoiler, put two vertical bars on each side: <code>||Surprise||</code>. Use a backslash before a formatting character when you want the character itself. Headings and list markers need a following space.

## Code without changing the source

Use one backtick on each side for inline code. Use three backticks on separate lines for a codeblock, with an optional language after the opening fence:

````text
```py
print("hello")
```
````

Pokkan selectively highlights Python, JavaScript, TypeScript, C, C++, JSON, shell, CSS and XML/HTML. Common tags include `py`, `js`, `ts`, `c`, `cpp`, `c++`, `json` and `sh`. An unknown tag leaves readable plain code. The editor does not guess a different language or rewrite the source.

In Embed fields, long code lines wrap to fit the field. Turning **Inline** off on a field gives it its own row, which leaves more room for code. To change that, select the field and use **Make field full width** or **Make field inline** in its controls. Message-level codeblocks can scroll horizontally.

## Fields differ

Formatting depends on where the text appears. Embed descriptions and field values accept Markdown, while author and footer text, Button labels and poll questions and answers remain plain text. To make an Embed title link to a website, enter its destination URL in the Embed's settings rather than writing a Markdown link into the title.

## Mentions and emoji

User, role and channel references use Discord syntax such as `<@123456789012345678>`, `<@&123456789012345678>` and `<#123456789012345678>`. When server data is available to your account, Pokkan can show the corresponding channel and role names. Other references remain generic in the preview until Discord resolves them in the posted message.

Mention appearance is separate from notification permission. Review allowed mentions before sending. The default avoids allowing broad notifications automatically.

Unicode emoji stay as Unicode in the Kit and use Discord's Twemoji artwork in preview. Custom emoji use Discord's CDN and can be entered as an ID, `<:name:id>` or `<a:name:id>`. An unavailable image does not delete your input.

Next: [Editing controls](/en/using-pokkan/editing/) · [Server references](/en/using-pokkan/servers/)

Official reference: [Discord Markdown](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline).
