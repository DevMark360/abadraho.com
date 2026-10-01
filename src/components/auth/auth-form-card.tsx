import Link from "next/link";
import { AbadrahoLogo } from "@/components/brand/abadraho-logo";
import { cn } from "@/lib/utils";

export function AuthFormCard({
  title,
  subtitle,
  logoHref = "/",
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  logoHref?: string | null;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm",
        className
      )}
    >
      {logoHref != null && (
        <div className="mb-6">
          <AbadrahoLogo href={logoHref} height={44} />
        </div>
      )}
      <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      {children}
      {footer ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-4">{footer}</div>
      ) : null}
    </div>
  );
}

export function AuthFormFooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href as "/"} className="block text-center text-sm text-zinc-500 hover:text-zinc-800 hover:underline">
      {children}
    </Link>
  );
}
