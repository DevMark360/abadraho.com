import { aiTxtResponse } from "@/lib/ai-txt";

// Per request so links use the server's runtime site URL (see getSiteUrl).
export const dynamic = "force-dynamic";

export function GET() {
  return aiTxtResponse();
}
