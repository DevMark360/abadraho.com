import { redirect } from "next/navigation";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const q = new URLSearchParams();
  if (ref) q.set("ref", ref);
  else q.set("ref", "/admin/dashboard");
  redirect(`/login?${q.toString()}`);
}
