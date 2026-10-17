import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";
import { readdirSync } from "node:fs";

const publishedPaths = new Set(
  readdirSync(new URL("./src/content/docs/", import.meta.url), {
    recursive: true,
  })
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => `/${file.replace(/\.mdx?$/, "").replace(/\/index$/, "")}/`),
);

export default defineConfig({
  site: "https://docs.pokkan.net",
  redirects: { "/": "/en/" },
  integrations: [
    sitemap({ filter: (url) => publishedPaths.has(new URL(url).pathname) }),
    starlight({
      title: "Pokkan",
      favicon: "/pokkanicon.png",
      defaultLocale: "en",
      locales: {
        en: { label: "English" },
        "pt-br": { label: "Português (Brasil)", lang: "pt-BR" },
        es: { label: "Español" },
        ja: { label: "日本語" },
      },
      logo: { src: "../../assets/pokkanicon.png", replacesTitle: false },
      customCss: ["./src/styles/docs.css"],
      routeMiddleware: "./src/route-data.ts",
      sidebar: [
        {
          label: "Start here",
          translations: {
            "pt-BR": "Comece aqui",
            es: "Empieza aquí",
            ja: "はじめに",
          },
          items: [{ autogenerate: { directory: "guide" } }],
        },
        {
          label: "Using Pokkan",
          translations: {
            "pt-BR": "Usando a Pokkan",
            es: "Usar Pokkan",
            ja: "Pokkanの使い方",
          },
          items: [{ autogenerate: { directory: "using-pokkan" } }],
        },
        {
          label: "Discord basics",
          translations: {
            "pt-BR": "Noções do Discord",
            es: "Conceptos de Discord",
            ja: "Discordの基本",
          },
          items: [
            "discord/messages",
            "discord/webhooks",
            "discord/formats",
            "discord/formatting",
            "discord/components-v2",
            "discord/components",
          ],
        },
        {
          label: "Message elements",
          translations: {
            "pt-BR": "Elementos da mensagem",
            es: "Elementos del mensaje",
            ja: "メッセージの構成要素",
          },
          items: [
            {
              label: "Legacy",
              collapsed: true,
              items: [
                "discord/message-content",
                "discord/embeds",
                "discord/embed-fields",
                "discord/polls",
                "discord/poll-answers",
                "discord/attachments-replies",
              ],
            },
            {
              label: "Components V2",
              collapsed: true,
              items: [
                "discord/text-displays",
                "discord/containers",
                "discord/sections",
                "discord/thumbnails",
                "discord/media-galleries",
                "discord/gallery-items",
                "discord/files",
                "discord/separators",
                "discord/containers-media",
              ],
            },
            {
              label: "Buttons and selection",
              translations: {
                "pt-BR": "Botões e seleção",
                es: "Botones y selección",
                ja: "ボタンと選択",
              },
              collapsed: true,
              items: [
                "discord/action-rows",
                "discord/buttons",
                "discord/select-menus",
                "discord/string-selects",
                "discord/user-selects",
                "discord/role-selects",
                "discord/mentionable-selects",
                "discord/channel-selects",
              ],
            },
          ],
        },
      ],
    }),
  ],
});
