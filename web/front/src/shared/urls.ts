const blockedLinkProtocols = new Set(["javascript:", "data:", "vbscript:"]);

/** Keep literal browser destinations while blocking executable URL schemes. */
export function isSafeLink(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value, "https://pokkan.invalid");
    return !blockedLinkProtocols.has(url.protocol);
  } catch {
    return false;
  }
}
