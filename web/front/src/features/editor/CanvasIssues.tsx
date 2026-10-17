import { createContext, useContext } from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";
import type { ComponentPath, EditorIssue } from "./schema";

export const CanvasIssues = createContext<readonly EditorIssue[]>([]);

function contains(path: ComponentPath, issue: ComponentPath) {
  return path.every((part, index) => issue[index] === part);
}

export function useDiagnosticProps(path?: ComponentPath) {
  const issues = useContext(CanvasIssues);
  const relevant = path
    ? issues.filter((issue) => contains(path, issue.path))
    : [];
  return {
    "data-editor-path": path ? JSON.stringify(path) : undefined,
    "aria-invalid":
      relevant.some((issue) => issue.level === "error") || undefined,
    title: relevant.length
      ? relevant.map((issue) => issue.message).join("\n")
      : undefined,
  };
}

/** Uses the validator's current paths; no independent rules or cached positions. */
export function IssueFeedback({ path }: Readonly<{ path: ComponentPath }>) {
  const issues = useContext(CanvasIssues).filter((issue) =>
    contains(path, issue.path),
  );
  if (!issues.length) return null;
  const error = issues.some((issue) => issue.level === "error");
  return (
    <details
      className={`canvas-issues${error ? " is-error" : " is-warning"}`}
      onClick={(event) => event.stopPropagation()}
    >
      <summary aria-label={issues.map((issue) => issue.message).join(". ")}>
        {error ? (
          <CircleAlert size={15} aria-hidden="true" />
        ) : (
          <TriangleAlert size={15} aria-hidden="true" />
        )}
      </summary>
      <ul>
        {issues.map((issue, index) => (
          <li key={index}>{issue.message}</li>
        ))}
      </ul>
    </details>
  );
}

export function focusCanvasIssue(path: ComponentPath, activate = true) {
  const matches = [
    ...document.querySelectorAll<HTMLElement>("[data-editor-path]"),
  ]
    .map((element) => ({
      element,
      path: JSON.parse(element.dataset.editorPath!) as ComponentPath,
    }))
    .filter((entry) => contains(entry.path, path))
    .sort((a, b) => b.path.length - a.path.length);
  const element = matches[0]?.element;
  if (!element) return false;
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  if (activate) element.click();
  element.focus({ preventScroll: true });
  return true;
}
