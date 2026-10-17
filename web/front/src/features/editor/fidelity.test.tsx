// @vitest-environment jsdom
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import {
  fullMarkdown,
  richLegacy,
  richV2,
} from "../../../test/fixtures/discord";
import { EditorCanvas, type CanvasActions } from "./EditorCanvas";
import { DiscordMarkdown, formatTimestamp } from "./DiscordMarkdown";
import { Emoji } from "./Emoji";
import { EmojiInput } from "./QuickControls";
import { createComponent, validateMessage } from "./schema";
import { useDocumentEditor } from "./useDocumentEditor";
import {
  moveListItem,
  setButtonStyle,
  nodeAt,
  tryInsertComponent,
  trySetNodeField,
  trySetMessageField,
} from "./tree";
import {
  deserializeDiscordJson,
  deserializePokkanKit,
  messageWithContent,
  toDiscordJson,
  toPokkanKit,
  toWebhookJson,
  type DiscordMessagePayload,
} from "../kits/domain";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let current: DiscordMessagePayload;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});

function Harness({ initial }: Readonly<{ initial: DiscordMessagePayload }>) {
  const [message, setMessage] = useState(initial);
  const [selectedPath, select] = useState<CanvasActions["selectedPath"]>();
  current = message;
  const noop = vi.fn();
  const actions: CanvasActions = {
    selectedPath,
    select,
    beginEdit: noop,
    endEdit: noop,
    updateMessage: (field, value) =>
      setMessage({ ...message, [field]: value } as DiscordMessagePayload),
    updateNode: (path, field, value) => {
      const result = trySetNodeField(message, path, field, value);
      if (result.ok) setMessage(result.document);
    },
    setButtonStyle: (path, style) =>
      setMessage(setButtonStyle(message, path, style)),
    add: (path, kind, index) => {
      const result = tryInsertComponent(message, path, kind, index);
      if (result.ok) setMessage(result.document);
    },
    addLegacyRow: noop,
    setSectionAccessory: noop,
    remove: noop,
    duplicate: noop,
    copy: noop,
    paste: noop,
    move: noop,
    moveList: noop,
    drag: noop,
    canDrag: () => false,
    configure: noop,
    configureMessage: noop,
    configureLegacyEmbed: noop,
  };
  return (
    <EditorCanvas
      actions={actions}
      document={message}
      placeholders={[]}
      previewPlaceholders
    />
  );
}

it("tracks the Legacy element whose text receives focus without leaving a different field selected", () => {
  const initial = {
    embeds: [
      {
        title: "Evening program",
        description: "Bring a telescope",
        fields: [{ name: "When", value: "Friday" }],
      },
    ],
  };
  flushSync(() => root.render(<Harness initial={initial} />));
  const name = host.querySelector<HTMLElement>('[aria-label="Field name"]')!;
  flushSync(() => name.click());
  expect(host.querySelector(".legacy-field-item.is-selected")).not.toBeNull();
  const description = host.querySelector<HTMLElement>(
    '[aria-label="Description"]',
  )!;
  flushSync(() => description.click());
  expect(host.querySelector(".legacy-field-item.is-selected")).toBeNull();
  expect(host.querySelector(".legacy-embed-item.is-selected")).not.toBeNull();
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Description",
  );
  expect(current).toEqual(initial);
});

function UndoHarness({
  initial,
}: Readonly<{ initial: DiscordMessagePayload }>) {
  const editor = useDocumentEditor("gallery-undo", initial, () => undefined);
  const [selectedPath, select] = useState<CanvasActions["selectedPath"]>();
  current = editor.document;
  const noop = vi.fn();
  const actions: CanvasActions = {
    selectedPath,
    select,
    beginEdit: editor.beginEdit,
    endEdit: editor.endEdit,
    updateNode(path, field, value, editing) {
      const result = trySetNodeField(editor.document, path, field, value);
      if (result.ok)
        editor.change(result.document, editing ? "edit" : "structural");
    },
    updateMessage(field, value, editing) {
      const result = trySetMessageField(editor.document, field, value);
      if (result.ok)
        editor.change(result.document, editing ? "edit" : "structural");
    },
    setButtonStyle: (path, style) =>
      editor.change(setButtonStyle(editor.document, path, style)),
    add: noop,
    addLegacyRow: noop,
    setSectionAccessory: noop,
    remove: noop,
    duplicate: noop,
    copy: noop,
    paste: noop,
    move: noop,
    moveList: noop,
    drag: noop,
    canDrag: () => false,
    configure: noop,
    configureMessage: noop,
    configureLegacyEmbed: noop,
  };
  return (
    <>
      <button onClick={editor.undo} type="button">
        Undo
      </button>
      <button onClick={editor.redo} type="button">
        Redo
      </button>
      <EditorCanvas
        actions={actions}
        document={editor.document}
        issues={validateMessage(editor.document)}
        placeholders={[]}
        previewPlaceholders
      />
    </>
  );
}

