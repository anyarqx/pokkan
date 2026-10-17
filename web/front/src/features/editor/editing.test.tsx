// @vitest-environment jsdom
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import { InlineField } from "./InlineField";
import type { CanvasActions } from "./EditorCanvas";
import {
  ServerReferencesContext,
  type ServerReference,
} from "./serverReferences";
import { useDocumentEditor, type DocumentEditor } from "./useDocumentEditor";
import { setMessageField } from "./tree";
import {
  restoreMarkdownSelection,
  restoreSelection,
  selectionOffsets,
  sourceOffset,
} from "./textSelection";
import { emojiBindings, resolveEmojiNames } from "./emojiAuthoring";
import { EmojiInput } from "./QuickControls";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let editor: DocumentEditor;
const persist = vi.fn();
let refs: readonly ServerReference[] = [];
function Harness({
  initial = "Hello **world**",
  format = "message",
}: {
  initial?: string;
  format?: "message" | "inline" | null;
}) {
  const [saved, setSaved] = useState({ content: initial });
  editor = useDocumentEditor("draft", saved, (next) => {
    persist(next);
    setSaved(next as typeof saved);
  });
  const actions = {
    beginEdit: editor.beginEdit,
    endEdit: editor.endEdit,
    undo: editor.undo,
    redo: editor.redo,
    updateMessage: (field: string, value: string) =>
      editor.change(setMessageField(editor.document, field, value), "edit"),
  } as CanvasActions;
  return (
    <ServerReferencesContext.Provider value={refs}>
      <InlineField
        actions={actions}
        message
        field="content"
        format={format ?? undefined}
        value={String(editor.document.content)}
      />
    </ServerReferencesContext.Provider>
  );
}
beforeEach(async () => {
  await i18n.changeLanguage("en");
  refs = [];
  persist.mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
function open(initial?: string) {
  flushSync(() => root.render(<Harness initial={initial} />));
  flushSync(() => host.querySelector<HTMLElement>(".inline-preview")!.click());
  return host.querySelector<HTMLElement>("[contenteditable]")!;
}
function type(field: HTMLElement, text: string) {
  flushSync(() => {
    field.textContent = text;
    restoreSelection(field, text.length, text.length);
    field.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
}
function nativeType(field: HTMLElement, text: string) {
  for (const character of text)
    flushSync(() =>
      field.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: character,
        }),
      ),
    );
}
function arrow(field: HTMLElement, key: string, shiftKey = false) {
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        shiftKey,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
}
it("moves across both code fence boundaries without trapping the caret or changing the source", () => {
  const source = "```js\nhello\n```";
  const field = open(source);
  restoreMarkdownSelection(field, 11, 11, source);
  arrow(field, "ArrowRight");
  expect(window.getSelection()!.focusNode).toBe(
    field.querySelector(".discord-markdown"),
  );
  expect(window.getSelection()!.focusOffset).toBe(1);
  arrow(field, "ArrowLeft");
  expect(
    field.querySelector("pre")!.contains(window.getSelection()!.focusNode),
  ).toBe(true);
  restoreMarkdownSelection(field, 6, 6, source);
  arrow(field, "ArrowLeft");
  expect(window.getSelection()!.focusNode).toBe(
    field.querySelector(".discord-markdown"),
  );
  expect(window.getSelection()!.focusOffset).toBe(0);
  arrow(field, "ArrowRight");
  nativeType(field, "new ");
  expect(editor.document.content).toBe("```js\nnew hello\n```");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe(source);
});

it.each([
  "**Hello**",
  "__Hello__",
  "*Hello*",
  "_Hello_",
  "***Hello***",
  "___Hello___",
  "~~Hello~~",
  "||Hello||",
  "`Hello`",
  "**a __b__ c**",
  "****",
  "____",
  "C:\\notes\\draft",
  "\\**",
  "\\\\**literal**",
  "\\# literal \\_text\\_",
])("maps every editable source position, including visible delimiters (%s)", source => {
  const field = open(source);
  expect(field.textContent).toBe(source);
  for (let offset = 0; offset <= source.length; offset++) {
    restoreMarkdownSelection(field, offset, offset, source);
    const range = window.getSelection()!.getRangeAt(0);
    expect(sourceOffset(field,range.startContainer,range.startOffset,source)).toBe(offset);
  }
  restoreMarkdownSelection(field, 0, 1, source);
  nativeType(field, "");
  flushSync(() => field.dispatchEvent(new InputEvent("beforeinput", {inputType:"deleteContentBackward",bubbles:true,cancelable:true})));
  expect(editor.document.content).toBe(source.slice(1));
});
it("extends a selection across a closing code fence and preserves surrounding content when replacing it", () => {
  const source = "```\nhello\n```\nAfter";
  const field = open(source);
  restoreMarkdownSelection(field, 4, 9, source);
  arrow(field, "ArrowRight", true);
  expect(window.getSelection()!.toString()).toBe("hello");
  nativeType(field, "Changed");
  expect(editor.document.content).toBe("Changed\nAfter");
});
it("exits a code-only field vertically and inserts a new paragraph after it", () => {
  const source = "```\nhello\n```";
  const field = open(source);
  restoreMarkdownSelection(field, 9, 9, source);
  arrow(field, "ArrowDown");
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  nativeType(field, "After");
  expect(editor.document.content).toBe(source + "\nAfter");
});
it("formats native typing in place and removes the complete Markdown source with Select All", () => {
  const field = open("");
  nativeType(field, "**Mars** horizon");
  expect(editor.document.content).toBe("**Mars** horizon");
  expect(field.querySelector("strong")?.textContent).toBe("Mars");
  const range = document.createRange();
  range.selectNodeContents(field);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  flushSync(() =>
    field.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "deleteContentBackward",
      }),
    ),
  );
  expect(editor.document.content).toBe("");
  nativeType(field, "新しい文章");
  expect(editor.document.content).toBe("新しい文章");
  expect(field.textContent).toBe("新しい文章");
});
it("selects the whole Markdown source with Ctrl+A without treating every full-word selection as Select All", () => {
  const field = open("# **Evening**");
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "a",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  nativeType(field, "Morning");
  expect(editor.document.content).toBe("Morning");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("# **Evening**");
});
it("places the caret on a new empty line so native Backspace removes the break rather than the previous letter", () => {
  const field = open("First\nSecond");
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  const empty = field.querySelector("p:last-child")!;
  const selection = window.getSelection()!.getRangeAt(0);
  expect(empty.contains(selection.startContainer)).toBe(true);
  const previous = empty.previousElementSibling!.querySelector(
    "[data-source-start]",
  )!.firstChild!;
  const deletion = new InputEvent("beforeinput", {
    inputType: "deleteContentBackward",
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(deletion, "getTargetRanges", {
    value: () => [
      {
        startContainer: previous,
        startOffset: previous.textContent!.length,
        endContainer: empty,
        endOffset: 0,
      },
    ],
  });
  flushSync(() => field.dispatchEvent(deletion));
  nativeType(field, "!");
  expect(editor.document.content).toBe("First\nSecond!");
});
it.each(["**bold**", "*italic*", "__**nested**__", "`code`"])(
  "joins the following line without consuming hidden formatting (%s)",
  (styled) => {
    const source = `${styled}\nNext`;
    const field = open(source);
    const paragraphs = field.querySelectorAll("p");
    const walker = document.createTreeWalker(
      paragraphs[0],
      NodeFilter.SHOW_TEXT,
    );
    let last = walker.nextNode()!;
    while (walker.nextNode()) last = walker.currentNode;
    const next = paragraphs[1].querySelector("span")!.firstChild!;
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.setStart(next, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    const deletion = new InputEvent("beforeinput", {
      inputType: "deleteContentBackward",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(deletion, "getTargetRanges", {
      value: () => [
        {
          startContainer: last,
          startOffset: last.textContent!.length,
          endContainer: next,
          endOffset: 0,
        },
      ],
    });
    flushSync(() => field.dispatchEvent(deletion));
    expect(editor.document.content).toBe(`${styled}Next`);
    nativeType(field, "!");
    expect(editor.document.content).toBe(`${styled}!Next`);
    flushSync(() => editor.undo());
    expect(editor.document.content).toBe(source);
  },
);
it("joins a formatted next line with forward Delete without removing its opening markers", () => {
  const source = "First\n**Next**";
  const field = open(source);
  const first = field.querySelector("p span")!.firstChild!;
  const next = field.querySelector("p:last-child .markdown-delimiter")!.firstChild!;
  restoreMarkdownSelection(field, 5, 5, source);
  const deletion = new InputEvent("beforeinput", {
    inputType: "deleteContentForward",
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(deletion, "getTargetRanges", {
    value: () => [
      {
        startContainer: first,
        startOffset: 5,
        endContainer: next,
        endOffset: 0,
      },
    ],
  });
  flushSync(() => field.dispatchEvent(deletion));
  expect(editor.document.content).toBe("First**Next**");
});
it("selects, copies and removes an entire fenced block without leaving its delimiters behind", () => {
  const source = "Before\n```js\nconst value = 1;\n```\nAfter";
  const field = open(source);
  // Select exactly the code body using its rendered text, as with a pointer drag.
  const body = field.querySelector("code")!;
  const range = document.createRange();
  range.selectNodeContents(body);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  const setData = vi.fn();
  const copy = new Event("copy", { bubbles: true, cancelable: true });
  Object.defineProperty(copy, "clipboardData", { value: { setData } });
  flushSync(() => field.dispatchEvent(copy));
  expect(setData).toHaveBeenCalledWith(
    "text/plain",
    "```js\nconst value = 1;\n```",
  );
  flushSync(() =>
    field.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "deleteContentBackward",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(editor.document.content).toBe("Before\n\nAfter");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe(source);
});
it("keeps the final code line editable and toggles a language-tagged block through the formatting tool", () => {
  const source = "```js\nconst value = 1;\n```";
  const field = open(source);
  const end = source.indexOf(";\n") + 1;
  flushSync(() =>
    field.dispatchEvent(new Event("pointerdown", { bubbles: true })),
  );
  restoreMarkdownSelection(field, end, end, source);
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  nativeType(field, "next");
  expect(editor.document.content).toBe("```js\nconst value = 1;\nnext\n```");
  expect(field.querySelector("code")?.textContent).toBe(
    "const value = 1;\nnext",
  );
  const button = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Code block"]',
  )!;
  flushSync(() => button.click());
  expect(editor.document.content).toBe("const value = 1;\nnext");
  expect(document.activeElement).toBe(field);
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("```js\nconst value = 1;\nnext\n```");
});
it("cuts across a complete code block and following text without leaving a stray opening fence", () => {
  const source = "Before\n```js\nconst time = 1;\n```\nAfter";
  const field = open(source);
  flushSync(() =>
    field.dispatchEvent(new Event("pointerdown", { bubbles: true })),
  );
  restoreMarkdownSelection(
    field,
    source.indexOf("const"),
    source.length,
    source,
  );
  const setData = vi.fn();
  const cut = new Event("cut", { bubbles: true, cancelable: true });
  Object.defineProperty(cut, "clipboardData", { value: { setData } });
  flushSync(() => field.dispatchEvent(cut));
  expect(editor.document.content).toBe("Before\n");
  expect(setData).toHaveBeenCalledWith(
    "text/plain",
    "```js\nconst time = 1;\n```\nAfter",
  );
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe(source);
});
it("edits the selected repeated line after blank lines and quote/list prefixes", () => {
  const field = open("Repeat\n\nRepeat\n> Repeat\n- Repeat");
  const paragraphs = field.querySelectorAll("p");
  const text = paragraphs[2].querySelector("span")!.firstChild!;
  const range = document.createRange();
  range.setStart(text, 2);
  range.collapse(true);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  nativeType(field, "X");
  expect(editor.document.content).toBe("Repeat\n\nReXpeat\n> Repeat\n- Repeat");
});
it("does not reuse a canceled native event when a later input replaces the field", () => {
  const field = open("");
  nativeType(field, "First");
  type(field, "Replacement **text**");
  expect(editor.document.content).toBe("Replacement **text**");
  expect(field.textContent).toBe("Replacement **text**");
  nativeType(field, "!");
  expect(editor.document.content).toBe("Replacement **text**!");
});
it("resolves typed emoji delimiters once and leaves the next character outside the emoji", () => {
  refs = [{ kind: "emoji", id: "123456789", name: "star" }];
  const field = open("");
  nativeType(field, ":star: tonight");
  expect(editor.document.content).toBe("<:star:123456789> tonight");
  expect(field.querySelector("img")?.alt).toBe(":star:");
});
it("keeps reference completion separate from surrounding typing in undo history", () => {
  refs = [{ kind: "channel", id: "123456789", name: "stargazing" }];
  const field = open("Tonight ");
  nativeType(field, "#sta");
  flushSync(() =>
    document.querySelector<HTMLButtonElement>('[role="option"]')!.click(),
  );
  expect(editor.document.content).toBe("Tonight <#123456789>");
  nativeType(field, " bring a telescope");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Tonight <#123456789>");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Tonight #sta");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Tonight ");
});
it("starts a new undo group after a pause and after undoing while still typing", () => {
  let now = Date.now();
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const field = open("");
  nativeType(field, "Mars");
  now += 2000;
  nativeType(field, " tonight");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Mars");
  nativeType(field, " tomorrow");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Mars");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("");
});
it("uses document history for native undo and redo actions while editing", () => {
  const field = open("Hello **world**");
  nativeType(field, " tonight");
  for (const [inputType, expected] of [
    ["historyUndo", "Hello **world**"],
    ["historyRedo", "Hello **world** tonight"],
  ]) {
    const event = new InputEvent("beforeinput", {
      inputType,
      bubbles: true,
      cancelable: true,
    });
    flushSync(() => field.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(editor.document.content).toBe(expected);
    expect(field.querySelector("strong")?.textContent).toBe("world");
  }
});
it("preserves Markdown around a native non-cancelable text replacement", () => {
  const field = open("Hello **world**");
  restoreMarkdownSelection(field, 8, 13, "Hello **world**");
  flushSync(() =>
    field.dispatchEvent(
      new InputEvent("beforeinput", {
        inputType: "insertReplacementText",
        data: "Mars",
        bubbles: true,
      }),
    ),
  );
  expect(editor.document.content).toBe("Hello **world**");
  flushSync(() => {
    field.querySelector("strong")!.textContent = "Mars";
    field.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
  expect(editor.document.content).toBe("Hello **Mars**");
  expect(field.querySelector("strong")?.textContent).toBe("Mars");
});
it("uses the spell checker's replacement range rather than inserting corrected text at the caret", () => {
  const field = open("Hello **wrold** tonight");
  const word = field.querySelector("strong span")!.firstChild!;
  const event = new InputEvent("beforeinput", {
    inputType: "insertReplacementText",
    data: "world",
    bubbles: true,
  });
  Object.defineProperty(event, "getTargetRanges", {
    value: () => [
      {
        startContainer: word,
        startOffset: 0,
        endContainer: word,
        endOffset: 5,
      },
    ],
  });
  flushSync(() => field.dispatchEvent(event));
  flushSync(() => {
    word.textContent = "world";
    field.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
  expect(editor.document.content).toBe("Hello **world** tonight");
});
it.each(["```\n```", "> ```\n> ```"])(
  "keeps the insertion point inside an empty code block (%s)",
  (source) => {
    const field = open(source);
    flushSync(() =>
      field.dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    const range = document.createRange();
    range.selectNodeContents(field.querySelector("code")!);
    range.collapse(true);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    nativeType(field, "hello");
    expect(field.querySelector("code")?.textContent).toBe("hello");
    expect(editor.document.content).toContain("hello```");
  },
);
it("maps quoted code lines to their actual source without rewriting quote prefixes", () => {
  const source = "> ```txt\n> hello\n> world\n> ```";
  const field = open(source);
  const start = source.indexOf("world") + 1;
  restoreMarkdownSelection(field, start, start, source);
  const selected = window.getSelection()!.getRangeAt(0);
  expect(
    sourceOffset(field, selected.startContainer, selected.startOffset, source),
  ).toBe(start);
  nativeType(field, "X");
  expect(editor.document.content).toBe(source.replace("world", "wXorld"));
});
it("creates a rendered code block from a selection in the middle of a paragraph", () => {
  const field = open("Before const value = 1; after");
  restoreSelection(field, 7, 23);
  flushSync(() =>
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Code block"]')!
      .click(),
  );
  expect(editor.document.content).toBe(
    "Before \n```\nconst value = 1;\n```\n after",
  );
  expect(field.querySelector("code")?.textContent).toBe("const value = 1;");
  expect(window.getSelection()!.toString()).toBe("const value = 1;");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Before const value = 1; after");
});
it("keeps an inline-code caret at the chosen character rather than one character ahead", () => {
  const source = "`hello` outside";
  const field = open(source);
  restoreMarkdownSelection(field, 2, 2, source);
  const selected = window.getSelection()!.getRangeAt(0);
  expect(
    sourceOffset(field, selected.startContainer, selected.startOffset, source),
  ).toBe(2);
  nativeType(field, "X");
  expect(editor.document.content).toBe("`hXello` outside");
});
it.each(["```js\nconst value = 1;\n```", "> ```js\n> const value = 1;\n> ```"])(
  "keeps Enter and further typing inside a selected code line (%s)",
  (source) => {
    const field = open(source);
    const cursor = source.indexOf("value");
    restoreMarkdownSelection(field, cursor, cursor, source);
    flushSync(() =>
      field.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(document.activeElement).toBe(field);
    nativeType(field, "next");
    expect(editor.document.content).toBe(
      source.slice(0, cursor) + "\nnext" + source.slice(cursor),
    );
    expect(host.querySelector("[contenteditable]")).toBe(field);
  },
);
it("accepts a server emoji by name in EmojiInput and explains an unavailable name without clearing the existing value", () => {
  const change = vi.fn();
  flushSync(() =>
    root.render(
      <ServerReferencesContext.Provider
        value={[
          { kind: "emoji", id: "123456789", name: "star", animated: true },
        ]}
      >
        <EmojiInput value={undefined} change={change} />
      </ServerReferencesContext.Provider>,
    ),
  );
  const input = host.querySelector<HTMLInputElement>(
    'input[aria-label="Emoji"]',
  )!;
  const set = (text: string) =>
    flushSync(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  set(":star:");
  flushSync(() =>
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  expect(change).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: "123456789", name: "star", animated: true }),
  );
  const calls = change.mock.calls.length;
  set(":missing:");
  flushSync(() =>
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(host.textContent).toContain(i18n.t("editor.emojiUnavailable"));
  expect(change).toHaveBeenCalledTimes(calls);
});
it("keeps Markdown rendered in the active message without replacing its editable root or selection", () => {
  const field = open();
  type(field, "Hello **Mars**\n- Bring a telescope");
  expect(field.querySelector("strong")?.textContent).toBe("Mars");
  expect(field.querySelector("li")?.textContent).toBe("Bring a telescope");
  expect(host.querySelector("[contenteditable]")).toBe(field);
  expect(selectionOffsets(field)?.start).toBe(field.textContent!.length);
  expect(editor.document.content).toBe("Hello **Mars**\n- Bring a telescope");
});
it.each(["message", "inline"] as const)(
  "keeps Enter inside formatted text (%s)",
  (format) => {
    flushSync(() => root.render(<Harness initial="First" format={format} />));
    flushSync(() =>
      host.querySelector<HTMLElement>(".inline-preview")!.click(),
    );
    const field = host.querySelector<HTMLElement>("[contenteditable]")!;
    flushSync(() =>
      field.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    nativeType(field, "Second");
    expect(editor.document.content).toBe("First\nSecond");
    expect(document.activeElement).toBe(field);
    expect(host.querySelector("[contenteditable]")).toBe(field);
  },
);
it("finishes editing without retaining unmanaged text beside the rendered preview", () => {
  const field = open("Hello **world**");
  nativeType(field, " tonight");
  flushSync(() => field.blur());
  const preview = host.querySelector<HTMLElement>(".inline-preview")!;
  expect(preview.textContent).toBe("Hello world tonight");
  expect(host.textContent).toBe("Hello world tonight");
  flushSync(() => preview.click());
  expect(host.querySelector("[contenteditable]")?.textContent).toBe(
    "Hello **world** tonight",
  );
});
it("formats a partial selection and restores it through document undo and redo", () => {
  const field = open("Hello world");
  restoreSelection(field, 6, 11);
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }),
    ),
  );
  expect(editor.document.content).toBe("Hello **world**");
  expect(window.getSelection()!.toString()).toBe("world");
  expect(selectionOffsets(field)).toEqual({ start: 8, end: 13 });
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }),
    ),
  );
  expect(editor.document.content).toBe("Hello world");
  expect(field.textContent).toBe("Hello world");
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    ),
  );
  expect(field.querySelector("strong")?.textContent).toBe("world");
});
it("keeps Japanese composition untouched and commits the final text without formatting shortcuts", () => {
  const field = open("");
  flushSync(() =>
    field.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  type(field, "にほん");
  const node = field.firstChild;
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
      }),
    ),
  );
  expect(field.firstChild).toBe(node);
  type(field, "日本語");
  flushSync(() =>
    field.dispatchEvent(
      new CompositionEvent("compositionend", { data: "日本語", bubbles: true }),
    ),
  );
  expect(editor.document.content).toBe("日本語");
  expect(field.textContent).toBe("日本語");
});
it("restores the rendered field after cancelling composition without adding a history entry", () => {
  const field = open("**Mars** tonight");
  flushSync(() =>
    field.dispatchEvent(new Event("pointerdown", { bubbles: true })),
  );
  restoreMarkdownSelection(field, 4, 4, "**Mars** tonight");
  flushSync(() =>
    field.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  field.querySelector("strong span")!.textContent = "Maにほんrs";
  flushSync(() =>
    field.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true }),
    ),
  );
  flushSync(() =>
    field.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "" }),
    ),
  );
  expect(field.querySelector("strong")?.textContent).toBe("Mars");
  expect(editor.document.content).toBe("**Mars** tonight");
  expect(editor.canUndo).toBe(false);
  nativeType(field, "!");
  expect(editor.document.content).toBe("**Ma!rs** tonight");
});
it("commits composition once when focus leaves the field and closes its editing controls afterward", () => {
  const field = open("");
  flushSync(() =>
    field.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    ),
  );
  type(field, "日本語");
  flushSync(() => field.blur());
  flushSync(() =>
    field.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "日本語" }),
    ),
  );
  expect(editor.document.content).toBe("日本語");
  expect(host.querySelector("[contenteditable]")).toBeNull();
  expect(document.querySelector('[role="toolbar"]')).toBeNull();
  expect(host.textContent).toBe("日本語");
});
it.each(["**星**", "```txt\n星\n```"])(
  "does not repeat an IME commit or remove closing syntax on its final input (%s)",
  (source) => {
    const field = open(source);
    const cursor = source.indexOf("星");
    flushSync(() =>
      field.dispatchEvent(new Event("pointerdown", { bubbles: true })),
    );
    restoreMarkdownSelection(field, cursor, cursor + 1, source);
    flushSync(() =>
      field.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      ),
    );
    flushSync(() =>
      field.dispatchEvent(
        new CompositionEvent("compositionend", {
          data: "日本語",
          bubbles: true,
        }),
      ),
    );
    const next = source.replace("星", "日本語");
    expect(editor.document.content).toBe(next);
    flushSync(() =>
      field.dispatchEvent(
        new InputEvent("input", {
          data: "日本語",
          inputType: "insertText",
          bubbles: true,
        }),
      ),
    );
    expect(editor.document.content).toBe(next);
    expect(field.textContent).toBe(source.startsWith("**") ? "**日本語**" : "日本語");
  },
);
it("keeps a partial selection through unrelated renders and applies the toolbar to that selection", () => {
  const field = open("Hello world");
  restoreSelection(field, 6, 11);
  flushSync(() => root.render(<Harness />));
  expect(window.getSelection()!.toString()).toBe("world");
  const bold = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Bold"]',
  )!;
  flushSync(() => {
    bold.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    bold.click();
  });
  expect(editor.document.content).toBe("Hello **world**");
  expect(window.getSelection()!.toString()).toBe("world");
  nativeType(field, "Mars");
  expect(editor.document.content).toBe("Hello **Mars**");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Hello **world**");
});
it("retains the direction of a backward selection when formatting it", () => {
  const field = open("Hello world");
  const text = field.querySelector("p span")!.firstChild!;
  window.getSelection()!.setBaseAndExtent(text, 11, text, 6);
  flushSync(() =>
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Bold"]')!
      .click(),
  );
  expect(window.getSelection()!.toString()).toBe("world");
  const selected = window.getSelection()!;
  expect(
    sourceOffset(
      field,
      selected.anchorNode!,
      selected.anchorOffset,
      String(editor.document.content),
    ),
  ).toBe(13);
  expect(
    sourceOffset(
      field,
      selected.focusNode!,
      selected.focusOffset,
      String(editor.document.content),
    ),
  ).toBe(8);
  nativeType(field, "Mars");
  expect(editor.document.content).toBe("Hello **Mars**");
});
it("returns focus and the source selection to the field after choosing a text style by keyboard", () => {
  const field = open("Evening program");
  restoreSelection(field, 0, 7);
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Text style"]',
  )!;
  flushSync(() => {
    trigger.focus();
    trigger.click();
  });
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  expect(menu.contains(document.activeElement)).toBe(true);
  flushSync(() => (document.activeElement as HTMLButtonElement).click());
  expect(editor.document.content).toBe("# Evening program");
  expect(document.activeElement).toBe(field);
  expect(window.getSelection()!.toString()).toBe("Evening");
  nativeType(field, "Morning");
  expect(editor.document.content).toBe("# Morning program");
});
it("uses the same caret-preserving input flow for plain labels without interpreting Markdown", () => {
  flushSync(() => root.render(<Harness initial="Hello world" format={null} />));
  const field = host.querySelector<HTMLElement>("[contenteditable]")!;
  flushSync(() => field.focus());
  restoreSelection(field, 6, 11);
  nativeType(field, "**Mars**");
  expect(editor.document.content).toBe("Hello **Mars**");
  expect(field.textContent).toBe("Hello **Mars**");
  expect(field.querySelector("strong")).toBeNull();
  restoreSelection(field, 3, 3);
  const paste = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(paste, "clipboardData", {
    value: { getData: () => "a\nb" },
  });
  flushSync(() => field.dispatchEvent(paste));
  expect(editor.document.content).toBe("Hela blo **Mars**");
  flushSync(() =>
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(document.activeElement).not.toBe(field);
});
it("does not restore an old plain label over a native replacement starting during focus", () => {
  flushSync(() =>
    root.render(<Harness initial="Open example" format={null} />),
  );
  const field = host.querySelector<HTMLElement>("[contenteditable]")!;
  flushSync(() => {
    field.focus();
    field.textContent = "";
  });
  expect(field.textContent).toBe("");
  flushSync(() => {
    field.append(document.createTextNode("Event details"));
    field.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: "Event details",
      }),
    );
  });
  expect(editor.document.content).toBe("Event details");
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Open example");
});
it("keeps a pointer-positioned caret when a plain label first receives focus", () => {
  flushSync(() =>
    root.render(<Harness initial="Open example" format={null} />),
  );
  const field = host.querySelector<HTMLElement>("[contenteditable]")!;
  flushSync(() => {
    field.focus();
    restoreSelection(field, 5, 5);
  });
  nativeType(field, "another ");
  expect(editor.document.content).toBe("Open another example");
});
it("pastes multiline text over a selection as literal text and makes the operation undoable", () => {
  const field = open("Hello world");
  restoreSelection(field, 6, 11);
  const paste = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(paste, "clipboardData", {
    value: { getData: () => "Mars\n<script>alert(1)</script>" },
  });
  flushSync(() => field.dispatchEvent(paste));
  expect(editor.document.content).toBe("Hello Mars\n<script>alert(1)</script>");
  expect(host.querySelector("script")).toBeNull();
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("Hello world");
});
it("resolves a unique server name while retaining readable authoring and explicit IDs across context changes", () => {
  refs = [{ kind: "emoji", id: "123456789", name: "star", animated: true }];
  const field = open("");
  type(field, ":star:");
  expect(editor.document.content).toBe("<a:star:123456789>");
  expect(field.querySelector<HTMLImageElement>("img")?.alt).toBe(":star:");
  expect(field.querySelector<HTMLImageElement>("img")?.src).toContain(
    "123456789.webp?size=64&animated=true",
  );
  refs = [{ kind: "emoji", id: "987654321", name: "star" }];
  flushSync(() => root.render(<Harness />));
  type(field, ":star: tonight");
  expect(editor.document.content).toBe("<a:star:123456789> tonight");
});
it("leaves ambiguous, unknown names and code literal, and preserves imported emoji without its server", () => {
  const duplicates = [
    { id: "123", name: "star" },
    { id: "456", name: "star" },
  ];
  expect(resolveEmojiNames(":star: :missing:", new Map(), duplicates)).toBe(
    ":star: :missing:",
  );
  expect(
    resolveEmojiNames(
      "`:star:`\n```\n:star:\n```",
      new Map(),
      duplicates.slice(0, 1),
    ),
  ).toBe("`:star:`\n```\n:star:\n```");
  const imported = emojiBindings("Look <:star:123>");
  expect(resolveEmojiNames("Look :star:", imported, [])).toBe(
    "Look <:star:123>",
  );
  expect(
    resolveEmojiNames("```\n:star:", new Map(), duplicates.slice(0, 1)),
  ).toBe("```\n:star:");
  expect(resolveEmojiNames("\\:star:", new Map(), duplicates.slice(0, 1))).toBe(
    "\\:star:",
  );
  for (const literal of ["[Read](https://example.test/:star:)", "![Image](https://example.test/:star:)", "https://example.test/:star:", "<https://example.test/:star:>", "`literal :star:`", "<:star:999>", "\\:star:"]) {
    expect(resolveEmojiNames(literal,new Map(),duplicates.slice(0,1))).toBe(literal);
  }
  expect(resolveEmojiNames("[:star:](https://example.test/:star:)",new Map(),duplicates.slice(0,1))).toBe("[<:star:123>](https://example.test/:star:)");
});
it("separates typing sessions from structural changes in undo history", () => {
  const field = open("First");
  type(field, "First edit");
  flushSync(() =>
    editor.change({ ...editor.document, embeds: [{ title: "Observation" }] }),
  );
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("First edit");
  expect(editor.document.embeds).toBeUndefined();
  flushSync(() => editor.undo());
  expect(editor.document.content).toBe("First");
});
