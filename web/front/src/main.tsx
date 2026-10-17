import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./app/i18n";
import i18n from "./app/i18n";
import { App } from "./app/App";
import { NotificationProvider } from "./shared/notifications";
import "./styles.css";

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="error-page error-page-standalone" role="alert">
          <div aria-hidden="true" className="error-code">
            500
          </div>
          <h1>{i18n.t("errors.500.title")}</h1>
          <p>{i18n.t("errors.500.description")}</p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
            type="button"
          >
            {i18n.t("errors.retry")}
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById("root");

if (!root) throw new Error("Missing application root");

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
