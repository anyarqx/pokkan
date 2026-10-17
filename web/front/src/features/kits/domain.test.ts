import { describe, expect, it } from "vitest";
import {
  deserializeDiscordJson,
  deserializePokkanKit,
  messageFormat,
  messageWithContent,
  toDiscordJson,
  toPokkanKit,
  toWebhookJson,
  webhookCompatibility,
  type Kit,
} from "./domain";
import { validateDiscordOutput, validateMessage } from "../editor/schema";

const kit: Kit = {
  id: "be49cb2e-f4a3-4b3d-8434-4bb1a14a015d",
  name: "Welcome",
  arguments: [
    { name: "count", type: "integer", required: false, default: "2" },
  ],
  placeholders: [
    {
      key: "ticket.id",
      label: "Ticket",
      description: "Current ticket",
      category: "Custom",
      type: "number",
      example: "42",
    },
  ],
  message: {
    content: "Hello {ticket.id}",
    attachments: [{ id: "0", filename: "report.pdf", description: "Report" }],
  },
};

describe("canonical Kit JSON", () => {
  it("normalizes old Placeholder spelling once while preserving Kit identity and metadata", () => {
    const old = toPokkanKit({ ...kit, message: { content: "Hello {{ticket.id}}", embeds: [{ description: "{{user.name}}" }] } });
    const imported = deserializePokkanKit(old);
    expect(imported.id).toBe(kit.id);
    expect(imported.placeholders).toEqual(kit.placeholders);
    expect(imported.message).toEqual({ content: "Hello {ticket.id}", embeds: [{ description: "{user.name}" }] });
    expect(deserializePokkanKit(toPokkanKit(imported))).toEqual(imported);
    expect(old.message.content).toBe("Hello {{ticket.id}}");
  });
  it("round trips identity, arguments, placeholders and attachment groundwork", () => {
    expect(
      deserializePokkanKit(JSON.parse(JSON.stringify(toPokkanKit(kit)))),
    ).toEqual(kit);
    expect(toDiscordJson(kit.message)).not.toHaveProperty("placeholders");
  });
  it("rejects unsupported formats and malformed Kit data", () => {
    expect(() =>
      deserializePokkanKit({ ...toPokkanKit(kit), version: 99 }),
    ).toThrow();
    expect(() =>
      deserializePokkanKit({
        ...toPokkanKit(kit),
        arguments: [{ name: "x", type: "invalid" }],
      }),
    ).toThrow();
    expect(() =>
      deserializePokkanKit({ ...toPokkanKit(kit), placeholders: [{}] }),
    ).toThrow();
  });
});

describe("Discord payloads", () => {
  it("derives the message format from Discord flags for creation, import and validation", () => {
    expect(messageFormat(messageWithContent("legacy", "Hello"))).toBe("legacy");
    expect(messageFormat(messageWithContent("componentsV2", "Hello"))).toBe(
      "componentsV2",
    );
    const message = deserializeDiscordJson({
      flags: 1 << 15,
      components: [{ type: 10, content: "Hello" }],
    });
    expect(messageFormat(message)).toBe("componentsV2");
    expect(
      validateMessage(message).filter((issue) => issue.level === "error"),
    ).toEqual([]);
    expect(validateMessage({ ...message, content: "Invalid" })).toContainEqual(
      expect.objectContaining({ code: "v2FieldForbidden" }),
    );
  });
  it("normalizes returned messages and preserves useful attachment media", () => {
    const imported = deserializeDiscordJson({
      id: "123",
      author: { username: "Example" },
      flags: 1 << 14,
      content: "Hello",
      unknown_field: true,
      attachments: [
        {
          id: "0",
          filename: "guide.pdf",
          url: "https://cdn.discordapp.com/attachments/guide.pdf",
          description: "Guide",
        },
      ],
    });
    expect(imported).not.toHaveProperty("author");
    expect(imported).not.toHaveProperty("unknown_field");
    expect(toDiscordJson(imported)).toEqual({
      content: "Hello",
      allowed_mentions: { parse: [] },
      attachments: [{ id: "0", filename: "guide.pdf", description: "Guide" }],
    });
    expect(imported.attachments).toEqual([
      expect.objectContaining({
        url: "https://cdn.discordapp.com/attachments/guide.pdf",
      }),
    ]);
  });
  it("normalizes empty Components V2 response-only content", () => {
    const message = deserializeDiscordJson({
      id: "123",
      flags: 1 << 15,
      content: "",
      embeds: [],
      components: [{ type: 10, content: "Hello" }],
    });
    expect(message).not.toHaveProperty("content");
    expect(message).not.toHaveProperty("embeds");
  });
  it("preserves unknown imported components without treating omitted children as valid output", () => {
    const message = deserializeDiscordJson({
      flags: 1 << 15,
      tts: true,
      components: [{ type: 1, components: [{ type: 999, future: true }] }],
    });
    expect(message.tts).toBe(true);
    expect(
      (message.components as { components: unknown[] }[])[0]?.components,
    ).toEqual([{ type: 999, future: true }]);
    expect(
      (toDiscordJson(message).components as { components: unknown[] }[])[0]
        ?.components,
    ).toEqual([]);
    expect(validateMessage(message).map((issue) => issue.code)).toContain(
      "actionRowChildrenMin",
    );
    expect(
      validateDiscordOutput({
        flags: 1 << 15,
        components: [{ type: 999 }],
      }).map((issue) => issue.code),
    ).toContain("sendableMessageRequired");
  });
  it("defaults to no automatic mentions while preserving explicit allowances", () => {
    expect(toWebhookJson({ content: "@everyone" }).allowed_mentions).toEqual({
      parse: [],
    });
    expect(
      toWebhookJson({
        content: "@everyone",
        allowed_mentions: { parse: ["everyone"] },
      }).allowed_mentions,
    ).toEqual({ parse: ["everyone"] });
    expect(
      validateMessage({
        content: "Hello",
        allowed_mentions: { parse: ["users"], users: ["123456789012345678"] },
      }),
    ).toContainEqual(expect.objectContaining({ code: "mentionUsersConflict" }));
  });
  it("retains webhook transport limits without deleting message support", () => {
    for (const message of [
      kit.message,
      { message_reference: { message_id: "123" } },
    ])
      expect(() => toWebhookJson(message)).toThrow();
    expect(toWebhookJson({ content: "Quiet", flags: 1 << 12 }).flags).toBe(
      1 << 12,
    );
    expect(
      webhookCompatibility({ content: "Quiet", flags: 1 << 12 }),
    ).toBeUndefined();
    expect(
      toWebhookJson({
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 5, label: "Open", url: "https://example.com" },
            ],
          },
        ],
      }),
    ).toHaveProperty("components");
    expect(
      toWebhookJson({
        components: [
          { type: 1, components: [{ type: 2, style: 6, sku_id: "123" }] },
        ],
      }),
    ).toHaveProperty("components");
    expect(
      toWebhookJson({
        poll: {
          question: { text: "Pick" },
          answers: [
            { poll_media: { text: "A" } },
            { poll_media: { text: "B" } },
          ],
          duration: 24,
        },
      }),
    ).toHaveProperty("poll");
    expect(
      webhookCompatibility(messageWithContent("legacy", "Hello")),
    ).toBeUndefined();
    expect(
      webhookCompatibility(messageWithContent("componentsV2", "Hello")),
    ).toBeUndefined();
  });
});