function button(label: string, within: ParentNode = document) {
  const match = [...within.querySelectorAll("button")].find(
    (item) =>
      item.getAttribute("aria-label") === label || item.textContent === label,
  );
  expect(match, label).toBeDefined();
  return match!;
}

it("changes one Embed field's inline state and restores the message with undo", () => {
  flushSync(() => root.render(<UndoHarness initial={richLegacy} />));
  const before = toDiscordJson(current);
  const toggle = button("Make field full width");
  expect(toggle.getAttribute("aria-pressed")).toBe("true");
  flushSync(() => toggle.click());
  const fields = (toDiscordJson(current) as typeof richLegacy).embeds[0]
    .fields!;
  expect(fields[0]).toEqual({
    ...richLegacy.embeds[0].fields![0],
    inline: false,
  });
  expect(fields.slice(1)).toEqual(richLegacy.embeds[0].fields!.slice(1));
  flushSync(() => button("Undo").click());
  expect(toDiscordJson(current)).toEqual(before);
});

it("edits poll settings through its controls and recovers each change with undo", async () => {
  flushSync(() => root.render(<UndoHarness initial={richLegacy} />));
  const original = structuredClone(current.poll) as Record<string, unknown>;
  flushSync(() => button("Allow multiple answers").click());
  expect(current.poll).toEqual({
    ...original,
    allow_multiselect: !original.allow_multiselect,
  });
  const clock = button("Duration in hours");
  flushSync(() => clock.click());
  const duration = document.querySelector<HTMLInputElement>(
    'input[aria-label="Duration in hours"]',
  )!;
  await vi.waitFor(() => expect(document.activeElement).toBe(duration));
  input(duration, "48");
  flushSync(() =>
    duration.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  expect(current.poll).toEqual({
    ...original,
    allow_multiselect: !original.allow_multiselect,
    duration: 48,
  });
  expect(document.activeElement).toBe(clock);
  flushSync(() => button("Undo").click());
  expect(current.poll).toEqual({
    ...original,
    allow_multiselect: !original.allow_multiselect,
  });
  flushSync(() => button("Undo").click());
  expect(current.poll).toEqual(original);
});

it.each([1, 2, 3, 4, 5, 6])(
  "changes Button style %s from its node controls and restores the full node with undo",
  async (style) => {
    const original = {
      type: 2,
      style: style === 2 ? 1 : 2,
      label: "Continue",
      custom_id: "continue",
      emoji: { name: "✨" },
      disabled: true,
    };
    const initial = {
      flags: 32768,
      components: [
        {
          type: 9,
          components: [{ type: 10, content: "Choose a path" }],
          accessory: original,
        },
      ],
    };
    flushSync(() => root.render(<UndoHarness initial={initial} />));
    const names = [
      "Primary",
      "Secondary",
      "Success",
      "Danger",
      "Link",
      "Premium",
    ];
    flushSync(() => button(`Style: ${names[original.style - 1]}`).click());
    await vi.waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-pressed")).toBe("true"),
    );
    flushSync(() =>
      button(
        names[style - 1],
        document.querySelector('[role="dialog"]')!,
      ).click(),
    );
    const changed = nodeAt(current, ["components", 0, "accessory"]);
    expect(changed?.style).toBe(style);
    expect(changed?.disabled).toBe(true);
    expect(changed?.custom_id).toBe(style < 5 ? "continue" : undefined);
    expect(changed?.label).toBe(style === 6 ? undefined : "Continue");
    expect(changed?.emoji).toEqual(style === 6 ? undefined : { name: "✨" });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(button(`Style: ${names[style - 1]}`));
    flushSync(() => button("Undo").click());
    expect(nodeAt(current, ["components", 0, "accessory"])).toEqual(original);
    flushSync(() => button("Redo").click());
    expect(nodeAt(current, ["components", 0, "accessory"])).toEqual(changed);
  },
);

