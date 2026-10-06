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
          {/* Decorative (the text says Google). Circular crop hides the square tile's corners; 96px source shown at 24px. */}
          <Image
            src="/icons/brand/google.png"
            alt=""
            aria-hidden
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
          Continue with Google
        </a>
      </Button>
      {/* Facebook login hidden for now — /auth/facebook routes still exist; add the button back to re-enable. */}
    </div>
  );
}
