import { Github, MessageCircle, Youtube } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

const defaults = {
  support: "https://discord.gg/aUcMJW7UGD",
  youtube: "https://youtube.com/@pokkanbot",
  github: "https://github.com/anyarqx/pokkan",
} as const;

export function docsUrl(locale: string, page = "guide/start") {
  return `https://docs.pokkan.net/${locale.toLowerCase()}/${page}/`;
}

export const siteLinks = {
  support: publicUrl(import.meta.env.VITE_SUPPORT_URL, defaults.support),
  youtube: publicUrl(import.meta.env.VITE_YOUTUBE_URL, defaults.youtube),
  github: publicUrl(import.meta.env.VITE_GITHUB_URL, defaults.github),
  creator: import.meta.env.VITE_CREATOR_LABEL?.trim() || "©anyarqx, serene1491",
} as const;

export function ResourceLinks({
  className = "resource-links",
  supportPath,
}: Readonly<{ className?: string; supportPath: string }>) {
  const { t } = useTranslation();
  return (
    <span className={className}>
      <Link
        aria-label={t("app.report")}
        title={t("app.report")}
        to={supportPath}
      >
        <MessageCircle aria-hidden="true" size={16} />
      </Link>
      <a
        aria-label={t("app.youtube")}
        href={siteLinks.youtube}
        rel="noreferrer"
        target="_blank"
        title={t("app.youtube")}
      >
        <Youtube aria-hidden="true" size={16} />
      </a>
      <a
        aria-label={t("app.github")}
        href={siteLinks.github}
        rel="noreferrer"
        target="_blank"
        title={t("app.github")}
      >
        <Github aria-hidden="true" size={16} />
      </a>
    </span>
  );
}

function publicUrl(value: string | undefined, fallback: string) {
  try {
    const url = new URL(value?.trim() || fallback);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
