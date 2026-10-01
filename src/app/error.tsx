"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 p-6 text-center">
      <h1 className="text-xl font-semibold text-zinc-900">Something went wrong</h1>
      <p className="max-w-md text-sm text-zinc-600">
        Try refreshing. If this keeps happening, stop other dev servers, delete the{" "}
        <code className="rounded bg-zinc-200 px-1">.next</code> folder, and run{" "}
        <code className="rounded bg-zinc-200 px-1">npm run dev</code> again from{" "}
        <code className="rounded bg-zinc-200 px-1">abadraho-v2</code>.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-white"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
