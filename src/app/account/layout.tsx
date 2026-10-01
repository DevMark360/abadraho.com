import { AppShell } from "@/components/layout/app-shell";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className={cn(designTw.shellMain, "bg-zinc-50 p-4 sm:p-6 lg:p-8")}>{children}</div>
    </AppShell>
  );
}
