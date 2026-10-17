// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import { KitNameInput } from "./KitNameInput";
import { kitStore } from "./store";

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
});
function type(value: string) {
  const input = host.querySelector("input")!;
  flushSync(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}

it.each([undefined, "1001"])(
  "renames a draft in context %s without changing its payload or owner",
  (guild) => {
    const kit = kitStore.createDraft("Original", { content: "Message" }, guild);
    const close = vi.fn();
    flushSync(() => root.render(<KitNameInput kit={kit} close={close} />));
    const input = type("  Renamed  ");
    flushSync(() =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(kitStore.find(kit.id)).toEqual({ ...kit, name: "Renamed" });
    expect(close).toHaveBeenCalledWith(true, true);
  },
);

it("does not confirm during IME composition and Escape cancels", () => {
  const kit = kitStore.createDraft("Original", { content: "Message" });
  const close = vi.fn();
  flushSync(() => root.render(<KitNameInput kit={kit} close={close} />));
  const input = type("日本語");
  flushSync(() =>
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
      }),
    ),
  );
  expect(close).not.toHaveBeenCalled();
  flushSync(() =>
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  expect(kitStore.find(kit.id)?.name).toBe("Original");
  expect(close).toHaveBeenCalledWith(false, true);
});

it("edits the title itself and retains pending text through a refreshed Kit", () => {
  const kit = kitStore.createDraft("Community guide", { content: "Hello" });
  const close = vi.fn();
  flushSync(() => root.render(<KitNameInput inline kit={kit} close={close} />));
  expect(host.querySelector("input")).toBeNull();
  const title = host.querySelector<HTMLElement>('[role="textbox"]')!;
  flushSync(() => {
    title.textContent = "Pending name";
    title.dispatchEvent(new Event("input", { bubbles: true }));
  });
  flushSync(() =>
    root.render(<KitNameInput inline kit={{ ...kit }} close={close} />),
  );
  expect(title.textContent).toBe("Pending name");
  flushSync(() =>
    title.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        isComposing: true,
      }),
    ),
  );
  expect(close).not.toHaveBeenCalled();
  flushSync(() =>
    title.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  expect(kitStore.find(kit.id)?.name).toBe("Pending name");
  expect(close).toHaveBeenCalledWith(true, true);
});

it("keeps title renaming to one plain-text name within the limit", () => {
  const kit = kitStore.createDraft("Original", { content: "Hello" });
  flushSync(() =>
    root.render(<KitNameInput inline kit={kit} close={vi.fn()} />),
  );
  const title = host.querySelector<HTMLElement>('[role="textbox"]')!;
  flushSync(() => {
    title.textContent = "a".repeat(170);
    title.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(title.textContent).toHaveLength(160);
  flushSync(() => title.blur());
  expect(kitStore.find(kit.id)?.name).toHaveLength(160);
});

it("rejects a blank name and cancels it on blur", () => {
  const kit = kitStore.createDraft("Original", { content: "Message" });
  const close = vi.fn();
  flushSync(() => root.render(<KitNameInput kit={kit} close={close} />));
  const input = type("  ");
  flushSync(() =>
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("name");
  expect(input.maxLength).toBe(160);
  flushSync(() => input.blur());
  expect(kitStore.find(kit.id)?.name).toBe("Original");
});
