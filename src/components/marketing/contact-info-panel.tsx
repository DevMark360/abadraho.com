import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { businessConfig } from "@/config/business";
import { designTw } from "@/config/design-tokens";

const HOURS = "Mon–Sat, 10:00 AM – 7:00 PM PKT";
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();

export function ContactInfoPanel() {
  return (
    <div className={designTw.publicCard + " space-y-5 p-6"}>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Get in touch</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
          Mark Properties advisors respond to buyer inquiries, site visit requests, and
          partnership questions.
        </p>
      </div>
      <ul className="space-y-4 text-sm">
        <li className="flex gap-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="font-medium text-zinc-900">Email</p>
            <a
              href={`mailto:${businessConfig.email}`}
              className="text-zinc-600 hover:text-brand hover:underline"
            >
              {businessConfig.email}
            </a>
          </div>
        </li>
        {businessConfig.phone ? (
          <li className="flex gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="font-medium text-zinc-900">Phone</p>
              <a
                href={`tel:${businessConfig.phone}`}
                className="text-zinc-600 hover:text-brand hover:underline"
              >
                {businessConfig.phone}
              </a>
            </div>
          </li>
        ) : null}
        {WHATSAPP ? (
          <li className="flex gap-3">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="font-medium text-zinc-900">WhatsApp</p>
              <a
                href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 hover:text-brand hover:underline"
              >
                Chat on WhatsApp
              </a>
            </div>
          </li>
        ) : null}
        <li className="flex gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="font-medium text-zinc-900">Office hours</p>
            <p className="text-zinc-600">{HOURS}</p>
          </div>
        </li>
      </ul>
    </div>
  );
}
