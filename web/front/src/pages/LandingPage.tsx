import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { EditorCanvas } from "../features/editor/EditorCanvas";
import { buildBuiltInExample } from "../features/kits/presets";
import { PageMeta } from "../shared/PageMeta";
import { defaultLocale } from "../app/i18n";
import { kitsPath } from "../app/routes";
import { docsUrl } from "../shared/SiteLinks";

export function LandingPage() {
  const { t } = useTranslation();
  const { locale = defaultLocale } = useParams();
  const origin =
    typeof window === "undefined"
      ? "https://pokkan.net"
      : window.location.origin;
  const samples = useMemo(
    () => ({
      legacy: buildBuiltInExample("legacy", locale, t, origin),
      v2: buildBuiltInExample("components-v2", locale, t, origin),
      poll: buildBuiltInExample("poll", locale, t, origin),
    }),
    [locale, origin, t],
  );

  return (
    <main className="landing">
      <PageMeta
        description={t("meta.homeDescription")}
        title={t("meta.homeTitle")}
      />
      <section className="landing-hero">
        <div className="landing-intro">
          <h1>
            <span className="landing-title-brand">Pokkan</span>{" "}
            {t("landing.title")}
          </h1>
          <p>{t("landing.description")}</p>
          <div className="actions">
            <Link className="button primary" to={kitsPath(locale)}>
              {t("landing.openKits")}{" "}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <a className="button" href={docsUrl(locale)}>
              {t("app.guide")}
            </a>
          </div>
        </div>
        <div className="landing-product">
          <picture>
            <source
              media="(max-width: 760px)"
              srcSet="/screenshots/pokkan-editor-mobile.webp"
              width="780"
              height="1080"
            />
            <img
              src="/screenshots/pokkan-section-button.webp"
              width="700"
              height="560"
              alt={t("landing.editorAlt")}
            />
          </picture>
        </div>
      </section>
      <section className="hero-samples" aria-label={t("landing.samples")}>
        <article className="hero-sample-classic">
          <h2>{t("landing.legacy")}</h2>
          <EditorCanvas
            document={samples.legacy.message}
            placeholders={[]}
            previewPlaceholders
            readOnly
          />
        </article>
        <article className="hero-sample-v2">
          <h2>{t("landing.componentsV2")}</h2>
          <EditorCanvas
            document={samples.v2.message}
            placeholders={[]}
            previewPlaceholders
            readOnly
          />
        </article>
        <article className="hero-sample-poll">
          <h2>{t("landing.polls")}</h2>
          <EditorCanvas
            document={samples.poll.message}
            placeholders={[]}
            previewPlaceholders
            readOnly
          />
        </article>
      </section>
      <section className="landing-start" aria-labelledby="start-title">
        <h2 id="start-title">{t("landing.startTitle")}</h2>
        <ol>
          <li>
            <Link to={kitsPath(locale)}>{t("landing.stepBuild")}</Link>
          </li>
          <li>
            <a href={docsUrl(locale, "guide/create-webhook")}>
              {t("landing.stepWebhook")}
            </a>
          </li>
          <li>
            <a href={docsUrl(locale, "guide/send")}>{t("landing.stepSend")}</a>
          </li>
        </ol>
        <a className="button" href={docsUrl(locale)}>
          {t("landing.startGuide")} <ArrowRight aria-hidden="true" size={16} />
        </a>
      </section>
    </main>
  );
}
