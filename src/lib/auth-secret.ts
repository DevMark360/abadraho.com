/** Edge-safe auth secret accessor (no Node crypto imports). */

export function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s === "change-me-in-production") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }
    return "dev-auth-secret-change-me";
  }
  return s;
}
