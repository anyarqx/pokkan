import { describe, expect, it } from "vitest";
import {
  builtInPlaceholders,
  matchingPlaceholders,
  placeholderCatalog,
} from "./placeholders";

describe("placeholder catalog", () => {
  it("merges custom values and supports fuzzy key lookup", () => {
    const catalog = placeholderCatalog([
      {
        key: "ticket.id",
        label: "Ticket ID",
        description: "Current ticket",
        category: "Custom",
        type: "number",
        example: "42",
      },
    ]);
    expect(catalog.find((item) => item.key === "ticket.id")?.example).toBe(
      "42",
    );
    expect(
      matchingPlaceholders(builtInPlaceholders(), "usrnm").map(
        (item) => item.key,
      ),
    ).toContain("user.name");
  });

  it("previews only known context values and keeps unknown contextual tokens literal", () => {
    const personal = placeholderCatalog([]);
    expect(personal.find((item) => item.key === "guild.name")?.previewValue).toBeUndefined();
    expect(personal.find((item) => item.key === "channel.name")?.previewValue).toBeUndefined();

    const server = placeholderCatalog([], { id: "1001", name: "Example server" });
    expect(server.find((item) => item.key === "guild.name")?.previewValue).toBe("Example server");
    expect(server.find((item) => item.key === "guild.id")?.previewValue).toBe("1001");
    expect(server.find((item) => item.key === "user.mention")?.previewValue).toBeUndefined();
  });
});
