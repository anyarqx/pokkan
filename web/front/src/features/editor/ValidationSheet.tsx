import { Sheet } from "./Sheet";
import { useTranslation } from "react-i18next";
import type { EditorIssue } from "./schema";

export function ValidationSheet({
  issues,
  close,
  select,
}: Readonly<{
  issues: readonly EditorIssue[];
  close(): void;
  select(issue: EditorIssue): void;
}>) {
  const { t } = useTranslation();

  return (
    <Sheet
      title={t("editor.payloadIssueCount", { count: issues.length })}
      close={close}
    >
      <div className="validation-list">
        {issues.map((issue, index) => (
          <button
            className={issue.level === "error" ? "is-error" : "is-warning"}
            key={`${issue.path.join(".")}-${index}`}
            onClick={() => select(issue)}
            type="button"
          >
            <strong>{formatPath(issue.path)}</strong>
            <span>{issue.message}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function formatPath(path: readonly (string | number)[]) {
  return (
    path.reduce(
      (result, item) =>
        typeof item === "number"
          ? `${result}[${item}]`
          : result
            ? `${result}.${item}`
            : item,
      "",
    ) || "message"
  );
}
