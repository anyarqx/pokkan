// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "../../app/i18n";
import { useState } from "react";
import { EditorCanvas, type CanvasActions } from "./EditorCanvas";
import { useDocumentEditor } from "./useDocumentEditor";
import type { DiscordMessagePayload } from "../kits/domain";

const initial: DiscordMessagePayload = {
  content: "before preview",
  embeds: [{ title: "An embed" }],
  attachments: [
    { id: "0", filename: "guide.pdf", description: "A visible attachment" },
  ],
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: "Continue", custom_id: "continue" },
      ],
    },
  ],
};

beforeEach(async () => { await i18n.changeLanguage("en"); });

const componentsV2Initial: DiscordMessagePayload = {
  flags: 32_768,
  components: [
    { type: 10, content: "V2 text remains visible" },
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: "Confirm", custom_id: "confirm" },
      ],
    },
  ],
};

describe("automatic preview/edit boundary (no manual mode switch)", () => {
  it("renders Legacy content as a live Discord preview at rest, and swaps to raw source only while focused", () => {
    const host = window.document.createElement("div");
    window.document.body.append(host);
    const root = createRoot(host);
    let snapshot:
      { document: DiscordMessagePayload; selected?: string } | undefined;

    flushSync(() =>
      root.render(
        <PreviewHarness
          report={(value) => {
            snapshot = value;
          }}
        />,
      ),
    );

    const contentPreview = host.querySelector<HTMLElement>(
      '[role="textbox"][aria-label="Message content"]:not([contenteditable])',
    );
    expect(contentPreview).not.toBeNull();
    expect(host.querySelector('[role="textbox"][contenteditable][aria-label="Message content"]')).toBeNull();
    expect(host.querySelector(".legacy-embed")?.textContent).toContain(
      "An embed",
    );
    expect(host.querySelector(".discord-button")?.textContent).toContain(
      "Continue",
    );
    expect(
      host.querySelector(".legacy-attachment-item")?.textContent,
    ).toContain("guide.pdf");

    // Clicking the preview enters edit mode automatically (no manual toggle).
    flushSync(() =>
      contentPreview!.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    const source = host.querySelector<HTMLElement>(
      '[role="textbox"][contenteditable][aria-label="Message content"]',
    );
    expect(source).not.toBeNull();
    flushSync(() => {
      source!.textContent = "unsaved-looking text {{user.name}}";
      source!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(snapshot?.document.content).toBe(
      "unsaved-looking text {{user.name}}",
    );
    expect(snapshot?.document.embeds).toEqual([{ title: "An embed" }]);
    expect(snapshot?.document.attachments).toEqual([
      { id: "0", filename: "guide.pdf", description: "A visible attachment" },
    ]);
    expect(snapshot?.document.components).toEqual(initial.components);
    // Unrelated entities stay rendered exactly the same while a text field is focused.
    expect(host.querySelector(".legacy-embed")?.textContent).toContain(
      "An embed",
    );
    expect(host.querySelector(".discord-button")?.textContent).toContain(
      "Continue",
    );
    expect(
      host.querySelector(".legacy-attachment-item")?.textContent,
    ).toContain("guide.pdf");

    // Blurring returns automatically to the rendered preview — no mode switch needed.
    // React implements synthetic onBlur via the native (bubbling) focusout event.
    flushSync(() =>
      source!.dispatchEvent(new Event("focusout", { bubbles: true })),
    );
    expect(host.querySelector('[role="textbox"][contenteditable][aria-label="Message content"]')).toBeNull();
    expect(
      host.querySelector('[role="textbox"][aria-label="Message content"]:not([contenteditable])')?.textContent,
    ).toContain("unsaved-looking text");
    expect(snapshot?.document.content).toBe(
      "unsaved-looking text {{user.name}}",
    );

    flushSync(() => root.unmount());
    host.remove();
  });

  it("renders Components V2 Text Display as a live preview at rest and preserves its canonical source across focus/blur", () => {
    const host = window.document.createElement("div");
    window.document.body.append(host);
    const root = createRoot(host);

    flushSync(() =>
      root.render(
        <PreviewHarness
          initialDocument={componentsV2Initial}
          report={() => undefined}
        />,
      ),
    );
    expect(
      host.querySelector(".node-textDisplay .inline-preview")?.textContent,
    ).toContain("V2 text remains visible");
    expect(host.querySelector(".node-textDisplay .inline-edit")).toBeNull();
    expect(host.querySelector(".discord-button")?.textContent).toContain(
      "Confirm",
    );

    flushSync(() =>
      host
        .querySelector<HTMLElement>(".node-textDisplay .inline-preview")!
        .dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(
      host.querySelector(".node-textDisplay .inline-edit")?.textContent,
    ).toBe("V2 text remains visible");
    expect(host.querySelector(".discord-button")?.textContent).toContain(
      "Confirm",
    );

    flushSync(() =>
      host
        .querySelector<HTMLElement>(".node-textDisplay .inline-edit")!
        .dispatchEvent(new Event("focusout", { bubbles: true })),
    );
    expect(
      host.querySelector(".node-textDisplay .inline-preview")?.textContent,
    ).toContain("V2 text remains visible");
    expect(host.querySelector(".discord-button")?.textContent).toContain(
      "Confirm",
    );

    flushSync(() => root.unmount());
    host.remove();
  });

  it("keeps spoiler reveal working without any test mode", () => {
    const spoilerDocument: DiscordMessagePayload = {
      flags: 32_768,
      components: [
        {
          type: 17,
          spoiler: true,
          components: [{ type: 10, content: "Hidden text" }],
        },
      ],
    };
    const host = window.document.createElement("div");
    window.document.body.append(host);
    const root = createRoot(host);
    flushSync(() =>
      root.render(
        <PreviewHarness
          initialDocument={spoilerDocument}
          report={() => undefined}
        />,
      ),
    );

    expect(host.querySelector(".discord-container.is-spoiler")).not.toBeNull();
    flushSync(() =>
      host.querySelector<HTMLButtonElement>(".component-spoiler")!.click(),
    );
    expect(host.querySelector(".discord-container.is-spoiler")).toBeNull();

    flushSync(() => root.unmount());
    host.remove();
  });

  it("renders the shared canvas read-only without exposing any mutation path", () => {
    const document = structuredClone(initial);
    const before = structuredClone(document);
    const host = window.document.createElement("div");
    window.document.body.append(host);
    const root = createRoot(host);

    flushSync(() =>
      root.render(
        <EditorCanvas
          document={document}
          placeholders={[]}
          previewPlaceholders
          readOnly
        />,
      ),
    );

    expect(host.querySelector(".editor-canvas.is-readonly")).not.toBeNull();
    expect(
      host.querySelector("[contenteditable]"),
      "inline fields cannot become editors",
    ).toBeNull();
    expect(
      host.querySelector(".node-controls"),
      "configure/delete/drag controls are absent",
    ).toBeNull();
    expect(
      host.querySelector(".insertion-point"),
      "add controls are absent",
    ).toBeNull();
    expect(host.querySelector(".message-body")?.textContent).toContain(
      "before preview",
    );
    expect(host.querySelector(".legacy-embed")?.textContent).toContain(
      "An embed",
    );
    expect(host.querySelector(".discord-button")?.textContent).toContain(
      "Continue",
    );

    flushSync(() => {
      host
        .querySelector<HTMLElement>(".editor-node")
        ?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
      host.querySelector<HTMLElement>(".inline-preview")?.click();
      window.document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Delete", bubbles: true }),
      );
    });
    expect(host.querySelector(".editor-popover")).toBeNull();
    expect(document).toEqual(before);

    flushSync(() => root.unmount());
    host.remove();
  });
});

function PreviewHarness({
  initialDocument = initial,
  report,
}: Readonly<{
  initialDocument?: DiscordMessagePayload;
  report(value: { document: DiscordMessagePayload; selected?: string }): void;
}>) {
  const [selected, setSelected] = useState<string>("components.0");
  const editor = useDocumentEditor(
    `preview-regression-${initialDocument.flags}`,
    initialDocument,
    () => undefined,
  );
  const actions: CanvasActions = {
    selectedPath: selected
      ?.split(".")
      .map((part) => (Number.isNaN(Number(part)) ? part : Number(part))),
    select(path) {
      setSelected(path?.join(".") ?? "");
    },
    beginEdit: editor.beginEdit,
    endEdit: editor.endEdit,
    updateNode: () => undefined,
    updateMessage(field, value, editing) {
      editor.change(
        { ...editor.document, [field]: value as string },
        editing ? "edit" : "structural",
      );
    },
    setButtonStyle: () => undefined,
    add: () => undefined,
    addLegacyRow: () => undefined,
    setSectionAccessory: () => undefined,
    remove: () => undefined,
    duplicate: () => undefined,
    copy: () => undefined,
    paste: () => undefined,
    move: () => undefined,
    moveList: () => undefined,
    drag: () => undefined,
    canDrag: () => false,
    configure: () => undefined,
    configureMessage: () => undefined,
    configureLegacyEmbed: () => undefined,
  };
  report({ document: editor.document, selected });

  return (
    <EditorCanvas
      actions={actions}
      document={editor.document}
      placeholders={[]}
      previewPlaceholders
    />
  );
}
