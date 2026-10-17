// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { listKits, getKit, saveKit, deleteKit } from "./api";
import { deliverWebhook } from "./webhook";
import { resetCsrfToken } from "../../shared/api";
import type { Kit } from "./domain";

const kit: Kit = {
  id: "be49cb2e-f4a3-4b3d-8434-4bb1a14a015d",
  name: "Webhook",
  arguments: [],
  message: { content: "Hello" },
  placeholders: [],
};

afterEach(() => {
  resetCsrfToken();
  vi.unstubAllGlobals();
});

describe("webhook delivery", () => {
  it("sends directly to the exact Discord capability URL without API credentials", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "message" }));
    vi.stubGlobal("fetch", fetchMock);

    await deliverWebhook(
      "https://discordapp.com/api/webhooks/123456789012345678/token_value?thread_id=987654321098765432",
      kit.message,
    );

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.origin).toBe("https://discord.com");
    expect(url.searchParams.get("thread_id")).toBe("987654321098765432");
    expect(url.searchParams.get("wait")).toBe("true");
    expect(url.searchParams.get("with_components")).toBe("true");
    expect(init).toMatchObject({
      method: "POST",
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      content: "Hello",
      allowed_mentions: { parse: [] },
    });
  });

  it("rejects non-Discord and credential-confusing URLs before a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    for (const url of [
      "https://discord.com.attacker.example/api/webhooks/123456789012345678/token",
      "https://user@discord.com/api/webhooks/123456789012345678/token",
      "http://discord.com/api/webhooks/123456789012345678/token",
      "https://discord.com:444/api/webhooks/123456789012345678/token",
      "https://discord.com/api/webhooks/123456789012345678/token#fragment",
      "https://discord.com/api/webhooks/123456789012345678/token?unknown=true",
      "https://discord.com/api/webhooks/123456789012345678/token?wait=true&wait=false",
      "https://discord.com/api/webhooks/123456789012345678/token?thread_id=",
    ])
      await expect(deliverWebhook(url, kit.message)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts an empty successful webhook response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(
      deliverWebhook(
        "https://discord.com/api/webhooks/123456789012345678/token_value",
        kit.message,
      ),
    ).resolves.toBeUndefined();
  });
});

describe("account Kit API", () => {
  it("loads, saves and deletes using one Kit ID", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ kits: [kit] }))
      .mockResolvedValueOnce(Response.json({ token: "csrf" }))
      .mockResolvedValueOnce(Response.json({ kit }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await listKits()).toEqual([kit]);
    expect(await saveKit(kit)).toEqual(kit);
    const { id, ...data } = kit;
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
      kit: data,
    });
    await deleteKit(id);
    expect(String(fetchMock.mock.calls[3][0])).toContain(`/api/v1/kits/${id}`);
    expect(fetchMock.mock.calls[3][1]?.method).toBe("DELETE");
  });
  it("sends a guild owner only on creation and a revision on later changes", async () => {
    const server = { ...kit, guild_id: "1001", creator_id: "7001", can_edit: true, revision: 0 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ kits: [server] }))
      .mockResolvedValueOnce(Response.json({ kit: server }))
      .mockResolvedValueOnce(Response.json({ token: "csrf" }))
      .mockResolvedValueOnce(Response.json({ kit: server }))
      .mockResolvedValueOnce(Response.json({ kit: server }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await listKits("1001")).toEqual([server]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("context_id=1001");
    expect(await getKit(kit.id)).toEqual(server);
    await saveKit({ ...kit, guild_id: "1001" });
    expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body)).kit).toMatchObject({ guild_id: "1001" });
    await saveKit(server);
    const update = JSON.parse(String(fetchMock.mock.calls[4][1]?.body)).kit;
    expect(update).toMatchObject({ revision: 0 });
    expect(update).not.toHaveProperty("guild_id");
    expect(update).not.toHaveProperty("creator_id");
    await deleteKit(kit.id, 0);
    expect(String(fetchMock.mock.calls[5][0])).toContain("revision=0");
  });
});
