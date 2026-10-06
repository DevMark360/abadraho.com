import { indexNowKey } from "@/server/services/indexnow.service";

/**
 * IndexNow key file (proves we own the domain). Sent as keyLocation with every ping, so it can
 * live here instead of /{key}.txt. Per request: the key is a runtime server setting.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
