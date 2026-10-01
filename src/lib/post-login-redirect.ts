import { getAccountHomePath } from "@/config/account-nav";

/** Safe post-login destination: `ref` when allowed, else role home. */
export function getPostLoginRedirect(
  userTypeId?: number | null,
  role?: string | null,
  ref?: string | null
): string {
  if (ref && ref !== "/" && ref.startsWith("/") && !ref.startsWith("//")) {
    return ref;
  }
  return getAccountHomePath(userTypeId, role);
}
