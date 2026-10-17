import { ImageOff, LoaderCircle, Paperclip } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type MediaState = "loading" | "ready" | "error" | "attachment";

const statusCache = new Map<string, MediaState>();

/** Client-only image state: URLs stay untouched and failed previews never collapse the message. */
export function RemoteMedia({
  url,
  alt,
}: Readonly<{ url: string; alt: string }>) {
  const { t } = useTranslation();
  const [state, setState] = useState<MediaState>(() => statusFor(url));

  useEffect(() => {
    setState(statusFor(url));
  }, [url]);
  if (state === "attachment")
    return (
      <span
        aria-label={t("app.attachmentMedia")}
        className="remote-media-state is-attachment"
        role="img"
        title={t("app.attachmentMedia")}
      >
        <Paperclip aria-hidden="true" size={20} />
      </span>
    );
  if (!url)
    return (
      <span
        aria-label={t("app.addMediaUrl")}
        className="remote-media-state is-empty"
        role="img"
        title={t("app.addMediaUrl")}
      >
        <ImageOff aria-hidden="true" size={20} />
      </span>
    );

  const update = (next: MediaState) => {
    statusCache.set(url, next);
    setState(next);
  };
  return (
    <>
      <img
        alt={alt}
        className={`media-${state}`}
        loading="lazy"
        onError={() => update("error")}
        onLoad={() => update("ready")}
        referrerPolicy="no-referrer"
        src={url}
      />
      {state === "loading" ? (
        <span
          aria-label={t("app.loadingMedia")}
          className="remote-media-state is-loading"
          role="status"
          title={t("app.loadingMedia")}
        >
          <LoaderCircle aria-hidden="true" size={20} />
        </span>
      ) : null}
      {state === "error" ? (
        <span
          aria-label={t("app.imageUnavailable")}
          className="remote-media-state is-error"
          role="img"
          title={t("app.imageUnavailable")}
        >
          <ImageOff aria-hidden="true" size={20} />
        </span>
      ) : null}
    </>
  );
}

function statusFor(url: string): MediaState {
  if (!url) return "error";
  if (url.startsWith("attachment://")) return "attachment";
  return statusCache.get(url) ?? "loading";
}
