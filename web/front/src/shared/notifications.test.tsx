// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import "../app/i18n";
import { NotificationProvider, useNotice } from "./notifications";

it("keeps errors available and pauses automatic dismissal while a notice is being read", async () => {
  vi.useFakeTimers();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  function Notices() {
    const { notify } = useNotice();
    return (
      <button
        onClick={() => {
          notify("Ready", "success");
          notify("Save failed", "error");
        }}
      >
        Notify
      </button>
    );
  }
  try {
    flushSync(() =>
      root.render(
        <NotificationProvider>
          <Notices />
        </NotificationProvider>,
      ),
    );
    flushSync(() => host.querySelector("button")!.click());
    const notice = host.querySelector<HTMLElement>('[role="status"]')!;
    flushSync(() =>
      notice.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })),
    );
    flushSync(() => vi.advanceTimersByTime(20_000));
    expect(host.textContent).toContain("Ready");
    expect(host.textContent).toContain("Save failed");
    flushSync(() =>
      notice.dispatchEvent(
        new MouseEvent("pointerout", {
          bubbles: true,
          relatedTarget: document.body,
        }),
      ),
    );
    flushSync(() => vi.advanceTimersByTime(8_000));
    expect(host.textContent).not.toContain("Ready");
    expect(host.textContent).toContain("Save failed");
    flushSync(() =>
      host.querySelector<HTMLButtonElement>('[role="alert"] button')!.click(),
    );
    expect(host.textContent).not.toContain("Save failed");
  } finally {
    flushSync(() => root.unmount());
    host.remove();
    vi.useRealTimers();
  }
});
