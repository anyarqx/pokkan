import { describe, expect, it } from "vitest";
import { messageWithContent, type DiscordMessagePayload } from "../kits/domain";
import {
  allowedInsertions,
  allowedSectionAccessories,
  canCopyComponent,
  canMoveComponent,
  canPasteComponent,
  canRemoveComponent,
  childNodes,
  tryDuplicateComponent,
  tryInsertComponent,
  tryInsertLegacyRow,
  moveComponent,
  moveListItem,
  nodeAt,
  tryMoveComponent,
  tryPasteComponent,
  removeComponent,
  setButtonStyle,
  trySetMessageField,
  trySetNodeField,
  trySetSectionAccessory,
} from "./tree";
import {
  componentKind,
  createComponent,
  validateDiscordOutput,
  validateMessage,
} from "./schema";

describe("editor schema and tree mutations", () => {
  it("uses one schema for add availability and insertion", () => {
    let document: DiscordMessagePayload = {
      components: [{ type: 1, components: [] }],
    };
    expect(allowedInsertions({ components: [] }, [])).toEqual(["actionRow"]);
    expect(allowedInsertions(document, ["components", 0])).toContain("button");

    document = resultMessage(
      tryInsertComponent(document, ["components", 0], "button"),
    );
    expect(childNodes(document, ["components", 0])).toHaveLength(1);

    const selectRow: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "menu",
              options: [{ label: "One", value: "one" }],
            },
          ],
        },
      ],
    };
    expect(allowedInsertions(selectRow, ["components", 0])).toEqual([]);
  });

  it("removes V2 add choices when the exact component budget is exhausted", () => {
    const document: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 40 }, () => ({
        type: 14,
        divider: true,
        spacing: 1,
      })),
    };
    expect(allowedInsertions(document, [])).toEqual([]);
  });

  it("allows valid cross-row movement and rejects invalid destinations before mutation", () => {
    const document: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 1, label: "A", custom_id: "a" }],
        },
        {
          type: 1,
          components: [
            { type: 2, style: 1, label: "B", custom_id: "b" },
            { type: 2, style: 1, label: "C", custom_id: "c" },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "menu",
              options: [{ label: "One", value: "one" }],
            },
          ],
        },
      ],
    };

    expect(
      canMoveComponent(document, ["components", 1], ["components", 0], 0),
    ).toBe(true);
    const moved = moveComponent(
      document,
      ["components", 1],
      ["components", 0],
      0,
      1,
    );
    expect(childNodes(moved, ["components", 0])).toHaveLength(2);
    expect(nodeAt(moved, ["components", 0, "components", 1])?.label).toBe("B");
    expect(
      canMoveComponent(document, ["components", 1], ["components", 2], 0),
    ).toBe(false);
  });

  it("keeps V2 restrictions in validation", () => {
    const document: DiscordMessagePayload = {
      flags: 1 << 15,
      content: "not valid",
      shared_client_theme: { colors: [1, 2, 3] },
      components: [{ type: 10, content: "Valid display" }],
    };
    expect(
      validateMessage(document)
        .filter((issue) => issue.code === "v2FieldForbidden")
        .map((issue) => issue.path),
    ).toEqual([["content"], ["shared_client_theme"]]);
  });

  it("normalizes fields that are incompatible with a button style", () => {
    const document: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: "Visit",
              custom_id: "visit",
              emoji: { name: "✨" },
            },
          ],
        },
      ],
    };
    const link = setButtonStyle(
      document,
      ["components", 0, "components", 0],
      5,
    );
    const linkButton = nodeAt(link, ["components", 0, "components", 0]);
    expect(linkButton?.custom_id).toBeUndefined();

    const premium = setButtonStyle(link, ["components", 0, "components", 0], 6);
    const premiumButton = nodeAt(premium, ["components", 0, "components", 0]);
    expect(premiumButton?.label).toBeUndefined();
    expect(premiumButton?.emoji).toBeUndefined();
    expect(premiumButton?.sku_id).toBe("");
  });

  it("validates API component IDs and entity select default values", () => {
    const document: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          id: 4,
          components: [
            {
              type: 5,
              id: 4,
              custom_id: "people",
              min_values: 1,
              max_values: 1,
              default_values: [{ id: "123", type: "role" }],
            },
          ],
        },
      ],
    };
    const codes = validateMessage(document).map((issue) => issue.code);
    expect(codes).toContain("componentIdUnique");
    expect(codes).toContain("defaultValueInvalid");
  });

  it("keeps message-select minimums and explicit defaults within Discord's message rules", () => {
    const zeroMinimum: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: [{ type: 5, custom_id: "people", min_values: 0 }],
        },
      ],
    };
    const emptyDefaults: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: [{ type: 5, custom_id: "people", default_values: [] }],
        },
      ],
    };

    expect(validateMessage(zeroMinimum).map((issue) => issue.code)).toContain(
      "selectMin",
    );
    expect(validateMessage(emptyDefaults).map((issue) => issue.code)).toContain(
      "defaultValuesRange",
    );
  });

  it("drops explicit API component IDs from duplicated or pasted copies", () => {
    const document: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          id: 9,
          components: [
            { type: 2, id: 12, style: 1, label: "A", custom_id: "a" },
          ],
        },
      ],
    };
    const duplicate = resultMessage(
      tryDuplicateComponent(document, ["components", 0, "components", 0]),
    );
    expect(
      nodeAt(duplicate, ["components", 0, "components", 1])?.id,
    ).toBeUndefined();
    const pasted = resultMessage(
      tryPasteComponent(document, ["components", 0], {
        type: 2,
        id: 42,
        style: 1,
        label: "Pasted",
        custom_id: "pasted",
      }),
    );
    expect(
      nodeAt(pasted, ["components", 0, "components", 1])?.id,
    ).toBeUndefined();
  });

  it("reorders legacy repeatable message fields independently from components", () => {
    const document: DiscordMessagePayload = {
      embeds: [
        {
          title: "First",
          fields: [
            { name: "A", value: "1" },
            { name: "B", value: "2" },
          ],
        },
        { title: "Second" },
      ],
    };
    const embeds = moveListItem(document, ["embeds"], 1, 0);
    expect((embeds.embeds as { title: string }[])[0].title).toBe("Second");

    const fields = moveListItem(document, ["embeds", 0, "fields"], 1, 0);
    expect(
      (fields.embeds as { fields: { name: string }[] }[])[0].fields[0].name,
    ).toBe("B");
  });

  it("reserves capacity until incomplete parents are completed", () => {
    const at37: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 37 }, () => ({
        type: 10,
        content: "x",
      })),
    };
    const at38: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 38 }, () => ({
        type: 10,
        content: "x",
      })),
    };
    const at39: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 39 }, () => ({
        type: 10,
        content: "x",
      })),
    };
    const at40: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 40 }, () => ({
        type: 10,
        content: "x",
      })),
    };

    expect(allowedInsertions(at37, [])).toContain("section");
    const section = resultMessage(tryInsertComponent(at37, [], "section"));
    expect(allowedInsertions(section, [])).not.toContain("separator");
    expect(tryInsertComponent(section, [], "separator").ok).toBe(false);
    expect(allowedSectionAccessories(section, ["components", 37])).toContain(
      "thumbnail",
    );
    const completedSection = resultMessage(
      trySetSectionAccessory(section, ["components", 37], "thumbnail"),
    );
    expect(
      validateMessage(completedSection).some(
        (issue) => issue.code === "v2CompletionReserve",
      ),
    ).toBe(false);

    expect(allowedInsertions(at38, [])).not.toContain("section");
    expect(tryInsertComponent(at38, [], "section").ok).toBe(false);
    expect(allowedInsertions(at38, [])).toContain("actionRow");
    const row = resultMessage(tryInsertComponent(at38, [], "actionRow"));
    expect(allowedInsertions(row, [])).not.toContain("textDisplay");
    expect(tryInsertComponent(row, [], "textDisplay").ok).toBe(false);
    expect(allowedInsertions(row, ["components", 38])).toContain("button");
    const completedRow = resultMessage(
      tryInsertComponent(row, ["components", 38], "button"),
    );
    expect(
      validateMessage(completedRow).some(
        (issue) => issue.code === "v2CompletionReserve",
      ),
    ).toBe(false);

    expect(allowedInsertions(at39, [])).not.toContain("actionRow");
    expect(allowedInsertions(at40, [])).toEqual([]);
  });

  it("applies component limits to paste and duplicate", () => {
    const fullRow: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: Array.from({ length: 5 }, (_, index) => ({
            type: 2,
            style: 1,
            label: `B${index}`,
            custom_id: `b_${index}`,
          })),
        },
      ],
    };
    const duplicate = tryDuplicateComponent(fullRow, [
      "components",
      0,
      "components",
      0,
    ]);
    expect(duplicate.ok).toBe(false);
    expect(childNodes(fullRow, ["components", 0])).toHaveLength(5);

    const almostFull: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 39 }, () => ({
        type: 10,
        content: "x",
      })),
    };
    expect(
      tryPasteComponent(almostFull, [], {
        type: 17,
        components: [
          { type: 10, content: "x" },
          { type: 10, content: "x" },
        ],
      }).ok,
    ).toBe(false);
    expect(childNodes(almostFull, [])).toHaveLength(39);

    const incompleteSection = {
      type: 9,
      components: [{ type: 10, content: "x" }],
    };
    const at38: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 38 }, () => ({
        type: 10,
        content: "x",
      })),
    };
    expect(canPasteComponent(at38, [], incompleteSection)).toBe(false);
    expect(tryPasteComponent(at38, [], incompleteSection).ok).toBe(false);

    const duplicateSource: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        ...Array.from({ length: 36 }, () => ({ type: 10, content: "x" })),
        incompleteSection,
      ],
    };
    expect(tryDuplicateComponent(duplicateSource, ["components", 36]).ok).toBe(
      false,
    );
  });

  it("keeps required completion capacity through incomplete structures and moves", () => {
    const sectionWithoutText: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        ...Array.from({ length: 37 }, () => ({ type: 10, content: "x" })),
        {
          type: 9,
          components: [],
          accessory: { type: 11, media: { url: "https://example.com/a.png" } },
        },
      ],
    };
    expect(allowedInsertions(sectionWithoutText, [])).not.toContain(
      "separator",
    );
    expect(allowedInsertions(sectionWithoutText, ["components", 37])).toContain(
      "textDisplay",
    );
    expect(
      tryInsertComponent(sectionWithoutText, ["components", 37], "textDisplay")
        .ok,
    ).toBe(true);

    const rowWithoutChild: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        ...Array.from({ length: 38 }, () => ({ type: 10, content: "x" })),
        { type: 1, components: [] },
      ],
    };
    expect(allowedInsertions(rowWithoutChild, [])).not.toContain("separator");
    expect(allowedInsertions(rowWithoutChild, ["components", 38])).toContain(
      "button",
    );
    expect(
      tryInsertComponent(rowWithoutChild, ["components", 38], "button").ok,
    ).toBe(true);

    const fullDocument: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        ...Array.from({ length: 36 }, () => ({ type: 10, content: "x" })),
        {
          type: 9,
          components: [{ type: 10, content: "Section" }],
          accessory: { type: 11, media: { url: "https://example.com/a.png" } },
        },
        { type: 17, components: [] },
      ],
    };
    expect(
      canMoveComponent(fullDocument, ["components", 36], ["components", 37], 0),
    ).toBe(false);
    expect(
      tryMoveComponent(
        fullDocument,
        ["components", 36],
        ["components", 37],
        0,
        0,
      ).ok,
    ).toBe(false);
  });

  it("returns a precise rejection when direct collection edits would bypass hard limits", () => {
    const embeds = trySetMessageField(
      { embeds: [] },
      "embeds",
      Array.from({ length: 11 }, () => ({ title: "x" })),
    );
    expect(embeds.ok).toBe(false);
    if (!embeds.ok) expect(embeds.code).toBe("embedCount");

    const options = trySetNodeField(
      {
        components: [
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: "options",
                options: [{ label: "One", value: "one" }],
              },
            ],
          },
        ],
      },
      ["components", 0, "components", 0],
      "options",
      Array.from({ length: 26 }, (_, index) => ({
        label: `Option ${index}`,
        value: String(index),
      })),
    );
    expect(options.ok).toBe(false);
    if (!options.ok) expect(options.code).toBe("stringSelectOptionsMax");
  });

  it("blocks collection overflow without blocking incomplete text while it is being authored", () => {
    const poll = {
      question: { text: "" },
      answers: [{ poll_media: { text: "" } }, { poll_media: { text: "" } }],
      duration: 24,
      layout_type: 1,
    };
    expect(trySetMessageField({}, "poll", poll).ok).toBe(true);
    expect(
      trySetMessageField({}, "poll", {
        ...poll,
        answers: Array.from({ length: 11 }, () => ({
          poll_media: { text: "" },
        })),
      }).ok,
    ).toBe(false);

    const emptyOption = trySetNodeField(
      {
        components: [
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: "options",
                options: [{ label: "One", value: "one" }],
              },
            ],
          },
        ],
      },
      ["components", 0, "components", 0],
      "options",
      [{ label: "", value: "" }],
    );
    expect(emptyOption.ok).toBe(true);
  });

  it("blocks mode-incompatible and non-settable message fields before mutation", () => {
    const document = messageWithContent("componentsV2", "Hello");
    const content = trySetMessageField(document, "content", "not allowed");
    expect(content.ok).toBe(false);
    expect(trySetMessageField(document, "tts", true).ok).toBe(true);
    const flags = trySetMessageField(document, "flags", (1 << 15) | (1 << 14));
    expect(flags.ok).toBe(false);
    expect(trySetMessageField(document, "nonce", "n".repeat(26)).ok).toBe(
      false,
    );
  });

  it("authors a Section accessory as a singular supported slot", () => {
    const document: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [createComponent("section")],
    };
    expect(nodeAt(document, ["components", 0])?.accessory).toBeUndefined();
    expect(allowedSectionAccessories(document, ["components", 0])).toEqual([
      "thumbnail",
      "button",
    ]);
    const thumbnail = resultMessage(
      trySetSectionAccessory(document, ["components", 0], "thumbnail"),
    );
    expect(nodeAt(thumbnail, ["components", 0, "accessory"])?.type).toBe(11);
    const button = resultMessage(
      trySetSectionAccessory(thumbnail, ["components", 0], "button"),
    );
    expect(nodeAt(button, ["components", 0, "accessory"])?.type).toBe(2);
    expect(removeComponent(button, ["components", 0, "accessory"])).toEqual(
      button,
    );
  });

  it("bases structural errors and capacity on sendable components", () => {
    const section: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        {
          type: 9,
          components: [{ type: 10, content: "Hello" }],
          accessory: { type: 999 },
        },
      ],
    };
    expect(validateMessage(section).map((issue) => issue.code)).toContain(
      "sectionAccessory",
    );
    const row: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [{ type: 1, components: [{ type: 999 }] }],
    };
    expect(validateMessage(row).map((issue) => issue.code)).toContain(
      "actionRowChildrenMin",
    );
    expect(
      validateDiscordOutput({
        flags: 1 << 15,
        components: [{ type: 999 }],
      }).map((issue) => issue.code),
    ).toContain("sendableMessageRequired");
    const preservedUnknowns: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 40 }, () => ({ type: 999 })),
    };
    expect(allowedInsertions(preservedUnknowns, [])).toContain("textDisplay");

    const impossibleCompletion: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        ...Array.from({ length: 38 }, () => ({ type: 10, content: "x" })),
        { type: 9, components: [{ type: 10, content: "Section text" }] },
      ],
    };
    expect(
      validateMessage(impossibleCompletion).map((issue) => issue.code),
    ).toContain("v2CompletionReserve");
  });

  it("stops validation at an unsupported subtree that Discord will omit", () => {
    const document: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [{ type: 999, components: [{ type: 10, content: "Hello" }] }],
    };
    const issues = validateMessage(document);
    expect(
      issues.filter((issue) => issue.code === "unsupportedComponent"),
    ).toHaveLength(1);
    expect(
      issues.some(
        (issue) =>
          issue.code === "invalidComponentParent" ||
          issue.code === "textDisplayEmpty",
      ),
    ).toBe(false);
  });

  it("uses the real copied subtree for paste availability", () => {
    const document: DiscordMessagePayload = {
      flags: 1 << 15,
      components: Array.from({ length: 38 }, () => ({
        type: 10,
        content: "x",
      })),
    };
    const copied = {
      type: 17,
      components: [
        { type: 10, content: "a" },
        { type: 10, content: "b" },
      ],
    };
    expect(canPasteComponent(document, [], copied)).toBe(false);
    expect(tryPasteComponent(document, [], copied).ok).toBe(false);
  });

  it("rejects duplicate identifiers and unsupported button styles during direct edits", () => {
    const document: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: [
            { type: 2, id: 3, style: 1, label: "A", custom_id: "a" },
            { type: 2, id: 4, style: 1, label: "B", custom_id: "b" },
          ],
        },
      ],
    };
    expect(
      trySetNodeField(
        document,
        ["components", 0, "components", 1],
        "custom_id",
        "a",
      ).ok,
    ).toBe(false);
    expect(
      trySetNodeField(document, ["components", 0, "components", 1], "id", 3).ok,
    ).toBe(false);
    expect(
      trySetNodeField(document, ["components", 0, "components", 1], "style", 9)
        .ok,
    ).toBe(false);
  });

  it("uses a node parent path for nested keyboard and menu movement", () => {
    const document: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 1, label: "A", custom_id: "a" },
            { type: 2, style: 1, label: "B", custom_id: "b" },
          ],
        },
      ],
    };
    const moved = moveComponent(
      document,
      ["components", 0],
      ["components", 0],
      1,
      0,
    );
    expect(nodeAt(moved, ["components", 0, "components", 0])?.label).toBe("B");
  });

  it("creates a Legacy select in a valid action row", () => {
    const document: DiscordMessagePayload = { components: [] };
    const next = resultMessage(tryInsertLegacyRow(document, "channelSelect"));
    expect(nodeAt(next, ["components", 0])?.type).toBe(1);
    expect(nodeAt(next, ["components", 0, "components", 0])?.type).toBe(8);
  });

  it("removes an emptied Action Row atomically while moving or deleting its final child", () => {
    const document: DiscordMessagePayload = {
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 1, label: "A", custom_id: "a" }],
        },
        {
          type: 1,
          components: [{ type: 2, style: 1, label: "B", custom_id: "b" }],
        },
      ],
    };
    expect(
      canMoveComponent(document, ["components", 0], ["components", 1], 0),
    ).toBe(true);
    const moved = moveComponent(
      document,
      ["components", 0],
      ["components", 1],
      0,
      1,
    );
    expect(childNodes(moved, [])).toHaveLength(1);
    expect(childNodes(moved, ["components", 0])).toHaveLength(2);
    expect(
      childNodes(
        removeComponent(document, ["components", 0, "components", 0]),
        [],
      ),
    ).toHaveLength(1);
  });

  it("does not remove a required Section accessory", () => {
    const document: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        {
          type: 9,
          components: [{ type: 10, content: "Text" }],
          accessory: {
            type: 11,
            media: { url: "https://example.com/image.png" },
          },
        },
      ],
    };
    expect(
      nodeAt(removeComponent(document, ["components", 0, "accessory"]), [
        "components",
        0,
      ])?.accessory,
    ).toBeDefined();
    expect(componentKind(nodeAt(document, ["components", 0])?.accessory)).toBe(
      "thumbnail",
    );
  });

  it("keeps a Section and its accessory when its final Text Display is removed", () => {
    const document: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        {
          type: 9,
          components: [{ type: 10, content: "Text" }],
          accessory: {
            type: 11,
            media: { url: "https://example.com/image.png" },
          },
        },
      ],
    };
    const next = removeComponent(document, ["components", 0, "components", 0]);
    expect(nodeAt(next, ["components", 0])?.type).toBe(9);
    expect(nodeAt(next, ["components", 0, "accessory"])?.type).toBe(11);
    expect(
      validateMessage(next).some(
        (issue) => issue.code === "sectionChildrenMin",
      ),
    ).toBe(true);
  });

  it("exposes the same safe component capabilities to menus and keyboard operations", () => {
    const document: DiscordMessagePayload = {
      flags: 1 << 15,
      components: [
        {
          type: 9,
          components: [{ type: 10, content: "Text" }],
          accessory: {
            type: 11,
            media: { url: "https://example.com/image.png" },
          },
        },
        { type: 999 },
      ],
    };
    expect(canCopyComponent(document, ["components", 0, "accessory"])).toBe(
      false,
    );
    expect(canRemoveComponent(document, ["components", 0, "accessory"])).toBe(
      false,
    );
    expect(canCopyComponent(document, ["components", 1])).toBe(false);
    expect(canRemoveComponent(document, ["components", 1])).toBe(false);
  });

  it("validates a complete poll and reports exact invalid poll paths", () => {
    const document: DiscordMessagePayload = {
      poll: {
        question: { text: "Which one?" },
        answers: [
          { poll_media: { text: "First" } },
          { poll_media: { text: "Second" } },
        ],
        duration: 24,
        layout_type: 1,
      },
    };
    expect(
      validateMessage(document).filter((issue) => issue.path[0] === "poll"),
    ).toEqual([]);
    const invalid = {
      ...document,
      poll: { ...(document.poll as object), question: { text: "" } },
    } as DiscordMessagePayload;
    expect(
      validateMessage(invalid).some(
        (issue) => issue.path.join(".") === "poll.question.text",
      ),
    ).toBe(true);
  });
});

function resultMessage(result: import("./tree").MutationResult) {
  if (!result.ok)
    throw new Error(`Unexpected mutation failure: ${result.code}`);
  return result.document;
}
