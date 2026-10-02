import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function FloatingSupport() {
  return (
    <Link
      href="/contact"
      className="floating-support-link bg-gradient-to-b from-zinc-700 to-zinc-900 text-white shadow-clay-btn transition-transform hover:-translate-y-0.5 hover:from-zinc-600"
    >
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
      <span className="floating-support-label">Support</span>
    </Link>
  );
}
