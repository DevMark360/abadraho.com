import Link from "next/link";
import { Button } from "@/components/ui/button";
import { designTw } from "@/config/design-tokens";

export default function AdminForbiddenPage() {
  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center px-4 ${designTw.pageCanvas}`}
    >
      <div className="max-w-md rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Access not allowed</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Your account does not have permission to use this part of the admin panel.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/admin/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to site</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
