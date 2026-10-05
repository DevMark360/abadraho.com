"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { AccountBackLink } from "@/components/account/account-back-link";
import {
  AccountFormCard,
  AccountFormField,
  AccountFormSection,
  AccountPageHeader,
  AccountSignInGate,
} from "@/components/account/account-form-ui";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { PhoneVerifyPanel } from "@/components/auth/phone-verify-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-state";

type Profile = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  aboutMe?: string | null;
  emailVerified?: boolean;
  isPhoneNoVerified?: boolean;
};

export function ProfilePageClient() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, refresh } = useAuth();
  const [user, setUser] = useState<Profile | null>(null);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "error" | "info">("ok");
  const [devVerifyLink, setDevVerifyLink] = useState("");
  const [saving, setSaving] = useState(false);

  const firstNameId = useId();
  const lastNameId = useId();
  const phoneId = useId();
  const addressId = useId();
  const cityId = useId();
  const aboutId = useId();
  const emailId = useId();

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setUser(null);
      return;
    }
    setUser(authUser);
    fetch("/api/v1/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (j.user) setUser(j.user);
      })
      .catch(() => undefined);
  }, [authUser, authLoading]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        phoneNumber: fd.get("phoneNumber"),
        address: fd.get("address"),
        city: fd.get("city"),
        aboutMe: fd.get("aboutMe"),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.success) {
      setUser(json.user);
      setMsgTone("ok");
      setMsg("Profile updated successfully.");
      await refresh();
      router.refresh();
    } else {
      setMsgTone("error");
      setMsg(json.message ?? "Could not update profile. Try again.");
    }
  }

  async function resendEmail() {
    const res = await fetch("/api/v1/auth/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "resend" }),
    });
    const json = await res.json();
    if (json.verifyUrlDev) setDevVerifyLink(json.verifyUrlDev);
    setMsgTone(json.success === false ? "error" : "info");
    setMsg(json.message ?? "Verification email sent.");
  }

  if (authLoading) {
    return <LoadingState size="md" label="Loading profile…" />;
  }

  if (!authUser) {
    return (
      <>
        <AccountBackLink />
        <div className="mt-6">
          <AccountSignInGate
            title="Sign in to view your profile"
            description="Update your contact details, verify your email and WhatsApp number, and manage account settings."
            returnPath="/account/profile"
          />
        </div>
      </>
    );
  }

  const profile = user ?? authUser;

  return (
    <div className="mx-auto w-full max-w-6xl pb-8">
      <AccountBackLink />
      <div className="mt-2">
        <AccountPageHeader
          title="Profile"
          description="Keep your contact details up to date for inquiries and payment schedules."
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0">
          <form onSubmit={save} className="space-y-6">
            <AccountFormCard>
              <AccountFormSection
                title="Personal details"
                description="Your name appears on inquiries and account records."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <AccountFormField id={firstNameId} label="First name" required>
                    <Input
                      id={firstNameId}
                      name="firstName"
                      layout="inline"
                      defaultValue={profile.firstName ?? ""}
                      autoComplete="given-name"
                      required
                    />
                  </AccountFormField>
                  <AccountFormField id={lastNameId} label="Last name" required>
                    <Input
                      id={lastNameId}
                      name="lastName"
                      layout="inline"
                      defaultValue={profile.lastName ?? ""}
                      autoComplete="family-name"
                      required
                    />
                  </AccountFormField>
                </div>
              </AccountFormSection>

              <AccountFormSection
                title="Contact"
                description="Used when you inquire about a project or request documents."
              >
                <AccountFormField
                  id={phoneId}
                  label="WhatsApp number"
                  hint="Include country code if outside Pakistan."
                  required
                >
                  <Input
                    id={phoneId}
                    name="phoneNumber"
                    type="tel"
                    layout="inline"
                    defaultValue={profile.phoneNumber ?? ""}
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                </AccountFormField>
                <AccountFormField id={addressId} label="Street address">
                  <Input
                    id={addressId}
                    name="address"
                    layout="inline"
                    defaultValue={profile.address ?? ""}
                    autoComplete="street-address"
                  />
                </AccountFormField>
                <AccountFormField id={cityId} label="City">
                  <Input
                    id={cityId}
                    name="city"
                    layout="inline"
                    defaultValue={profile.city ?? ""}
                    autoComplete="address-level2"
                  />
                </AccountFormField>
              </AccountFormSection>

              <AccountFormSection title="About you" description="Optional. Helps our team tailor follow-ups.">
                <AccountFormField id={aboutId} label="Bio / notes">
                  <Textarea
                    id={aboutId}
                    name="aboutMe"
                    layout="inline"
                    rows={4}
                    defaultValue={profile.aboutMe ?? ""}
                    placeholder="e.g. Looking for a 3-bed in DHA with post-handover plan"
                  />
                </AccountFormField>
              </AccountFormSection>

              <div className="border-t border-zinc-100 pt-5">
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </AccountFormCard>
        </form>

        {msg ? (
          <div className="mt-4">
            <AuthFormMessage variant={msgTone === "error" ? "error" : msgTone === "ok" ? "success" : "info"}>
              {msg}
            </AuthFormMessage>
        </div>
      ) : null}

        </div>

        {/* Verification, security and logout stay in view beside the form */}
        <aside className="space-y-6 lg:sticky lg:top-4">
          <AccountFormCard>
            <AccountFormSection title="Account verification">
              <AccountFormField
                id={emailId}
                label="Email address"
                //hint="Contact support to change your login email."
              >
                <Input
                  id={emailId}
                  name="email"
                  type="email"
                  layout="inline"
                  value={profile.email ?? ""}
                  readOnly
                  disabled
                  className="bg-zinc-50 text-zinc-600"
                />
              </AccountFormField>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={
                    profile.emailVerified
                      ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-emerald-100"
                      : "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-900 ring-1 ring-amber-100"
                  }
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Email {profile.emailVerified ? "verified" : "not verified"}
                </span>
                <span
                  className={
                    profile.isPhoneNoVerified
                      ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-emerald-100"
                      : "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-900 ring-1 ring-amber-100"
                  }
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Phone {profile.isPhoneNoVerified ? "verified (WhatsApp)" : "not verified"}
                </span>
              </div>

              {!profile.emailVerified ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void resendEmail()}>
                  Resend verification email
                </Button>
              ) : null}

              {devVerifyLink ? (
                <AuthFormMessage variant="info">
                  Dev verify link:{" "}
                  <a href={devVerifyLink} className="underline">
                    {devVerifyLink}
                  </a>
                </AuthFormMessage>
              ) : null}

              {!profile.isPhoneNoVerified ? (
                <PhoneVerifyPanel
                  initialPhone={profile.phoneNumber ?? ""}
                  onVerified={() => {
                    void refresh();
                    fetch("/api/v1/auth/me", { credentials: "same-origin" })
                      .then((r) => r.json())
                      .then((j) => setUser(j.user ?? null));
                  }}
                />
              ) : null}
            </AccountFormSection>
          </AccountFormCard>

          <AccountFormCard>
            <AccountFormSection title="Security">
              <p className="text-sm text-zinc-600">
                Use a strong password you do not reuse on other sites.
              </p>
              <Button asChild variant="outline">
                <Link href="/account/password">
                  <KeyRound className="h-4 w-4" aria-hidden />
                  Change password
                </Link>
              </Button>
            </AccountFormSection>
          </AccountFormCard>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
              window.location.href = "/login";
            }}
          >
            <Button type="submit" variant="outline" className="text-zinc-700">
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
