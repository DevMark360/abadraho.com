/** Build absolute URL in the browser using the current origin (not build-time localhost). */
export function clientAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    if (typeof window !== "undefined") {
      try {
        const parsed = new URL(pathOrUrl);
        if (
          parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1"
        ) {
          const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
          return `${window.location.origin}${path}`;
        }
      } catch {
        /* use as-is */
      }
    }
    return pathOrUrl;
  }
  if (typeof window === "undefined") return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${window.location.origin}${path}`;
}
