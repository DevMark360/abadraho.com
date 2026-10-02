import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { businessConfig } from "@/config/business";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

const HOURS = "Mon–Sat, 10:00 AM – 7:00 PM PKT";
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
        <div className="mt-0.5 break-words text-sm font-medium text-zinc-800">{children}</div>
      </div>
    </li>
  );
}

/** Call / WhatsApp / Email buttons — shown in the Contact page header panel. */
export function ContactQuickActions() {
  return (
    <div>
      <p className="text-sm font-semibold text-zinc-900">Reach us directly</p>
      <div className="mt-3 grid gap-2.5">
        {businessConfig.phone ? (
          <Button asChild>
            <a href={`tel:${businessConfig.phone}`}>
              <Phone className="h-4 w-4" aria-hidden />
              Call us
            </a>
          </Button>
        ) : null}
        {WHATSAPP ? (
          <Button asChild variant="outline">
            <a href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" aria-hidden />
              WhatsApp
            </a>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <a href={`mailto:${businessConfig.email}`}>
            <Mail className="h-4 w-4" aria-hidden />
            Email us
          </a>
        </Button>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {HOURS}
      </p>
    </div>
  );
}

export function ContactInfoPanel() {
  const city = businessConfig.address.addressLocality;
  return (
    <div className={cn(designTw.publicCard, "flex h-full flex-col p-6 sm:p-7")}>
      <h2 className="text-lg font-bold tracking-tight text-zinc-900">Talk to an advisor</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
        Mark Properties advisors help with project questions, site visits, payment plans, and
        partnerships.
      </p>

      <ul className={cn(designTw.clayWell, "mt-6 space-y-4 p-5")}>
        <InfoRow icon={Mail} label="Email">
          <a href={`mailto:${businessConfig.email}`} className="hover:text-brand-accent hover:underline">
            {businessConfig.email}
          </a>
        </InfoRow>
        {businessConfig.phone ? (
          <InfoRow icon={Phone} label="Phone">
            <a href={`tel:${businessConfig.phone}`} className="hover:text-brand-accent hover:underline">
              {businessConfig.phone}
            </a>
          </InfoRow>
        ) : null}
        <InfoRow icon={Clock} label="Office hours">
          {HOURS}
        </InfoRow>
        {city ? (
          <InfoRow icon={MapPin} label="Based in">
            {city}, Pakistan
          </InfoRow>
        ) : null}
      </ul>
    </div>
  );
}
