import { describe, expect, it } from "vitest";
import { formatMarkdown } from "./markdownFormatting";

describe("Discord markdown source formatting", () => {
  it("wraps and unwraps source without replacing it with HTML", () => {
    const bold = formatMarkdown("bold", "hello world", 6, 11);
    expect(bold.text).toBe("hello **world**");
    expect(formatMarkdown("bold", bold.text, 6, 15).text).toBe("hello world");
  });
});
