import { Link, useParams } from "react-router";
import { defaultLocale } from "../app/i18n";

export function Brand() {
  const { locale = defaultLocale } = useParams();
  return (
    <Link aria-label="Pokkan" className="brand" to={`/${locale}`}>
      <img alt="" src="/pokkanicon.svg" width="28" height="28" />
      <span>Pokkan</span>
    </Link>
  );
}
