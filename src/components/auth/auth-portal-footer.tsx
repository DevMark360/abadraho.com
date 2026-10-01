"use client";

import Link from "next/link";

export function AuthPortalFooter() {
  return (
    <p className="mt-6 text-center text-xs text-zinc-500">
      <Link href="/" className="hover:text-zinc-800 hover:underline">
        Browse listings
      </Link>
      <span className="mx-2">·</span>
      <Link href="/contact" className="hover:text-zinc-800 hover:underline">
        Contact support
      </Link>
    </p>
  );
}
