import { Sheet } from "./Sheet";
import { CirclePlus, Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  builtInPlaceholders,
  type Placeholder,
  type PlaceholderType,
} from "./placeholders";

interface PlaceholderSheetProps {
  readonly items: readonly Placeholder[];
  readonly preview: boolean;
  change(items: readonly Placeholder[]): void;
  setPreview(value: boolean): void;
  close(): void;
}

export function PlaceholderSheet({
  items,
  change,
  preview,
  setPreview,
  close,
}: Readonly<PlaceholderSheetProps>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filteredBuiltIns = builtInPlaceholders().filter((item) =>
    matches(item, query),
  );
  const filteredCustom = items.filter((item) => matches(item, query));
  const update = (index: number, patch: Partial<Placeholder>) => {
    change(
      items.map((item, current) =>
        current === index ? { ...item, ...patch } : item,
      ),
    );
  };

  return (
    <Sheet title={t("editor.placeholders")} close={close}>
      <label className="switch-field">
        <span>{t("editor.previewPlaceholderValues")}</span>
        <button
          aria-pressed={preview}
          className="icon-button"
          onClick={() => setPreview(!preview)}
          title={
            preview
              ? t("editor.showPlaceholderSource")
              : t("editor.showPlaceholderExamples")
          }
          type="button"
        >
          {preview ? (
            <Eye
              className="placeholder-preview-icon"
              fill="currentColor"
              aria-hidden="true"
              size={16}
            />
          ) : (
            <EyeOff aria-hidden="true" size={16} />
          )}
        </button>
      </label>
      <input
        aria-label={t("editor.searchPlaceholders")}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("editor.search")}
        value={query}
      />
      <PlaceholderList items={filteredBuiltIns} readOnly />
      <div className="sheet-group">
        <div className="sheet-group-head">
          <span>{t("editor.custom")}</span>
          <button
            onClick={() => change([...items, newPlaceholder(items, t)])}
            type="button"
          >
            <CirclePlus
              className="solid-circle-icon"
              fill="currentColor"
              size={15}
            />{" "}
            {t("editor.addVariable")}
          </button>
        </div>
        <PlaceholderList
          items={filteredCustom}
          onChange={(current, item) => {
            const index = items.indexOf(current);
            if (index >= 0) update(index, item);
          }}
          onDelete={(item) => change(items.filter((value) => value !== item))}
        />
      </div>
    </Sheet>
  );
}

interface PlaceholderListProps {
  readonly items: readonly Placeholder[];
  readonly readOnly?: boolean;
  onChange?(current: Placeholder, item: Placeholder): void;
  onDelete?(item: Placeholder): void;
}

function PlaceholderList({
  items,
  readOnly,
  onChange,
  onDelete,
}: Readonly<PlaceholderListProps>) {
  const { t } = useTranslation();
  if (!items.length)
    return <p className="sheet-note">{t("editor.noMatchingPlaceholders")}</p>;

  return (
    <div className="placeholder-list">
      {items.map((item, index) =>
        readOnly ? (
          <div className="placeholder-row" key={item.key}>
            <strong>{`{${item.key}}`}</strong>
            <span>{item.description}</span>
            <small>
              {t(`editor.placeholderTypes.${item.type}`)} · {item.example}
            </small>
          </div>
        ) : (
          <div className="placeholder-row is-editable" key={index}>
            <div className="placeholder-row-head">
              <strong>{`{${item.key || t("editor.variable").toLowerCase()}}`}</strong>
              <button
                aria-label={t("editor.deletePlaceholder")}
                className="danger-icon"
                onClick={() => onDelete?.(item)}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <input
              aria-label={t("editor.placeholderKey")}
              onChange={(event) =>
                onChange?.(item, { ...item, key: slug(event.target.value) })
              }
              placeholder="server.color"
              value={item.key}
            />
            <input
              aria-label={t("editor.placeholderLabel")}
              onChange={(event) =>
                onChange?.(item, { ...item, label: event.target.value })
              }
              placeholder={t("editor.name")}
              value={item.label}
            />
            <input
              aria-label={t("editor.placeholderDescription")}
              onChange={(event) =>
                onChange?.(item, { ...item, description: event.target.value })
              }
              placeholder={t("editor.description")}
              value={item.description}
            />
            <div className="placeholder-pair">
              <select
                aria-label={t("editor.placeholderType")}
                onChange={(event) =>
                  onChange?.(item, {
                    ...item,
                    type: event.target.value as PlaceholderType,
                  })
                }
                value={item.type}
              >
                {(
                  [
                    "string",
                    "number",
                    "boolean",
                    "url",
                    "color",
                    "snowflake",
                  ] as const
                ).map((type) => (
                  <option key={type} value={type}>
                    {t(`editor.placeholderTypes.${type}`)}
                  </option>
                ))}
              </select>
              <input
                aria-label={t("editor.placeholderExample")}
                onChange={(event) =>
                  onChange?.(item, { ...item, example: event.target.value })
                }
                placeholder={t("editor.example")}
                value={item.example}
              />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

function newPlaceholder(
  items: readonly Placeholder[],
  t: (key: string) => string,
): Placeholder {
  let index = items.length + 1;
  while (items.some((item) => item.key === `variable.${index}`)) index += 1;
  return {
    key: `variable.${index}`,
    label: t("editor.variable"),
    description: t("editor.customTemplateValue"),
    category: t("editor.custom"),
    type: "string",
    example: t("editor.example"),
  };
}

function matches(item: Placeholder, query: string) {
  const term = query.trim().toLocaleLowerCase();
  return (
    !term ||
    `${item.key} ${item.label} ${item.category}`
      .toLocaleLowerCase()
      .includes(term)
  );
}

function slug(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9._-]/g, "");
}
