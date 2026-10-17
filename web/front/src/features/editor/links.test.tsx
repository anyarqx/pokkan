// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../app/i18n";
import { EditorCanvas, type CanvasActions } from "./EditorCanvas";
import type { DiscordMessagePayload } from "../kits/domain";

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});

const message: DiscordMessagePayload = {
  content: "Read [**the guide**](https://example.test/guide?lang=en&part=2).",
  components: [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "Read notes",
          url: "https://example.test/notes?lang=en&part=2",
        },
        {
          type: 2,
          style: 5,
          label: "Unavailable",
          url: "https://example.test/disabled",
          disabled: true,
        },
        { type: 2, style: 1, label: "Confirm", custom_id: "confirm" },
        {
          type: 2,
          style: 1,
          label: "Disabled",
          custom_id: "disabled",
          disabled: true,
        },
      ],
    },
  ],
};

describe("shared preview link and button behavior", () => {
  it("exposes literal Link Button and masked Markdown destinations as native links", () => {
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
    const links = [...host.querySelectorAll("a[href]")];
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["the guide", "https://example.test/guide?lang=en&part=2"],
      ["Read notes", "https://example.test/notes?lang=en&part=2"],
    ]);
    expect(links.every((link) => link.getAttribute("role") !== "button")).toBe(
      true,
    );
    const buttons = [...host.querySelectorAll("button")];
    expect(
      buttons.find((button) => button.textContent === "Unavailable")?.disabled,
    ).toBe(true);
    expect(
      buttons.find((button) => button.textContent === "Disabled")?.disabled,
    ).toBe(true);
    const confirm = buttons.find((button) => button.textContent === "Confirm")!;
    expect(confirm.disabled).toBe(false);
    const before = structuredClone(message);
    const address = window.location.href;
    flushSync(() => confirm.click());
    expect(message).toEqual(before);
    expect(window.location.href).toBe(address);
    expect(confirm.textContent).toBe("Confirm");
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "vbscript:unsafe",
    "http://[",
    "file:///tmp/private",
    "blob:https://example.test/unsafe",
    "java\tscript:alert(1)",
    "%6aavascript:alert(1)",
  ])("never activates an unsafe message URL: %s", (url) => {
    const payload = {
      content: `[Unsafe](${url})`,
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 5, label: "Unsafe button", url }],
        },
      ],
    };
    flushSync(() =>
      root.render(
        <EditorCanvas
          document={payload}
          placeholders={[]}
          previewPlaceholders
          readOnly
        />,
      ),
    );
    expect(host.querySelector("a[href]")).toBeNull();
    expect(
      [...host.querySelectorAll("button")].find(
        (button) => button.textContent === "Unsafe button",
      )?.disabled,
    ).toBe(true);
  });

  it("preserves unsupported relative destinations as passive content", () => {
    const payload = {
      content: "[Open](/en/kits)",
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 5, label: "Open", url: "/en/kits" }],
        },
      ],
    };
    flushSync(() =>
      root.render(
        <EditorCanvas
          document={payload}
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
    ).toEqual([]);
  });

  it("keeps Link Buttons and Markdown text editable without navigation", () => {
    const noop = vi.fn();
    const actions: CanvasActions = {
      select: noop,
      beginEdit: noop,
      endEdit: noop,
      updateNode: noop,
      updateMessage: noop,
      setButtonStyle: noop,
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
    flushSync(() =>
      root.render(
        <EditorCanvas
          actions={actions}
          document={message}
          placeholders={[]}
          previewPlaceholders
        />,
      ),
    );
    expect(host.querySelector("a[href]")).toBeNull();
    const address = window.location.href;
    const guide = [...host.querySelectorAll("a")].find(
      (link) => link.textContent === "the guide",
    )!;
    flushSync(() => guide.click());
    expect(
      [...host.querySelectorAll('[contenteditable="true"]')].some(
        (field) => field.querySelector("a strong")?.textContent === "the guide",
      ),
    ).toBe(true);
    expect(window.location.href).toBe(address);
  });
});
