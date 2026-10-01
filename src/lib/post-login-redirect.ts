import { getAccountHomePath } from "@/config/account-nav";

/**
 * Same-site relative path only. Browsers treat a backslash like "/", so "/\evil.com" leaves the
 * site just like "//evil.com"; control characters (tab/newline) are stripped by URL parsing and
 * can turn into the same trick.
 */
export function isSafeRelativePath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(path)
  );
}

/** Safe post-login destination: `ref` when allowed, else role home. */
export function getPostLoginRedirect(
  userTypeId?: number | null,
  role?: string | null,
  ref?: string | null
): string {
  if (ref && ref !== "/" && isSafeRelativePath(ref)) {
    return ref;
  }
  return getAccountHomePath(userTypeId, role);
}
