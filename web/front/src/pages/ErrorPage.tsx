import { FileQuestion, Home, Layers3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { defaultLocale } from "../app/i18n";
import { PageMeta } from "../shared/PageMeta";
import { kitsPath } from "../app/routes";

export function ErrorPage({ status }: Readonly<{ status: 404 }>) {
  const { t } = useTranslation();
  const { locale = defaultLocale } = useParams();

  return (
    <main className="error-page" id="main-content" tabIndex={-1}>
      <PageMeta
        description={t(`errors.${status}.description`)}
        indexable={false}
        title={t(`errors.${status}.title`)}
      />
      <div className="error-code" aria-hidden="true">
        {status}
      </div>
      <FileQuestion aria-hidden="true" className="error-icon" size={28} />
      <h1>{t(`errors.${status}.title`)}</h1>
      <div className="actions">
        <Link className="button primary" to={`/${locale}`}>
          <Home aria-hidden="true" size={16} /> {t("errors.backHome")}
        </Link>
        <Link className="button quiet" to={kitsPath(locale)}>
          <Layers3 aria-hidden="true" size={16} /> {t("landing.openKits")}
        </Link>
      </div>
    </main>
  );
}
