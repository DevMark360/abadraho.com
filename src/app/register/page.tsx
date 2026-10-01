import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const q = new URLSearchParams({ tab: "register" });
  if (ref) q.set("ref", ref);
  redirect(`/login?${q.toString()}`);
}
