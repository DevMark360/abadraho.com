import type { LucideIcon } from "lucide-react";
import {
  ArrowUpDown,
  Baby,
  Battery,
  Building2,
  Camera,
  Car,
  Coffee,
  Dumbbell,
  Flame,
  Home,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
  Trees,
  Users,
  Waves,
  Wifi,
  Zap,
  CheckCircle2,
} from "lucide-react";

type IconRule = {
  pattern: RegExp;
  icon: LucideIcon;
};

const AMENITY_ICON_RULES: IconRule[] = [
  { pattern: /pool|swim/i, icon: Waves },
  { pattern: /gym|fitness|exercise/i, icon: Dumbbell },
  { pattern: /parking|car park|basement/i, icon: Car },
  { pattern: /security|guard|gated/i, icon: ShieldCheck },
  { pattern: /cctv|camera|surveillance/i, icon: Camera },
  { pattern: /generator|backup power|ups/i, icon: Battery },
  { pattern: /elevator|lift/i, icon: ArrowUpDown },
  { pattern: /mosque|prayer/i, icon: Building2 },
  { pattern: /garden|landscap|green belt|theme park/i, icon: Trees },
  { pattern: /playground|play area|kids/i, icon: Baby },
  { pattern: /community|club|lounge|rooftop/i, icon: Users },
  { pattern: /wifi|internet|broadband/i, icon: Wifi },
  { pattern: /electric/i, icon: Zap },
  { pattern: /gas|sui gas/i, icon: Flame },
  { pattern: /water|boring|supply/i, icon: Waves },
  { pattern: /cafeteria|coffee|food/i, icon: Coffee },
  { pattern: /concierge|reception/i, icon: Sparkles },
  { pattern: /intercom|access control/i, icon: Lock },
  { pattern: /fire|safety/i, icon: Shield },
  { pattern: /lobby|entrance/i, icon: Home },
];

export function resolveFeatureIcon(name: string): LucideIcon {
  const normalized = name.trim();
  for (const rule of AMENITY_ICON_RULES) {
    if (rule.pattern.test(normalized)) return rule.icon;
  }
  return CheckCircle2;
}
