// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import { NotificationProvider } from "../../shared/notifications";
import { SendKit } from "./SendKit";
import { deliverWebhook, discordWebhookUrl } from "./webhook";

vi.mock("../../shared/session", () => ({ useSession: () => ({}) }));
vi.mock("./useKitPreview", () => ({ useKitPreview: () => ({}) }));
vi.mock("./webhook", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./webhook")>();
  return {
    ...actual,
    discordWebhookUrl: vi.fn(actual.discordWebhookUrl),
    deliverWebhook: vi.fn(),
    rememberedWebhook: () => "",
    rememberWebhook: vi.fn(),
  };
});
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(async () => {
  await i18n.changeLanguage("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  flushSync(() =>
    root.render(
      <MemoryRouter>
        <NotificationProvider>
          <SendKit
            locale="en"
            selectedId="demo"
            kits={[
              {
                id: "demo",
                name: "Meetup",
                message: { content: "Welcome" },
                arguments: [],
                placeholders: [],
              },
            ]}
          />
        </NotificationProvider>
      </MemoryRouter>,
    ),
  );
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});
function enterUrl(value: string) {
  const input = host.querySelector<HTMLInputElement>('input[autocomplete="off"]')!;
  flushSync(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return input;
}
it("explains an invalid webhook at the field and prevents delivery", () => {
  const input = enterUrl("https://example.test/not-a-webhook");
  flushSync(() =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(
    document.getElementById(input.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toBeTruthy();
  expect(document.activeElement).toBe(input);
  expect(deliverWebhook).not.toHaveBeenCalled();
  enterUrl("");
  expect(input.hasAttribute("aria-invalid")).toBe(false);
  expect(host.querySelector('[role="alert"]')).toBeNull();
});
it("keeps the selected message stable during delivery", async () => {
  let finish!: () => void;
  vi.mocked(deliverWebhook).mockImplementationOnce(
    () =>
      new Promise<undefined>((resolve) => {
        finish = () => resolve(undefined);
      }),
  );
  // Only the transport is simulated. No Discord capability URL is used.
  vi.mocked(discordWebhookUrl).mockReturnValueOnce(
    new URL("https://example.test/controlled-delivery"),
  );
  enterUrl("https://example.test/controlled-delivery");
  flushSync(() =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(host.querySelector("select")!.disabled).toBe(true);
  expect(
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled,
  ).toBe(true);
  finish();
  await vi.waitFor(() =>
    expect(host.querySelector("select")!.disabled).toBe(false),
  );
});
