import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function FloatingSupport() {
  return (
    <Link
      href="/contact"
      className="floating-support-link bg-lime-400 text-zinc-900 transition-transform hover:scale-105 hover:bg-lime-300"
    >
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
      <span className="floating-support-label">Support</span>
    </Link>
  );
}
