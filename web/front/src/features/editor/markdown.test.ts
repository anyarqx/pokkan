import { describe, expect, it } from "vitest";
import { formatMarkdown } from "./InlineField";

describe("Discord markdown source formatting", () => {
  it("wraps and unwraps source without replacing it with HTML", () => {
    const bold = formatMarkdown("bold", "hello world", 6, 11);
    expect(bold.text).toBe("hello **world**");
    expect(formatMarkdown("bold", bold.text, 6, 15).text).toBe("hello world");
  });

  it("preserves multiline source while applying line formatting", () => {
    expect(formatMarkdown("quote", "one\ntwo", 0, 7).text).toBe("> one\n> two");
    expect(formatMarkdown("codeBlock", "const x = 1", 0, 11).text).toBe(
      "```\nconst x = 1\n```",
    );
  });
});
