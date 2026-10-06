import Image from "next/image";
import { Button } from "@/components/ui/button";

export function OAuthButtons({ refPath }: { refPath?: string }) {
  const oauthRef =
    refPath && refPath.startsWith("/") ? `?ref=${encodeURIComponent(refPath)}` : "";

  return (
    <div className="mt-4 space-y-2">
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-200" />
        </div>
        <p className="relative mx-auto w-fit bg-white px-2 text-xs text-zinc-400">
          or continue with
        </p>
      </div>
      <Button asChild variant="outline" className="w-full">
        <a href={`/auth/google${oauthRef}`} className="gap-2.5">
          {/* Decorative: the button text already says Google. 96px source, shown at 20px. */}
          <Image src="/icons/brand/google.png" alt="" aria-hidden width={20} height={20} className="h-5 w-5 shrink-0" />
          Continue with Google
        </a>
      </Button>
      {/* Facebook login hidden for now — /auth/facebook routes still exist; add the button back to re-enable. */}
    </div>
  );
}
