import { redirect } from "next/navigation";
import type { Route } from "next";

type Props = { params: Promise<{ path?: string[] }> };

/** Legacy /agent/* URLs → /broker/* */
export default async function AgentRedirectPage({ params }: Props) {
  const { path = [] } = await params;
  const suffix = path.length ? `/${path.join("/")}` : "";
  redirect(`/broker${suffix}` as Route);
}
