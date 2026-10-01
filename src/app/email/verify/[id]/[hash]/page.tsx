import { redirect } from "next/navigation";

/** Legacy Laravel link format → v2 verify page */
export default async function LegacyEmailVerifyPage({
  params,
}: {
  params: Promise<{ id: string; hash: string }>;
}) {
  const { id, hash } = await params;
  redirect(`/verify-email?id=${encodeURIComponent(id)}&hash=${encodeURIComponent(hash)}`);
}
