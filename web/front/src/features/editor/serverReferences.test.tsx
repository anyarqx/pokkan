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
  return <ServerReferencesContext.Provider value={[
    { id: "2001", name: "general", kind: "channel" },
    { id: "3001", name: "Moderators", kind: "role" },
  ]}>
    <InlineField actions={actions} field="content" format="message" message multiline value={text} />
  </ServerReferencesContext.Provider>;
}

describe("server references in the message editor", () => {
  it("searches available channels by name and stores Discord mention syntax", () => {
    flushSync(() => root.render(<Harness />));
    flushSync(() => host.querySelector<HTMLElement>("[role=textbox]")!.click());
    const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
    flushSync(() => {
      editor.textContent = "<#gen";
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
    expect(host.querySelector("[role=listbox]")?.textContent).toContain("general");
    flushSync(() => host.querySelector<HTMLElement>("[role=option]")!.click());
    expect(value).toBe("<#2001>");
  });

  it("offers a direct role action and inserts a role reference", () => {
    flushSync(() => root.render(<Harness />));
    flushSync(() => host.querySelector<HTMLElement>("[role=textbox]")!.click());
    flushSync(() => host.querySelector<HTMLButtonElement>('[aria-label="Insert role reference"]')!.click());
    expect(host.querySelector("[role=listbox]")?.textContent).toContain("Moderators");
    flushSync(() => host.querySelector<HTMLElement>("[role=option]")!.click());
    expect(value).toBe("<@&3001>");
  });
});