it("preserves a Link Button URL when its current style is chosen again", () => {
  const message = {
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: "Guide",
            url: "https://docs.pokkan.net/en/",
          },
        ],
      },
    ],
  };
  expect(
    setButtonStyle(message, ["components", 0, "components", 0], 5),
  ).toEqual(message);
});

function input(element: HTMLInputElement, value: string) {
  flushSync(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

it("removes and reinserts Legacy content as one undoable payload field", () => {
  const initial = { content: "**Hello**", embeds: [{ title: "Keep this" }] };
  flushSync(() => root.render(<UndoHarness initial={initial} />));
  flushSync(() =>
    button("Copy").dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Backspace",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(current.content).toBe(initial.content);
  flushSync(() => button("Remove message content").click());
  expect(current).not.toHaveProperty("content");
  expect(
    host.querySelector('[role="textbox"][aria-label="Message content"]'),
  ).toBeNull();
  expect(toWebhookJson(current)).not.toHaveProperty("content");
  expect(deserializeDiscordJson(toDiscordJson(current))).not.toHaveProperty(
    "content",
  );
  flushSync(() => button("Undo").click());
  expect(current.content).toBe("**Hello**");
  flushSync(() => button("Redo").click());
  expect(current).not.toHaveProperty("content");
  flushSync(() => button("Add element").click());
  flushSync(() => button("Message content").click());
  expect(current.content).toBe("");
  flushSync(() => button("Add element").click());
  expect(
    [...host.querySelectorAll('[role="menuitem"]')].some(
      (item) => item.textContent === "Message content",
    ),
  ).toBe(false);
  expect(current.embeds).toEqual(initial.embeds);
});

it("does not invent a content editor for an embed-only message or read-only empty text", () => {
  flushSync(() =>
    root.render(<Harness initial={{ embeds: [{ title: "Only embed" }] }} />),
  );
  expect(
    host.querySelector('[role="textbox"][aria-label="Message content"]'),
  ).toBeNull();
  flushSync(() =>
    root.render(
      <EditorCanvas
        document={{ content: "", embeds: [{ title: "Only embed" }] }}
        placeholders={[]}
        previewPlaceholders
        readOnly
      />,
    ),
  );
  expect(host.querySelector('[role="textbox"]')).toBeNull();
  expect(host.textContent).toContain("Only embed");
});

it("connects field diagnostics to their current text and clears them after editing", () => {
  flushSync(() =>
    root.render(
      <UndoHarness
        initial={{ embeds: [{ fields: [{ name: "", value: "Value" }] }] }}
      />,
    ),
  );
  const field = host.querySelector<HTMLElement>(
    '[role="textbox"][aria-label="Field name"]',
  )!;
  expect(field.getAttribute("aria-invalid")).toBe("true");
  flushSync(() => field.click());
  const source = host.querySelector<HTMLElement>(
    '[contenteditable][aria-label="Field name"]',
  )!;
  flushSync(() => {
    source.textContent = "A name";
    source.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(
    host
      .querySelector('[aria-label="Field name"]')
      ?.getAttribute("aria-invalid"),
  ).toBeNull();
});

it("adds children through the selected Container and Action Row controls", () => {
  flushSync(() =>
    root.render(
      <Harness
        initial={{ flags: 32768, components: [{ type: 17, components: [] }] }}
      />,
    ),
  );
  flushSync(() => button("Add element", host).click());
  flushSync(() =>
    button("Action Row", document.querySelector('[role="menu"]')!).click(),
  );
  expect(current.components).toHaveLength(1);
  expect(nodeAt(current, ["components", 0])?.components).toHaveLength(1);
  const row = host.querySelector('[data-type="1"]')!;
  flushSync(() => button("Add element", row).click());
  flushSync(() =>
    button("Button", document.querySelector('[role="menu"]')!).click(),
  );
  expect(
    nodeAt(current, ["components", 0, "components", 0])?.components,
  ).toHaveLength(1);
});

describe("Discord text contexts", () => {
  it("renders Legacy content and Text Display with the same full Markdown", () => {
    const render = (message: DiscordMessagePayload) => {
      flushSync(() =>
        root.render(
          <EditorCanvas
            document={message}
            placeholders={[]}
            previewPlaceholders
            readOnly
          />,
        ),
      );
      return host.querySelector(".discord-markdown")!.innerHTML;
    };
    const legacy = render({ content: fullMarkdown });
    expect(
      render({
        flags: 32768,
        components: [{ type: 10, content: fullMarkdown }],
      }),
    ).toBe(legacy);
    expect(host.querySelector("h1")?.textContent).toBe("Heading one");
    expect(host.querySelector("h2")?.textContent).toBe("Heading two");
    expect(host.querySelector("h3")?.textContent).toBe("Heading three");
    expect(host.querySelector("ul ul li")?.textContent).toBe("Nested");
    expect(host.querySelector("strong em")?.textContent).toBe("italic");
    expect(host.querySelector("blockquote")?.textContent).toContain(
      "Quoted after blank",
    );
    expect(host.querySelector("pre code")?.textContent).toBe(
      "const value = `literal`;",
    );
    expect(host.querySelector("a")?.href).toBe(
      "https://example.test/guide_(part)",
    );
  });

  it("keeps literal single-line code separate from following headings", () => {
    flushSync(() =>
      root.render(
        <DiscordMarkdown
          context="message"
          source={"```**literal**```after\n# Heading"}
        />,
      ),
    );
    expect(host.querySelector("pre")?.textContent).toBe("**literal**");
    expect(host.querySelector("h1")?.textContent).toBe("Heading");
    expect(host.textContent).toContain("after");
  });

  it("preserves escapes, code boundaries, nested emphasis and literal links", () => {
    flushSync(() =>
      root.render(
        <DiscordMarkdown
          context="message"
          readOnly
          source={
            "\\# Literal\n__***nested***__ \\*literal\\*\n5. five\n6. six\n```text\n**not bold**\n```\nhttps://example.test/page."
          }
        />,
      ),
    );
    expect(host.querySelector("h1")).toBeNull();
    expect(host.querySelector("u strong em")?.textContent).toBe("nested");
    expect(host.querySelector("code")?.textContent).toBe("**not bold**");
    expect(host.querySelector("ol")?.start).toBe(5);
    expect(host.querySelector("a")?.href).toBe("https://example.test/page");
    expect(host.textContent).toContain("*literal*");
  });

  it("renders command mentions, animated emoji and all timestamp styles safely", () => {
    const styles = ["t", "T", "d", "D", "f", "F", "s", "S", "R"];
    flushSync(() =>
      root.render(
        <DiscordMarkdown
          context="message"
          source={`</task run:123> <a:leaf:123> ${styles.map((style) => `<t:0:${style}>`).join(" ")} <t:99999999999999999999999>`}
        />,
      ),
    );
    expect(host.textContent).toContain("/task run");
    expect(
      new URL(host.querySelector("img")!.src).searchParams.get("animated"),
    ).toBe("true");
    expect(host.querySelectorAll("time")).toHaveLength(9);
    expect(formatTimestamp(0, "s")).not.toBe(formatTimestamp(0, "S"));
    expect(formatTimestamp(0, "f")).not.toBe(formatTimestamp(0, "F"));
    expect(host.textContent).toContain("<t:99999999999999999999999>");
  });
});

describe("Embed, color and emoji editing", () => {
  it("previews a typed emoji ID immediately and retains it after a CDN failure", () => {
    const change = vi.fn();
    flushSync(() =>
      root.render(<EmojiInput value={undefined} change={change} />),
    );
    const entry = host.querySelector("input")!;
    input(entry, "123456789012345678");
    expect(host.querySelector("img")?.src).toContain(
      "/emojis/123456789012345678.webp",
    );
    expect(change).not.toHaveBeenCalled();
    flushSync(() =>
      host.querySelector("img")!.dispatchEvent(new Event("error")),
    );
    expect(host.querySelector('[role="img"]')?.getAttribute("aria-label")).toBe(
      "Emoji unavailable",
    );
    expect(entry.value).toBe("123456789012345678");
    flushSync(() =>
      entry.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(change).toHaveBeenCalledWith({ id: "123456789012345678" });
  });

  it("uses animated WebP for animated or ID-only emoji and renders Unicode through Twemoji", () => {
    for (const animated of [true, false, undefined]) {
      flushSync(() => root.render(<Emoji value={{ id: "123", animated }} />));
      const query = new URL(host.querySelector("img")!.src).searchParams;
      expect(query.get("animated")).toBe(animated === false ? null : "true");
    }
    flushSync(() => root.render(<Emoji value={{ name: "🌱" }} />));
    const unicode = host.querySelector("img")!;
    expect(unicode.alt).toBe("🌱");
    expect(unicode.src).toContain("/assets/svg/1f331.svg");
  });

  it("preserves surrounding text and resolves emoji presentation variants", () => {
    flushSync(() =>
      root.render(
        <DiscordMarkdown context="message" source="## Help 🐱 and ❤️ today" />,
      ),
    );
    expect(host.querySelector("h2")?.textContent).toBe("Help  and  today");
    const images = [...host.querySelectorAll("img")];
    expect(images.map((image) => image.alt)).toEqual(["🐱", "❤️"]);
    expect(images[1].src).toContain("/svg/2764.svg");
  });

  it.each([
    ["en", "cat", "cat face"],
    ["pt-BR", "gato", "rosto de gato"],
    ["es", "gato", "cara de gato"],
    ["ja", "猫", "ネコの顔"],
  ])(
    "searches localized emoji and stores Unicode (%s)",
    async (locale, term, label) => {
      await i18n.changeLanguage(locale);
      const change = vi.fn();
      flushSync(() =>
        root.render(<EmojiInput value={undefined} change={change} />),
      );
      expect(host.querySelector('input[type="search"]')).toBeNull();
      flushSync(() => button(i18n.t("editor.chooseEmoji")).click());
      await vi.waitFor(() =>
        expect(document.querySelector(".emoji-grid button")).not.toBeNull(),
      );
      const search = host.querySelector<HTMLInputElement>(
        'input[type="search"]',
      )!;
      flushSync(() => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(search, term);
        search.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const choice = [
        ...host.querySelectorAll<HTMLButtonElement>("button"),
      ].find((item) => item.getAttribute("aria-label") === label)!;
      expect(choice).toBeDefined();
      flushSync(() => choice.click());
      expect(change).toHaveBeenCalledWith({ name: "🐱" });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    },
  );

  it("only offers complete emoji supported by the Discord renderer", async () => {
    flushSync(() =>
      root.render(<EmojiInput value={undefined} change={vi.fn()} />),
    );
    flushSync(() => button("Choose emoji").click());
    await vi.waitFor(() =>
      expect(host.querySelector(".emoji-grid button")).not.toBeNull(),
    );
    const search = host.querySelector<HTMLInputElement>(
      'input[type="search"]',
    )!;
    for (const term of ["distorted face", "regional indicator"]) {
      flushSync(() => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(search, term);
        search.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(host.querySelector(".emoji-grid button")).toBeNull();
    }
    flushSync(() => button(i18n.t("editor.emojiGroups.3")).click());
    expect(host.querySelector('button[aria-label="cat face"]')).not.toBeNull();
  });

  it("renders documented game and navigation tokens without inventing navigation", () => {
    flushSync(() =>
      root.render(
        <DiscordMarkdown
          context="message"
          readOnly
          source={
            "<@$123> <id:customize> <id:browse> <id:guide> <id:linked-roles> <id:linked-roles:456>"
          }
        />,
      ),
    );
    expect(host.textContent).toBe(
      "@$123 id:customize id:browse id:guide id:linked-roles id:linked-roles:456",
    );
    expect(host.querySelector("a,button")).toBeNull();
  });

  it("preserves unsupported components in Kits while omitting them from Discord JSON", () => {
    const message = {
      flags: 32768,
      components: [{ type: 99, extra: "Unknown data" }],
    };
    const kit = {
      id: "be49cb2e-f4a3-4b3d-8434-4bb1a14a015d",
      name: "Unknown",
      arguments: [],
      placeholders: [],
      message,
    };
    expect(deserializePokkanKit(toPokkanKit(kit)).message).toEqual(message);
    expect(toDiscordJson(message).components).toEqual([]);
    expect(deserializeDiscordJson(message).components).toEqual([
      { type: 99, extra: "Unknown data" },
    ]);
    expect(
      validateMessage(message).find(
        (issue) => issue.code === "unsupportedComponent",
      )?.message,
    ).toContain("omitted from Discord JSON");
  });

  it("requires V2 media URLs and validates gallery spoiler data", () => {
    const issues = validateMessage({
      flags: 32768,
      components: [{ type: 12, items: [{ media: {}, spoiler: "yes" }] }],
    });
    expect(
      issues.some(
        (issue) =>
          issue.level === "error" &&
          issue.path.join(".") === "components.0.items.0.media",
      ),
    ).toBe(true);
    expect(
      issues.some(
        (issue) =>
          issue.level === "error" &&
          issue.path.join(".") === "components.0.items.0.spoiler",
      ),
    ).toBe(true);
  });

  it("activates structured Embed links only in read-only preview", () => {
    flushSync(() =>
      root.render(
        <EditorCanvas
          document={richLegacy}
          placeholders={[]}
          previewPlaceholders
          readOnly
        />,
      ),
    );
    expect(
      [...host.querySelectorAll("a[href]")].map((link) =>
        link.getAttribute("href"),
      ),
    ).toContain("https://example.test/author");
    expect(
      [...host.querySelectorAll("a[href]")].map((link) =>
        link.getAttribute("href"),
      ),
    ).toContain("https://example.test/title");
    flushSync(() => root.render(<Harness initial={richLegacy} />));
    expect(host.querySelector("a[href]")).toBeNull();
  });

  it.each([false, true])(
    "sets and clears the actual color field (V2: %s)",
    (v2) => {
      flushSync(() =>
        root.render(<Harness initial={v2 ? richV2 : richLegacy} />),
      );
      const controls = v2
        ? host.querySelector(".node-container")!
        : host.querySelector('[data-legacy-embed="0"]')!;
      flushSync(() => button("Color", controls).click());
      input(
        document.querySelector<HTMLInputElement>('[aria-label="Hex color"]')!,
        "#123456",
      );
      expect(
        v2
          ? nodeAt(current, ["components", 1])?.accent_color
          : nodeAt(current, ["embeds", 0])!.color,
      ).toBe(0x123456);
      flushSync(() => button("Remove color").click());
      expect(
        v2
          ? nodeAt(current, ["components", 1])?.accent_color
          : nodeAt(current, ["embeds", 0])!.color,
      ).toBeUndefined();
      expect(createComponent("container").accent_color).toBeUndefined();
      expect(
        nodeAt(messageWithContent("componentsV2", "Hello"), ["components", 0])
          ?.accent_color,
      ).toBeUndefined();
      flushSync(() =>
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        ),
      );
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    },
  );

  it("preserves custom Button emoji during unrelated edits", () => {
    const path = ["components", 0, "components", 1];
    const result = trySetNodeField(richLegacy, path, "label", "Renamed");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(nodeAt(result.document, path)?.emoji).toEqual({
      id: "123456789012345678",
      name: "leaf",
      animated: true,
    });
    flushSync(() =>
      root.render(
        <EditorCanvas
          document={result.document}
          placeholders={[]}
          previewPlaceholders
          readOnly
        />,
      ),
    );
    expect(host.querySelector('img[alt=":leaf:"]')).not.toBeNull();
  });

  it("edits an answer emoji on the answer row and exports only request emoji fields", () => {
    flushSync(() => root.render(<Harness initial={richLegacy} />));
    const answer = host.querySelector(".poll-answer")!;
    flushSync(() => button("Emoji", answer).click());
    const entry = document.querySelector<HTMLInputElement>(
      '[role="dialog"] input',
    )!;
    input(entry, "<a:leaf:123456789012345678>");
    flushSync(() =>
      entry.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    const poll = current.poll as {
      answers: { poll_media: { emoji?: unknown } }[];
    };
    expect(poll.answers[0].poll_media.emoji).toEqual({
      id: "123456789012345678",
    });
    flushSync(() => button("Remove emoji").click());
    expect(
      (current.poll as typeof poll).answers[0].poll_media.emoji,
    ).toBeUndefined();
    const exported = toDiscordJson(richLegacy).poll as typeof poll;
    expect(exported.answers[1].poll_media.emoji).toEqual({
      id: "123456789012345678",
    });
  });

  it("edits missing thumbnail, gallery and file URLs in place", () => {
    const message: DiscordMessagePayload = {
      flags: 32768,
      components: [
        {
          type: 9,
          components: [{ type: 10, content: "Photo" }],
          accessory: { type: 11, media: { url: "" } },
        },
        { type: 12, items: [{ media: { url: "" } }] },
        { type: 13, file: { url: "" } },
      ],
    };
    flushSync(() => root.render(<Harness initial={message} />));
    const thumbnail = host.querySelector<HTMLElement>(
      '.discord-thumbnail[role="button"]',
    )!;
    expect(thumbnail.getAttribute("aria-label")).toBe("Image URL");
    flushSync(() => thumbnail.click());
    const address = document.querySelector<HTMLInputElement>(
      '[role="dialog"][aria-label="Image URL"] input',
    )!;
    input(address, "https://example.test/photo.png");
    expect(nodeAt(current, ["components", 0, "accessory"])?.media).toEqual({
      url: "https://example.test/photo.png",
    });
    flushSync(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    flushSync(() =>
      host
        .querySelector<HTMLElement>('.discord-gallery-media[role="button"]')!
        .click(),
    );
    expect(host.querySelector(".node-mediaGallery.is-selected")).not.toBeNull();
    input(
      document.querySelector<HTMLInputElement>(
        '[role="dialog"][aria-label="Image URL"] input',
      )!,
      "https://example.test/gallery.png",
    );
    expect(
      (
        nodeAt(current, ["components", 1])?.items as {
          media: { url: string };
        }[]
      )[0]?.media.url,
    ).toBe("https://example.test/gallery.png");
    flushSync(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    flushSync(() =>
      host.querySelector<HTMLButtonElement>(".discord-file")!.click(),
    );
    expect(host.querySelector(".node-file.is-selected")).not.toBeNull();
    input(
      document.querySelector<HTMLInputElement>(
        '[role="dialog"][aria-label="Attachment URL"] input',
      )!,
      "attachment://file.png",
    );
    expect(nodeAt(current, ["components", 2])?.file).toEqual({
      url: "attachment://file.png",
    });
  });

  it("keeps gallery spoiler selection and undo tied to the chosen item", () => {
    const initial: DiscordMessagePayload = {
      flags: 32768,
      components: [
        {
          type: 12,
          items: [
            { media: { url: "https://example.test/one.png" } },
            { media: { url: "https://example.test/two.png" } },
          ],
        },
      ],
    };
    flushSync(() => root.render(<UndoHarness initial={initial} />));
    const toggles = host.querySelectorAll<HTMLButtonElement>(
      ".gallery-spoiler-control",
    );
    expect(toggles).toHaveLength(2);
    flushSync(() => toggles[1].click());
    expect(host.querySelector(".node-mediaGallery.is-selected")).not.toBeNull();
    expect(
      (nodeAt(current, ["components", 0])?.items as { spoiler?: boolean }[])[1]
        .spoiler,
    ).toBe(true);
    flushSync(() => button("Undo", host).click());
    expect(
      (nodeAt(current, ["components", 0])?.items as { spoiler?: boolean }[])[1]
        .spoiler,
    ).toBeUndefined();
  });

  it("edits Legacy embed media from the canvas instead of Configure", () => {
    flushSync(() =>
      root.render(<Harness initial={{ embeds: [{ title: "Hello" }] }} />),
    );
    flushSync(() => button("Thumbnail URL", host).click());
    input(
      document.querySelector<HTMLInputElement>(
        '[role="dialog"][aria-label="Thumbnail URL"] input',
      )!,
      "https://example.test/thumb.png",
    );
    expect(
      (current.embeds as { thumbnail?: { url: string } }[])[0].thumbnail,
    ).toEqual({
      url: "https://example.test/thumb.png",
    });
    flushSync(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    flushSync(() => button("Image URL", host).click());
    input(
      document.querySelector<HTMLInputElement>(
        '[role="dialog"][aria-label="Image URL"] input',
      )!,
      "https://example.test/image.png",
    );
    expect((current.embeds as { image?: { url: string } }[])[0].image).toEqual({
      url: "https://example.test/image.png",
    });
  });

  it("toggles Button disabled state directly on its node", () => {
    flushSync(() =>
      root.render(
        <Harness
          initial={{
            flags: 32768,
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 5,
                    label: "Open",
                    url: "https://example.test",
                  },
                ],
              },
            ],
          }}
        />,
      ),
    );
    const toggle = button("Disabled", host);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    flushSync(() => toggle.click());
    expect(nodeAt(current, ["components", 0, "components", 0])?.disabled).toBe(
      true,
    );
    expect(button("Disabled", host).getAttribute("aria-pressed")).toBe("true");
  });

  it("rejects malformed emoji, accepts optional colors and preserves one mixed field array", () => {
    const poll = {
      question: { text: "Question" },
      answers: [
        { poll_media: { text: "Yes", emoji: { id: 12 } } },
        { poll_media: { text: "No" } },
      ],
    };
    expect(
      validateMessage({ poll }).some((issue) => issue.code === "invalidEmoji"),
    ).toBe(true);
    expect(
      validateMessage({
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: null,
            components: [{ type: 10, content: "Text" }],
          },
        ],
      }),
    ).toEqual([]);
    const moved = moveListItem(richLegacy, ["embeds", 0, "fields"], 0, 3);
    expect(
      (
        nodeAt(moved, ["embeds", 0]) as { fields: { name: string }[] }
      ).fields.map((field) => field.name),
    ).toEqual(["B", "C", "D", "A", "E", "F", "G"]);
  });
});

describe("inline delimiter editing", () => {
  function edit(source: string) {
    flushSync(() => root.render(<Harness initial={{ content: source }} />));
    flushSync(() =>
      host.querySelector<HTMLElement>('[role="textbox"]')!.click(),
    );
    return host.querySelector<HTMLElement>('[contenteditable="true"]')!;
  }
  function before(
    element: HTMLElement,
    inputType: string,
    data: string | null = null,
    isComposing = false,
  ) {
    const event = new InputEvent("beforeinput", {
      inputType,
      data,
      bubbles: true,
      cancelable: true,
      isComposing,
    });
    flushSync(() => element.dispatchEvent(event));
    return event.defaultPrevented;
  }
  it.each(["{", ":"])(
    "removes only a freshly generated empty %s pair",
    (opening) => {
      const field = edit("");
      expect(before(field, "insertText", opening)).toBe(true);
      expect(current.content).toBe(opening === "{" ? "{}" : "::");
      expect(before(field, "deleteContentBackward")).toBe(true);
      expect(current.content).toBe("");
    },
  );
  it("leaves literal pairs, moved cursors and composition to normal text editing", () => {
    const field = edit("{}");
    const range = document.createRange();
    const leaf = field.querySelector("[data-source-start]")!.firstChild!;
    range.setStart(leaf, 1);
    range.collapse(true);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    expect(before(field, "deleteContentBackward")).toBe(true);
    expect(before(field, "insertText", "{", true)).toBe(false);
    expect(field.textContent).toBe("}");
    field.textContent = "";
    flushSync(() =>
      field.dispatchEvent(new InputEvent("input", { bubbles: true })),
    );
    expect(before(field, "insertText", "{")).toBe(true);
    flushSync(() =>
      field.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      ),
    );
    expect(before(field, "deleteContentBackward")).toBe(true);
    expect(field.textContent).toBe("}");
  });
  it("opens the shared emoji picker from a colon and inserts Unicode without losing the field", async () => {
    const field = edit("");
    before(field, "insertText", ":");
    const search = document.querySelector<HTMLInputElement>(
      '.inline-emoji-menu input[type="search"]',
    )!;
    flushSync(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(search, "cat");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await vi.waitFor(() =>
      expect(
        document.querySelector(
          '.inline-emoji-menu button[aria-label="cat face"]',
        ),
      ).not.toBeNull(),
    );
    const choice = document.querySelector<HTMLButtonElement>(
      '.inline-emoji-menu button[aria-label="cat face"]',
    )!;
    expect(host.contains(choice)).toBe(false);
    flushSync(() => choice.focus());
    expect(field.isConnected).toBe(true);
    flushSync(() => choice.click());
    expect(current.content).toBe("🐱");
    expect(document.querySelector(".inline-emoji-menu")).toBeNull();
    expect(document.activeElement).toBe(field);
  });
});
