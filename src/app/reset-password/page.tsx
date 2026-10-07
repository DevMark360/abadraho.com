import { Suspense } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthPageFallback } from "@/components/auth/auth-page-fallback";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetRequestForm } from "@/components/auth/reset-request-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Reset password",
  description: "Get a link to reset your AbadRaho password.",
  path: "/reset-password",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      panelTitle="Locked out? It happens."
      panelDescription="We will email you a secure link to choose a new password. Your wishlists and saved projects stay as they are."
    >
      {/* The form reads ?email= with useSearchParams, which needs a Suspense boundary. */}
      <AuthProvider>
        <Suspense fallback={<AuthPageFallback />}>
          <ResetRequestForm />
        </Suspense>
      </AuthProvider>
    </AuthPageShell>
  );
}
