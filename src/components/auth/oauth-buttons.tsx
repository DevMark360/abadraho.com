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
        <a href={`/auth/google${oauthRef}`}>Continue with Google</a>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <a href={`/auth/facebook${oauthRef}`}>Continue with Facebook</a>
      </Button>
    </div>
  );
}
