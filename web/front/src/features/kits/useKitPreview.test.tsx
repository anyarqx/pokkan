// @vitest-environment jsdom
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import i18n from "../../app/i18n";
import { EditorCanvas } from "../editor/EditorCanvas";
import { NotificationProvider } from "../../shared/notifications";
import { SendKit } from "./SendKit";
import { useKitPreview } from "./useKitPreview";
import { toWebhookJson, type Kit } from "./domain";

let denied = false;
let metadataAvailable = true;
vi.mock("../../shared/contexts", () => ({
  useContexts: () => ({
    authorization_required: false,
    guilds: [
      {
        id: "1001",
        name: "Orchard",
        status: metadataAvailable ? "installed" : "invite",
      },
      {id: "2002", name: "Harbor", status: "installed"},
    ],
  }),
}));
vi.mock("../../shared/session", () => ({
  useSession: () => ({ account: { id: "alice" } }),
}));
vi.mock("../../shared/serverMetadata", () => ({
  useServerMetadata: (_account: string, guild?: string) => ({
    loading: false,
    denied,
    data:
      guild && !denied && metadataAvailable
        ? {
            guild_id: guild,
            guild: { id: guild, name: guild === "1001" ? "Orchard" : "Harbor" },
            channels: [
              { id: "2010", name: "Community", type: 4 },
              { id: "2020", name: "Lounge", type: 2 },
            ],
            roles: [],
          }
        : undefined,
  }),
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const kit: Kit = {
  id: "6d1ec19a-f100-4427-bc4f-564d15463da1",
  name: "Welcome",
  arguments: [],
  guild_id: "1001",
  placeholders: [
    {
      key: "event.name",
      label: "Event",
      description: "",
      category: "Custom",
      type: "string",
      example: "Open day",
    },
  ],
  message: {
    content: "{guild.name} {guild.id} {user.name} {channel.name} {event.name}",
  },
};
function Preview({ value }: { value: Kit }) {
  const preview = useKitPreview(value);
  return (
    <EditorCanvas
      document={value.message}
      {...preview}
      previewPlaceholders
      readOnly
    />
  );
}
function References() {
  return <output>{JSON.stringify(useKitPreview(kit).references)}</output>;
}
beforeEach(async () => {
  denied = false;
  metadataAvailable = true;
  await i18n.changeLanguage("en");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
it("uses verified guild identity without bot metadata, but never after access is denied", () => {
  metadataAvailable = false;
  flushSync(() => root.render(<Preview value={kit} />));
  expect(host.textContent).toContain("Orchard 1001");
  denied = true;
  flushSync(() => root.render(<Preview value={kit} />));
  expect(host.textContent).toContain("{guild.name} {guild.id}");
  expect(host.textContent).not.toContain("Orchard");
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
});
it("keeps categories and voice channels among the authorized references", () => {
  flushSync(() => root.render(<References />));
  expect(JSON.parse(host.querySelector("output")!.textContent!)).toEqual([
    { id: "2010", name: "Community", kind: "channel" },
    { id: "2020", name: "Lounge", kind: "channel" },
  ]);
});
it("uses the same known context in editor and Send without replacing delivery values", () => {
  flushSync(() => root.render(<Preview value={kit} />));
  const editorText = host.querySelector(".discord-markdown")?.textContent;
  expect(editorText).toContain(
    "Orchard 1001 {user.name} {channel.name} Open day",
  );
  flushSync(() =>
    root.render(
      <MemoryRouter>
        <NotificationProvider>
          <SendKit locale="en" kits={[kit]} selectedId={kit.id} />
        </NotificationProvider>
      </MemoryRouter>,
    ),
  );
  expect(host.querySelector(".discord-markdown")?.textContent).toBe(editorText);
  expect(toWebhookJson(kit.message).content).toBe(kit.message.content);
});
it("updates context and removes known server values for personal or denied Kits", () => {
  flushSync(() =>
    root.render(<Preview value={{ ...kit, guild_id: "2002" }} />),
  );
  expect(host.textContent).toContain("Harbor 2002");
  flushSync(() =>
    root.render(<Preview value={{ ...kit, guild_id: undefined }} />),
  );
  expect(host.textContent).toContain("{guild.name} {guild.id}");
  denied = true;
  flushSync(() => root.render(<Preview value={kit} />));
  expect(host.textContent).not.toContain("Orchard");
  expect(host.textContent).toContain("Open day");
});
