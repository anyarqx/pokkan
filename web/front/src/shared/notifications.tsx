import { CircleAlert, Info, X } from "lucide-react";
import {
  createContext,
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
}

interface NoticeApi {
  readonly notify: (message: string, tone?: NoticeTone) => void;
}

const NoticeContext = createContext<NoticeApi | undefined>(undefined);

/** Ephemeral feedback stays above the workspace and never reshapes it. */
export function NotificationProvider(props: Readonly<{ children: ReactNode }>) {
  const { t } = useTranslation();
  const [items, setItems] = useState<readonly Notice[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  const api = useMemo<NoticeApi>(
    () => ({
      notify(message, tone = "info") {
        const id = ++nextId.current;
        setItems((current) => [...current.slice(-3), { id, message, tone }]);
        timers.current.set(
          id,
          window.setTimeout(
            () => {
              setItems((current) => current.filter((item) => item.id !== id));
              timers.current.delete(id);
            },
            tone === "error" ? 6_000 : 4_000,
          ),
        );
      },
    }),
    [],
  );

  const dismiss = (id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  };

  return (
    <NoticeContext.Provider value={api}>
      {props.children}
      <aside aria-live="polite" className="notifications" role="status">
        {items.map((item) => (
          <div
            className={`notification is-${item.tone}`}
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
          >
            {item.tone === "error" ? (
              <CircleAlert aria-hidden="true" size={16} />
            ) : (
              <Info aria-hidden="true" size={16} />
            )}
            <span>{item.message}</span>
            <button
              aria-label={t("app.dismiss")}
              onClick={() => dismiss(item.id)}
              type="button"
            >
              <X aria-hidden="true" size={15} />
            </button>
          </div>
        ))}
      </aside>
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const value = useContext(NoticeContext);
  if (!value)
    throw new Error("useNotice must be used inside NotificationProvider");
  return value;
}
