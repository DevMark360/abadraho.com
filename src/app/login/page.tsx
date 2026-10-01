import { buildPageMetadata } from "@/lib/seo";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { UnifiedAuthPage } from "@/components/auth/unified-auth-page";

export const metadata = buildPageMetadata({
  title: "Sign in",
  description: "Sign in or create an account on AbadRaho to access property listings, wishlists, and payment plans.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <AuthPageShell panelDescription="Sign in or create an account. Your role decides where you land — listings, agent portal, or workspace.">
      <UnifiedAuthPage />
    </AuthPageShell>
  );
}
