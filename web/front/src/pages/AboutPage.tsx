import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { defaultLocale } from "../app/i18n";
import { kitsPath } from "../app/routes";
import { PageMeta } from "../shared/PageMeta";
import { docsUrl } from "../shared/SiteLinks";

export function AboutPage() {
  const { t } = useTranslation();
  const { locale = defaultLocale } = useParams();
  return (
    <main className="plain-page about-page">
      <PageMeta
        description={t("meta.aboutDescription")}
        title={t("app.about")}
      />
      <div className="about-lead">
        <div>
          <h1>{t("about.title")}</h1>
          <p className="page-copy">{t("about.text")}</p>
        </div>
        <img
          src="/screenshots/pokkan-editor-overview.webp"
          width="1440"
          height="1000"
          alt={t("about.previewAlt")}
        />
      </div>
      <div className="about-details">
        <section>
          <h2>{t("about.editingTitle")}</h2>
          <p>{t("about.direct")}</p>
          <p>{t("about.editing")}</p>
        </section>
        <section>
          <h2>{t("about.kitsTitle")}</h2>
          <p>{t("about.kits")}</p>
          <p>{t("about.context")}</p>
        </section>
        <section>
          <h2>{t("about.outputTitle")}</h2>
          <p>{t("about.output")}</p>
          <p>{t("about.delivery")}</p>
        </section>
        <section>
          <h2>{t("about.examplesTitle")}</h2>
          <div className="about-example-links">
            <Link to={`${kitsPath(locale)}?example=legacy`}>
              {t("landing.legacy")}
            </Link>
            <Link to={`${kitsPath(locale)}?example=components-v2`}>
              {t("landing.componentsV2")}
            </Link>
            <Link to={`${kitsPath(locale)}?example=poll`}>
              {t("landing.polls")}
            </Link>
          </div>
        </section>
      </div>
      <div className="actions">
        <Link className="button primary" to={kitsPath(locale)}>
          {t("landing.openKits")}
        </Link>
        <a className="button" href={docsUrl(locale)}>
          {t("app.guide")}
        </a>
      </div>
    </main>
  );
}
