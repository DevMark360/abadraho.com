import type { AuthUser } from "@/components/auth/auth-provider";

export function authFormDefaults(user: AuthUser | null) {
  if (!user) {
    return { name: "", email: "", phone: "", address: "" };
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    name,
    email: user.email ?? "",
    phone: user.phoneNumber ?? "",
    address: [user.address, user.city].filter(Boolean).join(", ") || "",
  };
}

export function contactFormDefaults(user: AuthUser | null) {
  if (!user) {
    return { name: "", email: "", phone: "" };
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    name,
    email: user.email ?? "",
    phone: user.phoneNumber ?? "",
  };
}
