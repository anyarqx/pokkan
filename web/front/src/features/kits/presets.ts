import {
  componentsV2Flag,
  messageWithContent,
  type DiscordMessagePayload,
  type MessageFormat,
} from "./domain";
import { kitsPath } from "../../app/routes";

export type BuiltInExample = "legacy" | "components-v2" | "poll";
type Translate = (key: string) => string;

const exampleNames: Record<BuiltInExample, string> = {
  legacy: "landing.legacy",
  "components-v2": "landing.componentsV2",
  poll: "landing.polls",
};

export function buildStarterMessage(
  format: MessageFormat,
  translate: Translate,
) {
  return messageWithContent(
    format,
    translate(
      format === "legacy" ? "app.defaultLegacyContent" : "app.defaultV2Content",
    ),
  );
}

export function isBuiltInExample(
  value: string | null,
): value is BuiltInExample {
  return value === "legacy" || value === "components-v2" || value === "poll";
}

export function builtInExampleUrl(
  locale: string,
  example: BuiltInExample,
  origin: string,
) {
  const url = new URL(kitsPath(locale), origin);
  url.searchParams.set("example", example);
  return url.toString();
}

export function buildBuiltInExample(
  example: BuiltInExample,
  locale: string,
  translate: Translate,
  origin: string,
) {
  const linkButton = {
    type: 2 as const,
    style: 5 as const,
    label: translate("landing.sampleLinkLabel"),
    url: builtInExampleUrl(locale, example, origin),
  };
  const actionRow = () => ({ type: 1 as const, components: [linkButton] });
  let message: DiscordMessagePayload;

  switch (example) {
    case "legacy":
      message = {
        content: translate("landing.sampleLegacyContent"),
        embeds: [
          {
            title: translate("landing.sampleEmbedTitle"),
            description: translate("landing.sampleEmbedText"),
            color: 5_793_970,
            fields: [
              {
                name: translate("landing.sampleFieldWhen"),
                value: translate("landing.sampleFieldTime"),
                inline: true,
              },
              {
                name: translate("landing.sampleFieldWhere"),
                value: translate("landing.sampleFieldPlace"),
                inline: true,
              },
            ],
          },
        ],
        components: [actionRow()],
      };
      break;
    case "components-v2":
      message = {
        flags: componentsV2Flag,
        components: [
          {
            type: 17,
            accent_color: 5_793_970,
            components: [
              { type: 10, content: translate("landing.sampleV2Content") },
              { type: 14, divider: true, spacing: 1 },
              { type: 10, content: translate("landing.sampleV2Detail") },
              actionRow(),
            ],
          },
        ],
      };
      break;
    case "poll":
      message = {
        poll: {
          question: { text: translate("landing.samplePollQuestion") },
          answers: [
            {
              poll_media: {
                text: translate("landing.samplePollFirst"),
                emoji: { name: "🌅" },
              },
            },
            {
              poll_media: {
                text: translate("landing.samplePollSecond"),
                emoji: { name: "🌙" },
              },
            },
            {
              poll_media: {
                text: translate("landing.samplePollThird"),
                emoji: { name: "✨" },
              },
            },
          ],
          duration: 24,
          allow_multiselect: false,
          layout_type: 1,
        },
        components: [actionRow()],
      };
      break;
  }

  return { name: translate(exampleNames[example]), message };
}
