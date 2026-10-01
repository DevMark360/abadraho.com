import { Suspense } from "react";
import { AgentAttributionTracker } from "@/components/project-detail/agent-attribution-tracker";

export function AgentAttributionRoot() {
  return (
    <Suspense fallback={null}>
      <AgentAttributionTracker />
    </Suspense>
  );
}
