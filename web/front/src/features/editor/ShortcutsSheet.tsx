import { Sheet } from "./Sheet";
import { useTranslation } from "react-i18next";

export function ShortcutsSheet({ close }: Readonly<{ close(): void }>) {
  const { t } = useTranslation();
  const shortcuts = [
    [t("app.shortcutUndo"), "Ctrl / ⌘ Z"],
    [t("app.shortcutRedo"), "Ctrl / ⌘ Shift Z", "Ctrl / ⌘ Y"],
    [t("app.shortcutCopy"), "Ctrl / ⌘ C"],
    [t("app.shortcutCut"), "Ctrl / ⌘ X"],
    [t("app.shortcutPaste"), "Ctrl / ⌘ V"],
    [t("app.shortcutDuplicate"), "Ctrl / ⌘ D"],
    [t("app.shortcutDelete"), "Delete", "Backspace"],
    [t("app.shortcutConfigure"), "Enter", "Alt Enter"],
    [t("app.shortcutMove"), "Alt ↑", "Alt ↓"],
    [t("app.shortcutEscape"), "Escape"],
  ] as const;

  return (
    <Sheet title={t("app.keyboardShortcuts")} close={close}>
      <p className="field-helper">{t("app.shortcutHint")}</p>
      <dl className="shortcut-list">
        {shortcuts.map(([label, ...keys]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}
