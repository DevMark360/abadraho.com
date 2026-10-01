"use client";

import { useEffect } from "react";
import { CSRF_HEADER } from "@/lib/csrf-edge";
import { ensureCsrfCookie, readCsrfCookie } from "@/lib/client/api-fetch";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.pathname;
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

/**
 * Patches window.fetch so existing `fetch("/api/...")` calls include CSRF headers.
 * Also primes the CSRF cookie on first load.
 */
export function CsrfBootstrap() {
  useEffect(() => {
    void ensureCsrfCookie();

    const original = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = requestMethod(input, init);
      const needsCsrf = url.includes("/api/") && MUTATING.has(method);

      if (!needsCsrf) {
        return original(input, init);
      }

      await ensureCsrfCookie();
      const token = readCsrfCookie();
      if (!token) {
        return original(input, init);
      }

      if (input instanceof Request) {
        const headers = new Headers(input.headers);
        headers.set(CSRF_HEADER, token);
        return original(new Request(input, { headers }));
      }

      const headers = new Headers(init?.headers);
      headers.set(CSRF_HEADER, token);
      return original(input, {
        ...init,
        headers,
        credentials: init?.credentials ?? "same-origin",
      });
    };

    return () => {
      window.fetch = original;
    };
  }, []);

  return null;
}
