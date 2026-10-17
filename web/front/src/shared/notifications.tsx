import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";

type NoticeTone = "error" | "info" | "success";

interface Notice {
  readonly id: number;
  readonly message: string;
  readonly tone: NoticeTone;
  readonly count?: number;
}

interface NoticeApi {
  readonly notify: (message: string, tone?: NoticeTone) => void;
}

const NoticeContext = createContext<NoticeApi | undefined>(undefined);

/** Feedback stays outside the document layout. */
export function NotificationProvider(props: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const [items, setItems] = useState<readonly Notice[]>([]);
  const sequence = useRef(0);

  const api = useMemo<NoticeApi>(
    () => ({
      notify(message, tone = "info") {
        const id = ++sequence.current;
        setItems((current) =>
          current.some((item) => item.message === message && item.tone === tone)
            ? current
            : current.length < 5
              ? [...current, { id, message, tone }]
              : [
                  ...current.slice(0, 4),
                  {
                    id,
                    message,
                    tone: current[4].tone === "error" || tone === "error" ? "error" : "info",
                    count: (current[4].count ?? 1) + 1,
                  },
                ],
        );
      },
    }),
    [],
  );

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <NoticeContext.Provider value={api}>
      {props.children}
      <aside aria-label={t("app.notifications")} className="notifications">
        {items.map((item) => (
          <Notification item={item} key={item.id} dismiss={dismiss} />
        ))}
      </aside>
    </NoticeContext.Provider>
  );
}

function Notification({
  item,
  dismiss,
}: {
  item: Notice;
  dismiss(id: number): void;
}) {
  const { t } = useTranslation();
  const hovered = useRef(false);
  const focused = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const resume = () => {
    window.clearTimeout(timer.current);
    if (item.tone === "error" || hovered.current || focused.current) return;
    timer.current = window.setTimeout(() => dismiss(item.id), 8_000);
  };
  useEffect(() => {
    resume();
    return () => window.clearTimeout(timer.current);
  }, [item.id, item.tone, dismiss]);
  const Icon =
    item.tone === "error"
      ? CircleAlert
      : item.tone === "success"
        ? CircleCheck
        : Info;
  return (
    <div
      className={`notification is-${item.tone}`}
      role={item.tone === "error" ? "alert" : "status"}
      onPointerOver={() => {
        hovered.current = true;
        window.clearTimeout(timer.current);
      }}
      onPointerOut={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          hovered.current = false;
          resume();
        }
      }}
      onFocus={() => {
        focused.current = true;
        window.clearTimeout(timer.current);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false;
          resume();
        }
      }}
    >
      <Icon aria-hidden="true" size={16} />
      <span>
        {item.count
          ? t("app.notificationOverflow", {
              count: item.count,
              message: item.message,
            })
          : item.message}
      </span>
      <button
        aria-label={t("app.dismiss")}
        onClick={() => dismiss(item.id)}
        type="button"
      >
        <X aria-hidden="true" size={15} />
      </button>
    </div>
  );
}

export function useNotice() {
  const value = useContext(NoticeContext);
  if (!value)
    throw new Error("useNotice must be used inside NotificationProvider");
  return value;
}
