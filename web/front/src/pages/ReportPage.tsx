import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router";
import { defaultLocale } from "../app/i18n";
import {
  apiMutation,
  discordLoginUrl,
  rememberAuthFragment,
} from "../shared/api";
import { PageMeta } from "../shared/PageMeta";
import { siteLinks } from "../shared/SiteLinks";
import { useSession } from "../shared/session";
import { usePolicyCopy } from "./policies";

export function ReportPage() {
  const { locale = defaultLocale } = useParams();
  const session = useSession();
  const { t } = useTranslation();
  const { copy, failed } = usePolicyCopy(locale);
  const location = useLocation();
  return (
    <main className="plain-page privacy-page">
      <PageMeta
        title={t("app.report")}
        description={t("app.report")}
        indexable={false}
      />
      {!copy ? (
        <p role={failed ? "alert" : "status"}>
          {t(failed ? "error.500.description" : "app.loading")}
        </p>
      ) : (
        <>
          <h1>{copy.report.title}</h1>
          <p className="page-copy">{copy.report.intro}</p>
          {session.loading ? (
            <p role="status">{t("app.loading")}</p>
          ) : session.account ? (
            <ReportForm
              key={session.account.id}
              copy={copy.report}
              locale={locale}
              search={location.search}
              hash={location.hash}
            />
          ) : (
            <p>
              <a
                className="button primary"
                href={discordLoginUrl()}
                onClick={() => rememberAuthFragment()}
              >
                {t("app.signIn")}
              </a>
            </p>
          )}
          <p className="page-copy">
            {copy.report.supportHint}{" "}
            <a
              className="text-link"
              href={siteLinks.support}
              target="_blank"
              rel="noreferrer"
            >
              {t("app.support")}
            </a>
          </p>
        </>
      )}
    </main>
  );
}

function ReportForm({
  copy,
  locale,
  search,
  hash,
}: Readonly<{
  copy: NonNullable<ReturnType<typeof usePolicyCopy>["copy"]>["report"];
  locale: string;
  search: string;
  hash: string;
}>) {
  const query = new URLSearchParams(search);
  const [kind, setKind] = useState(
    ["privacy", "appeal"].includes(query.get("kind") ?? "")
      ? query.get("kind")!
      : "abuse",
  );
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const targetType = query.has("share")
    ? "share"
    : query.has("temporary")
      ? "temporary"
      : query.has("kit")
        ? "kit"
        : undefined;
  const target = targetType ? (query.get(targetType) ?? undefined) : undefined;
  const validTarget =
    target && /^[0-9a-f-]{36}$/.test(target) ? target : undefined;
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = hash.slice(1);
      const response = await apiMutation("/api/v1/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(/^[A-Za-z0-9_-]{43}$/.test(token)
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: JSON.stringify({
          report: {
            kind,
            details,
            contact: contact || null,
            ...(validTarget
              ? {
                  [`${targetType}_id`]: validTarget,
                  location: `/${locale}/${targetType === "kit" ? "kits" : "shared"}/${validTarget}`,
                }
              : {}),
          },
        }),
      });
      setReference(
        ((await response.json()) as { reference: string }).reference,
      );
      setDetails("");
      setContact("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.failed);
    } finally {
      setBusy(false);
    }
  }
  return reference ? (
    <p role="status">
      {copy.received} <code>{reference}</code>
    </p>
  ) : (
    <form className="report-form" onSubmit={(event) => void submit(event)}>
      <label>
        {copy.kind}
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="abuse">{copy.abuse}</option>
          <option value="privacy">{copy.privacy}</option>
          <option value="appeal">{copy.appeal}</option>
        </select>
      </label>
      <label>
        {copy.details}
        <textarea
          required
          minLength={10}
          maxLength={5000}
          rows={7}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
      </label>
      <p className="muted">{copy.safety}</p>
      <label>
        {copy.contact}
        <input
          type="email"
          maxLength={254}
          value={contact}
          onChange={(event) => setContact(event.target.value)}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button primary" disabled={busy}>
        {copy.submit}
      </button>
    </form>
  );
}
