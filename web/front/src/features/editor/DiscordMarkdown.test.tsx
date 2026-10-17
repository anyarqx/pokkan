import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import "../../app/i18n";
import { DiscordMarkdown, formatTimestamp } from "./DiscordMarkdown";
import { ServerReferencesContext } from "./serverReferences";

describe("Discord markdown preview", () => {
  it("keeps literal backslashes and applies escapes according to their Markdown context", () => {
    const render = (source: string) => renderToStaticMarkup(<DiscordMarkdown source={source} />);
    expect(render("\\")).toContain("\\");
    expect(render("C:\\notes\\draft")).toContain("C:\\notes\\draft");
    expect(render("\\**")).toContain("**");
    expect(render("\\**")).not.toContain("<strong>");
    expect(render("**bold\\\\**")).toContain("<strong>bold\\</strong>");
    expect(render("`C:\\notes\\`")).toContain("C:\\notes\\");
  });
  it.each(["> > text", ">>> First\n> Second", "> - > text"])(
    "keeps Discord quotes at one level (%s)",
    (source) => {
      const html = renderToStaticMarkup(<DiscordMarkdown context="message" source={source} />);
      expect(html.match(/<blockquote>/g)).toHaveLength(1);
      expect(html).toContain("&gt;");
    },
  );
  it("renders headings, subtext and lists through the shared block Markdown rules", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdown
        context="message"
        source={
          "- **One**\n- Two\n1. First\n2. Second\n# Heading\n-# Supporting text\n```text\n- plain code\n```"
        }
      />,
    );
    expect(html).toContain("<ul><li>");
    expect(html).toContain("<strong>One</strong>");
    expect(html).toContain('<ol start="1">');
    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain('class="discord-subtext"');
    expect(html).toContain("- plain code");
  });
  it("renders Markdown through React nodes and never treats source as HTML", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdown source={"**safe** <img src=x onerror=alert(1)>"} />,
    );
    expect(html).toContain("<strong>safe</strong>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src");
  });

  it("keeps source-level Discord syntax separate while previewing placeholders and blocks", () => {
    const html = renderToStaticMarkup(
      <DiscordMarkdown
        context="message"
        placeholders={[
          {
            key: "user.name",
            label: "User",
            description: "",
            category: "User",
            type: "string",
            example: "Pokkan",
            previewValue: "Pokkan",
          },
        ]}
        previewPlaceholders
        source={"# Hello {user.name}\n- one\n- two\n<t:0:d>"}
      />,
    );
    expect(html).toContain('<h1>Hello <span class="placeholder-preview"');
    expect(html).toContain("Pokkan");
    expect(html).toContain("<ul>");
    expect(html).toContain("discord-timestamp");
  });

  it("recognizes timestamp styles without modifying the source", () => {
    expect(formatTimestamp(0, "R")).toContain("ago");
    expect(formatTimestamp(0, "R", "ja")).toContain("前");
    expect(formatTimestamp(Number.NaN)).toBe("Invalid timestamp");
    expect(formatTimestamp(Number.NaN, undefined, "ja", "無効な日時")).toBe(
      "無効な日時",
    );
  });

  it("uses known channel and role names without inventing names for unknown IDs", () => {
    const html = renderToStaticMarkup(
      <ServerReferencesContext.Provider
        value={[
          { id: "2001", name: "general", kind: "channel" },
          { id: "3001", name: "Helpers", kind: "role" },
        ]}
      >
        <DiscordMarkdown context="message" source="<#2001> <@&3001> <#9999>" />
      </ServerReferencesContext.Provider>,
    );
    expect(html).toContain("#general");
    expect(html).toContain("@Helpers");
    expect(html).toContain("#9999");
  });
});
