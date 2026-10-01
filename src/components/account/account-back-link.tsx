import Link from "next/link";

export function AccountBackLink() {
  return (
    <Link href="/account" className="mb-4 inline-block text-sm text-zinc-500 hover:underline">
      ← My account
    </Link>
  );
}
