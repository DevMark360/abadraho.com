type Header = { key: string; value: string };

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function shouldEnableHsts(): boolean {
  if (isDev()) return false;
  if (process.env.ENABLE_HSTS === "true") return true;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "";
  return appUrl.startsWith("https://");
}

function buildContentSecurityPolicy(): string {
  const dev = isDev();
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:", ...(dev ? ["http:"] : [])],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.tile.openstreetmap.org",
      "https://*.basemaps.cartocdn.com",
      "https://server.arcgisonline.com",
    ],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };

  if (!dev && shouldEnableHsts()) {
    directives["upgrade-insecure-requests"] = [];
  }

  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/** Security headers applied to all routes via next.config.ts */
export function getSecurityHeaders(): Header[] {
  const headers: Header[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
  ];

  if (shouldEnableHsts()) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
