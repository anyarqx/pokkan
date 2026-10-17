import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router";
import { PageMeta } from "../shared/PageMeta";
import { siteLinks } from "../shared/SiteLinks";
import { defaultLocale } from "../app/i18n";
import { usePolicyCopy } from "./policies";

export function PrivacyPage() {
  const { t } = useTranslation();
  const { locale = defaultLocale } = useParams();
  const { hash } = useLocation();
  const { copy, failed } = usePolicyCopy(locale);
  useEffect(() => {
    if (copy && (hash === "#terms" || hash === "#privacy"))
      document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [copy, hash]);
  return (
    <main className="plain-page privacy-page" id="main-content" tabIndex={-1}>
      <PageMeta
        title={t("app.privacy")}
        description={t("meta.privacyDescription")}
      />
      {!copy ? (
        <p role={failed ? "alert" : "status"}>
          {t(failed ? "error.500.description" : "app.loading")}
        </p>
      ) : (
        <>
          <h1>{t("app.privacy")}</h1>
          <p className="page-copy">{copy.privacy.intro}</p>
          <p className="muted">
            <time dateTime="2026-10-20">
              {copy.updated}{" "}
              {new Date("2026-10-20T12:00:00Z").toLocaleDateString(locale)}
            </time>
          </p>
          <p>
            <a className="text-link" href="#privacy">
              {copy.privacy.title}
            </a>
            {" · "}
            <a className="text-link" href="#terms">
              {copy.terms.title}
            </a>
          </p>
          <div className="privacy-sections">
            <section>
              <h2>{copy.contactTitle}</h2>
              <p>{copy.operator.replace("{creator}", siteLinks.creator)}</p>
              <p>
                <Link
                  className="text-link"
                  to={`/${locale}/report?kind=privacy`}
                >
                  {copy.contactAction}
                </Link>
                {" · "}
                <a
                  className="text-link"
                  href={siteLinks.support}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("app.support")}
                </a>
              </p>
            </section>
            {(["privacy", "terms"] as const).map((kind) => (
              <section id={kind} key={kind}>
                <h2>{copy[kind].title}</h2>
                {kind === "terms" ? <p>{copy.terms.intro}</p> : null}
                {copy[kind].sections.map((section) => (
                  <section key={section.title}>
                    <h3>{section.title}</h3>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </section>
                ))}
              </section>
            ))}
            <section>
              <h2>{copy.related}</h2>
              <p>
                <a
                  className="text-link"
                  href="https://discord.com/guidelines"
                  rel="noreferrer"
                >
                  {copy.discordRules}
                </a>
                {" · "}
                <a
                  className="text-link"
                  href="https://discord.com/privacy"
                  rel="noreferrer"
                >
                  {copy.discordPrivacy}
                </a>
              </p>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
