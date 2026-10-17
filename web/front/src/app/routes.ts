export function kitsPath(locale: string, id?: string) {
  return `/${locale}/kits${id ? `/${id}` : ""}`;
}

export function sendKitPath(locale: string, kit?: string) {
  return `${kitsPath(locale)}?${kit ? new URLSearchParams({ kit }) : "send"}`;
}
