import { AppShell } from "@/components/layout/app-shell";
import { AdvertisingGate } from "@/components/advertising/advertising-gate";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

/**
 * The auth-check + dashboard fetch lives here (not per-page) so navigating between
 * /advertising pages doesn't re-run it and flash "Loading advertising portal..." every time
 * — the gate mounts once per portal session and persists across child route navigations.
 */
export default function AdvertisingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <div className={cn(designTw.shellMain, "bg-zinc-50 p-6 lg:p-8")}>
        <AdvertisingGate>{children}</AdvertisingGate>
      </div>
    </AppShell>
  );
}
