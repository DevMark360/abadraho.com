import { AppShell } from "@/components/layout/app-shell";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

export default function BrokerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div className={cn(designTw.shellMain, "bg-zinc-50 p-6 lg:p-8")}>{children}</div>
    </AppShell>
  );
}
