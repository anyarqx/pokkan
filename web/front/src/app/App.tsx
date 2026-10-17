import { lazy, Suspense, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router";
import { defaultLocale, isLocale } from "./i18n";
import { SiteLayout } from "./SiteLayout";

const WorkspaceLayout = lazy(() =>
  import("./WorkspaceLayout").then(({ WorkspaceLayout }) => ({
    default: WorkspaceLayout,
  })),
);
const AboutPage = lazy(() =>
  import("../pages/AboutPage").then(({ AboutPage }) => ({
    default: AboutPage,
  })),
);
const AccountPage = lazy(() =>
  import("../pages/AccountPage").then(({ AccountPage }) => ({
    default: AccountPage,
  })),
);
const PrivacyPage = lazy(() =>
  import("../pages/PrivacyPage").then(({ PrivacyPage }) => ({
    default: PrivacyPage,
  })),
);
const KitEditorPage = lazy(() =>
  import("../pages/KitEditorPage").then(({ KitEditorPage }) => ({
    default: KitEditorPage,
  })),
);
const ReportPage = lazy(() =>
  import("../pages/ReportPage").then(({ ReportPage }) => ({
    default: ReportPage,
  })),
);
const SharedKitPage = lazy(() =>
  import("../pages/SharedKitPage").then(({ SharedKitPage }) => ({
    default: SharedKitPage,
  })),
);
const KitsPage = lazy(() =>
  import("../pages/KitsPage").then(({ KitsPage }) => ({ default: KitsPage })),
);
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then(({ LandingPage }) => ({
    default: LandingPage,
  })),
);
const ErrorPage = lazy(() =>
  import("../pages/ErrorPage").then(({ ErrorPage }) => ({
    default: ErrorPage,
  })),
);

export function App() {
  const baseName =
    import.meta.env.BASE_URL === "/"
      ? undefined
      : import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <BrowserRouter basename={baseName}>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route
            element={<Navigate replace to={`/${defaultLocale}`} />}
            path="/"
          />
          <Route element={<LocalizedLayout />} path="/:locale">
            <Route element={<LandingPage />} index />
            <Route element={<AboutPage />} path="about" />
            <Route element={<AccountPage />} path="account" />
            <Route element={<PrivacyPage />} path="privacy" />
            <Route
              element={
                <Navigate replace to="../privacy#terms" relative="path" />
              }
              path="terms"
            />
            <Route element={<ReportPage />} path="report" />
            <Route
              element={
                <main
                  className="workspace-content"
                  id="main-content"
                  tabIndex={-1}
                >
                  <SharedKitPage />
                </main>
              }
              path="shared/:id"
            />
            <Route element={<WorkspaceLayout />}>
              <Route element={<KitsPage />} path="kits" />
              <Route element={<KitEditorPage />} path="kits/:id" />
            </Route>
            <Route element={<ErrorPage status={404} />} path="not-found" />
            <Route element={<ErrorPage status={404} />} path="*" />
          </Route>
          <Route
            element={<Navigate replace to={`/${defaultLocale}/not-found`} />}
            path="*"
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RouteLoading() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" className="route-loading">
      <p role="status">{t("app.loading")}</p>
    </div>
  );
}

function LocalizedLayout() {
  const { locale } = useParams();
  const { i18n } = useTranslation();
  const activeLocale = isLocale(locale) ? locale : defaultLocale;

  useLayoutEffect(() => {
    void i18n.changeLanguage(activeLocale);
    document.documentElement.lang = activeLocale;
  }, [activeLocale, i18n]);

  return isLocale(locale) ? (
    <SiteLayout />
  ) : (
    <Navigate replace to={`/${defaultLocale}/not-found`} />
  );
}
