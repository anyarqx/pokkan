const allowedLinkProtocols = new Set([
  "https:",
  "http:",
  "mailto:",
  "discord:",
]);

/** Imported links may use web, email or Discord destinations, never arbitrary schemes. */
export function isSafeLink(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value);
    return allowedLinkProtocols.has(url.protocol);
  } catch {
    return false;
  }
}
