// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import { copyText } from "../../shared/copy";
import { JsonSheet } from "./JsonSheet";

vi.mock("../../shared/copy", () => ({
  copyText: vi.fn().mockResolvedValue(undefined),
}));
const kit = {
  id: "be49cb2e-f4a3-4b3d-8434-4bb1a14a015d",
  name: "Draft",
  arguments: [],
  placeholders: [],
  message: { content: "Hello" },
};
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
  await i18n.changeLanguage("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("keeps keyboard focus in JSON and returns it to the opener on dismissal", () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  const close = vi.fn(() => flushSync(() => root.render(null)));
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  flushSync(() =>
    root.render(<JsonSheet kit={kit} close={close} apply={vi.fn()} />),
  );
  const dialog = host.querySelector('[role="dialog"]')!;
  const buttons = dialog.querySelectorAll<HTMLButtonElement>(
    "button:not(:disabled)",
  );
  expect(document.activeElement).toBe(buttons[0]);
  buttons[0].dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(document.activeElement).toBe(buttons[0]);
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  expect(close).toHaveBeenCalledOnce();
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(opener);
  opener.remove();
});

it("copies and downloads both payload formats from JSON", async () => {
  let blob: Blob | undefined;
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn((value: Blob) => {
      blob = value;
      return "blob:test";
    }),
    revokeObjectURL: vi.fn(),
  });
  let filename = "";
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
  });
  flushSync(() =>
    root.render(<JsonSheet kit={kit} close={vi.fn()} apply={vi.fn()} />),
  );
  const click = (label: string) =>
    flushSync(() =>
      [...host.querySelectorAll("button")]
        .find((button) => button.textContent?.trim() === label)!
        .click(),
    );
  for (const [label, name] of [
    [i18n.t("app.discordRequest"), "discord-message.json"],
    [i18n.t("app.kitJson"), "pokkan-kit.json"],
  ]) {
    click(label);
    await vi.waitFor(() =>
      expect(JSON.parse(host.querySelector("textarea")!.value)).toEqual(
        name === "pokkan-kit.json"
          ? { schema: "pokkan-kit", version: 1, ...kit }
          : { content: "Hello", allowed_mentions: { parse: [] } },
      ),
    );
    const output = host.querySelector("textarea")!.value;
    const copyButton = [...host.querySelectorAll("button")].find((button) =>
      [i18n.t("app.copy"), i18n.t("app.copied")].includes(
        button.textContent!.trim(),
      ),
    )!;
    flushSync(() => copyButton.click());
    await vi.waitFor(() => expect(copyText).toHaveBeenLastCalledWith(output));
    click(i18n.t("app.download"));
    expect(filename).toBe(name);
    const downloaded = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob!);
    });
    expect(downloaded).toBe(output);
    expect(JSON.parse(output)).toEqual(
      name === "pokkan-kit.json"
        ? { schema: "pokkan-kit", version: 1, ...kit }
        : { content: "Hello", allowed_mentions: { parse: [] } },
    );
  }
});
