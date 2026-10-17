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
import mayaIllustration from "../../../../assets/maya-chibi-ilust.png";

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
    <main className="landing" id="main-content" tabIndex={-1}>
      <PageMeta
        description={t("meta.homeDescription")}
        title={t("meta.homeTitle")}
      />
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-intro">
            <div className="landing-title-brand">Pokkan</div>
            <h1>{t("landing.title")}</h1>
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
          <svg
            className="landing-maya"
            viewBox="218 195 1142 1633"
            width="1142"
            height="1633"
            aria-hidden="true"
            focusable="false"
          >
            <image href={mayaIllustration} width="1536" height="2048" />
          </svg>
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
          <p>{t("landing.legacyDescription")}</p>
        </article>
        <article className="hero-sample-v2">
          <h2>{t("landing.componentsV2")}</h2>
          <EditorCanvas
            document={samples.v2.message}
            placeholders={[]}
            previewPlaceholders
            readOnly
          />
          <p>{t("landing.v2Description")}</p>
        </article>
        <article className="hero-sample-poll">
          <h2>{t("landing.polls")}</h2>
          <EditorCanvas
            document={samples.poll.message}
            placeholders={[]}
            previewPlaceholders
            readOnly
          />
          <p>{t("landing.pollDescription")}</p>
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
