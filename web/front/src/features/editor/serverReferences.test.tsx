// @vitest-environment jsdom
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import type { CanvasActions } from "./EditorCanvas";
import { InlineField } from "./InlineField";
import { ServerReferencesContext } from "./serverReferences";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let value: string;

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

function Harness() {
  const [text, setText] = useState("");
  value = text;
  const actions = {
    beginEdit: vi.fn(),
    endEdit: vi.fn(),
    updateMessage: (_field: string, next: string) => setText(next),
  } as unknown as CanvasActions;
  return (
    <ServerReferencesContext.Provider
      value={[
        { id: "2001", name: "general", kind: "channel" },
        { id: "2002", name: "Community category", kind: "channel" },
        { id: "2003", name: "Lounge voice", kind: "channel" },
        { id: "3001", name: "Moderators", kind: "role" },
        { id: "3002", name: "C++ developers", kind: "role" },
        { id: "2004", name: "📣-news", kind: "channel" },
        { id: "4001", name: "wave", kind: "emoji", animated: true },
      ]}
    >
      <InlineField
        actions={actions}
        field="content"
        format="message"
        message
        multiline
        value={text}
      />
    </ServerReferencesContext.Provider>
  );
}

describe("server references in the message editor", () => {
  it("updates suggestions when the caret moves instead of replacing the former token", () => {
    flushSync(() => root.render(<Harness />));
    flushSync(() => host.querySelector<HTMLElement>("[role=textbox]")!.click());
    const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
    flushSync(() => {
      editor.textContent = "@every";
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(
      document.getElementById(editor.getAttribute("aria-activedescendant")!)
        ?.textContent,
    ).toContain("everyone");
    flushSync(() => {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(true);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    expect(document.querySelector("[role=listbox]")).toBeNull();
    flushSync(() =>
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(value).toBe("\n@every");
  });

  it.each([
    ["<#gen", "general", "2001"],
    ["#gen", "general", "2001"],
    ["#Community", "Community category", "2002"],
    ["#Lounge", "Lounge voice", "2003"],
    ["#📣", "📣-news", "2004"],
  ])(
    "searches channels from %s and stores Discord mention syntax",
    (trigger, name, id) => {
      flushSync(() => root.render(<Harness />));
      flushSync(() =>
        host.querySelector<HTMLElement>("[role=textbox]")!.click(),
      );
      const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
      flushSync(() => {
        editor.textContent = trigger;
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
      });
      expect(document.querySelector("[role=listbox]")?.textContent).toContain(
        name,
      );
      flushSync(() =>
        document.querySelector<HTMLElement>("[role=option]")!.click(),
      );
      expect(value).toBe(`<#${id}>`);
    },
  );

  it.each(["everyone", "here"])("inserts literal @%s", (name) => {
    flushSync(() => root.render(<Harness />));
    flushSync(() => host.querySelector<HTMLElement>("[role=textbox]")!.click());
    const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
    flushSync(() => {
      editor.textContent = `@${name}`;
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    flushSync(() =>
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
      ),
    );
    expect(value).toBe(`@${name}`);
  });

  it.each([
    ["@Mod", "Moderators", "3001"],
    ["<@&Mod", "Moderators", "3001"],
    ["@C++", "C++ developers", "3002"],
  ])("finds roles from %s without suggesting users", (trigger, name, id) => {
    flushSync(() => root.render(<Harness />));
    flushSync(() => host.querySelector<HTMLElement>("[role=textbox]")!.click());
    const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
    flushSync(() => {
      editor.textContent = trigger;
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(document.querySelector("[role=listbox]")?.textContent).toContain(
      name,
    );
    flushSync(() =>
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(value).toBe(`<@&${id}>`);
  });

  it.each(["# Heading", "mail@example", "`#general"])(
    "keeps ordinary text and code literal (%s)",
    (text) => {
      flushSync(() => root.render(<Harness />));
      flushSync(() =>
        host.querySelector<HTMLElement>("[role=textbox]")!.click(),
      );
      const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
      flushSync(() => {
        editor.textContent = text;
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
      });
      expect(document.querySelector("[role=listbox]")).toBeNull();
      expect(value).toBe(text);
    },
  );

  it("inserts an animated server emoji from the same colon picker", () => {
    flushSync(() => root.render(<Harness />));
    flushSync(() => host.querySelector<HTMLElement>("[role=textbox]")!.click());
    const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
    flushSync(() =>
      editor.dispatchEvent(
        new InputEvent("beforeinput", {
          inputType: "insertText",
          data: ":",
          cancelable: true,
          bubbles: true,
        }),
      ),
    );
    const emoji = document.querySelector<HTMLButtonElement>(
      '.inline-emoji-menu button[aria-label="<a:wave:4001>"]',
    )!;
    expect(emoji.querySelector("img")?.src).toContain("animated=true");
    flushSync(() => emoji.click());
    expect(value).toBe("<a:wave:4001>");
  });

  it("searches a role by typing @ and inserts its fixed reference", () => {
    flushSync(() => root.render(<Harness />));
    flushSync(() => host.querySelector<HTMLElement>("[role=textbox]")!.click());
    const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
    for (const data of "@Mod")
      flushSync(() =>
        editor.dispatchEvent(
          new InputEvent("beforeinput", {
            inputType: "insertText",
            data,
            bubbles: true,
            cancelable: true,
          }),
        ),
      );
    expect(document.querySelector("[role=listbox]")?.textContent).toContain(
      "Moderators",
    );
    flushSync(() =>
      document.querySelector<HTMLElement>("[role=option]")!.click(),
    );
    expect(value).toBe("<@&3001>");
  });
});
