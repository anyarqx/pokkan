import { renderToStaticMarkup } from "react-dom/server";
import { ExternalLink } from "lucide-react";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/app/i18n";
import { EditorCanvas } from "../src/features/editor/EditorCanvas";
import {
  buildBuiltInExample,
  builtInExampleUrl,
} from "../src/features/kits/presets";
import {
  deserializePokkanKit,
  toPokkanKit,
  type DiscordMessagePayload,
} from "../src/features/kits/domain";

export async function renderMessages(examples: Record<string, unknown>) {
  const result: Record<string, Record<string, string>> = {};
  for (const locale of ["en", "pt-BR", "es", "ja"]) {
    await i18n.changeLanguage(locale);
    const messages: Record<
      string,
      { message: DiscordMessagePayload; url: string }
    > = Object.fromEntries(
      (["legacy", "components-v2", "poll"] as const).map((name) => [
        name,
        {
          message: buildBuiltInExample(
            name,
            locale,
            i18n.t.bind(i18n),
            "https://pokkan.net",
            false,
          ).message,
          url: builtInExampleUrl(locale, name, "https://pokkan.net"),
        },
      ]),
    );
    for (const [name, value] of Object.entries(examples)) {
      const kit = deserializePokkanKit(value);
      messages[name] = {
        message: kit.message,
        url: `https://pokkan.net/${locale}/kits?example=import#${encodeURIComponent(JSON.stringify(toPokkanKit(kit)))}`,
      };
    }
    result[locale === "pt-BR" ? "pt-br" : locale] = Object.fromEntries(
      Object.entries(messages).map(([name, { message, url }]) => [
        name,
        renderToStaticMarkup(
          <I18nextProvider i18n={i18n}>
            <div className="message-example-toolbar">
              <span>{i18n.t("docs.editableMessage")}</span>
              <a href={url}>
                <ExternalLink aria-hidden="true" size={14} />
                {i18n.t("docs.openEditor")}
              </a>
            </div>
            <div className="message-example-preview">
              <EditorCanvas
                document={message}
                placeholders={[]}
                previewPlaceholders
                readOnly
              />
            </div>
          </I18nextProvider>,
        ).replaceAll('="/avatar.png"', '="https://pokkan.net/avatar.png"'),
      ]),
    );
  }
  return result;
}
