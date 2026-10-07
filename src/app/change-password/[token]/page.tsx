import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetTokenForm } from "@/components/auth/reset-token-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Choose a new password",
  description: "Set a new password for your AbadRaho account.",
  path: "/reset-password",
  noIndex: true,
});

export default async function ChangePasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthPageShell
      panelTitle="Almost done"
      panelDescription="Choose a new password and sign in again. The reset link works once and expires after 60 minutes."
    >
      <ResetTokenForm token={token} />
    </AuthPageShell>
  );
}
