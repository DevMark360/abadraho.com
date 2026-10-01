import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-edge";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

let csrfBootstrap: Promise<void> | null = null;

/** Ensure a valid CSRF cookie exists before a state-changing request. */
export function ensureCsrfCookie(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (readCsrfCookie()) return Promise.resolve();
  if (!csrfBootstrap) {
    csrfBootstrap = fetch("/api/v1/csrf", { credentials: "same-origin" })
      .then(() => undefined)
      .finally(() => {
        csrfBootstrap = null;
      });
  }
  return csrfBootstrap;
}

/**
 * Same-origin fetch wrapper — attaches CSRF header on POST/PUT/PATCH/DELETE to /api/*.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.pathname
        : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const isApiMutation = url.includes("/api/") && MUTATING.has(method);

  const headers = new Headers(init?.headers);
  if (isApiMutation) {
    await ensureCsrfCookie();
    const token = readCsrfCookie();
    if (token) headers.set(CSRF_HEADER, token);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? "same-origin",
  });
}

type JsonRecord = Record<string, unknown>;

/** Parse JSON safely — avoids "Unexpected end of JSON input" on empty 500 responses. */
export async function parseFetchJson<T extends JsonRecord = JsonRecord>(
  res: Response
): Promise<{ ok: boolean; data: T | null; message: string }> {
  const text = await res.text();
  if (!text.trim()) {
    const fallback =
      res.status >= 500
        ? `Server error (${res.status}). The upload may be too large for the server — try a smaller PDF or check hosting limits.`
        : res.status === 413
          ? "Upload too large for the server."
          : `Empty response from server (${res.status}).`;
    return { ok: false, data: null, message: fallback };
  }

  try {
    const data = JSON.parse(text) as T;
    const message =
      typeof data.message === "string"
        ? data.message
        : res.ok
          ? ""
          : `Request failed (${res.status})`;
    return { ok: res.ok && data.success !== false, data, message };
  } catch {
    return {
      ok: false,
      data: null,
      message: `Invalid server response (${res.status}).`,
    };
  }
}
