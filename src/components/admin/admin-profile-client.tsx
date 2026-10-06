"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { AdminDbAlert, adminCard } from "@/components/admin/admin-ui";
import { AuthFormMessage } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { PhoneInput } from "@/components/ui/phone-input";

type Profile = {
  source: "admin" | "user";
  email: string;
  name: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  city?: string | null;
  address?: string | null;
  aboutMe?: string | null;
  imageUrl?: string | null;
};

const PLACEHOLDER_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23fafafa' width='200' height='200'/%3E%3Ccircle cx='100' cy='78' r='28' fill='%23e4e4e7'/%3E%3Cpath d='M40 168c8-32 32-48 60-48s52 16 60 48' fill='%23e4e4e7'/%3E%3C/svg%3E";

function ProfileBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-zinc-100 pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ProfileField({
  id,
  label,
  hint,
  required,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  icon?: typeof Mail;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
        {Icon ? <Icon className="h-3.5 w-3.5 text-zinc-400" aria-hidden /> : null}
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </label>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
      {children}
    </div>
  );
}

function ProfileHero({
  displayName,
  email,
  username,
  imageUrl,
}: {
  displayName: string;
  email: string;
  username?: string | null;
  imageUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const displaySrc = preview ?? imageUrl ?? PLACEHOLDER_AVATAR;

  return (
    <div className="relative overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay">
      <div className="px-5 py-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-clay-well shadow-clay-sm">
              <Image
                src={displaySrc}
                alt=""
                fill
                className="object-cover"
                unoptimized
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== PLACEHOLDER_AVATAR) img.src = PLACEHOLDER_AVATAR;
                }}
              />
            </div>
            <div className="min-w-0 max-w-full">
              <p className="break-words text-lg font-semibold tracking-tight text-zinc-900">{displayName}</p>
              <p className="mt-0.5 break-all text-sm text-zinc-600">{email}</p>
              {username ? (
                <p className="mt-1 inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  @{username}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <input
              ref={inputRef}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) {
                  setFileLabel(file.name);
                  setPreview(URL.createObjectURL(file));
                } else {
                  setFileLabel(null);
                  setPreview(null);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-white"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-4 w-4" aria-hidden />
              Upload photo
            </Button>
            {fileLabel ? (
              <p className="mt-2 max-w-[180px] truncate text-xs text-zinc-500">{fileLabel}</p>
            ) : (
              <p className="mt-2 text-xs text-zinc-400">JPG or PNG · max 2 MB</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const usernameId = useId();
  const emailId = useId();
  const firstNameId = useId();
  const lastNameId = useId();
  const phoneId = useId();
  const cityId = useId();
  const addressId = useId();
  const aboutId = useId();
  const nameId = useId();
  const adminEmailId = useId();

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((j) => {
        if (j.profile) setProfile(j.profile);
        else setError(j.message ?? "Failed to load profile");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profile");
        setLoading(false);
      });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMsg(null);
    setOk(false);

    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/profile", {
      method: "POST",
      body: fd,
    });
    const j = await res.json();
    setSaving(false);
    const success = Boolean(j.success ?? j.status);
    setOk(success);
    setMsg(j.message ?? (success ? "Profile updated successfully." : "Update failed"));
    if (success && j.profile) {
      setProfile(j.profile);
      setFormKey((k) => k + 1);
    }
  }

  if (loading) {
    return <LoadingState size="md" label="Loading profile…" />;
  }

  if (!profile) {
    return <AdminDbAlert message={error ?? "Profile not found"} />;
  }

  const isUser = profile.source === "user";
  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.name ||
    profile.username ||
    "Workspace user";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <form
        key={formKey}
        onSubmit={onSubmit}
        encType="multipart/form-data"
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <div className="min-w-0 space-y-5">
          <div className={cn(adminCard, "p-5 sm:p-6")}>
            {isUser ? (
              <>
                <ProfileBlock
                  title="Account details"
                  description="How you sign in and how your name appears in the workspace."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField id={usernameId} label="Username" required icon={UserRound}>
                      <Input
                        id={usernameId}
                        name="username"
                        layout="inline"
                        defaultValue={profile.username ?? ""}
                        autoComplete="username"
                        required
                        className="bg-white"
                      />
                    </ProfileField>
                    <ProfileField
                      id={emailId}
                      label="Email address"
                     // hint="Contact support to change your login email."
                      icon={Mail}
                    >
                      <div className="relative">
                        <Input
                          id={emailId}
                          name="email"
                          type="email"
                          layout="inline"
                          defaultValue={profile.email}
                          readOnly
                          disabled
                          className="bg-zinc-50 pr-10 text-zinc-600"
                        />
                        <Lock
                          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                          aria-hidden
                        />
                      </div>
                    </ProfileField>
                    <ProfileField id={firstNameId} label="First name" required>
                      <Input
                        id={firstNameId}
                        name="first_name"
                        layout="inline"
                        defaultValue={profile.firstName ?? ""}
                        autoComplete="given-name"
                        required
                      />
                    </ProfileField>
                    <ProfileField id={lastNameId} label="Last name">
                      <Input
                        id={lastNameId}
                        name="last_name"
                        layout="inline"
                        defaultValue={profile.lastName ?? ""}
                        autoComplete="family-name"
                      />
                    </ProfileField>
                  </div>
                </ProfileBlock>

                <ProfileBlock
                  title="Contact"
                  description="Shown on inquiries and when customers reach out to you."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField id={phoneId} label="Phone number" icon={Phone} required>
                      <PhoneInput id={phoneId} name="phone_number" defaultValue={profile.phoneNumber} />
                    </ProfileField>
                    <ProfileField id={cityId} label="City" icon={MapPin}>
                      <Input
                        id={cityId}
                        name="city"
                        layout="inline"
                        defaultValue={profile.city ?? ""}
                        autoComplete="address-level2"
                        placeholder="Karachi"
                      />
                    </ProfileField>
                    <div className="sm:col-span-2">
                      <ProfileField id={addressId} label="Street address" icon={MapPin}>
                        <Input
                          id={addressId}
                          name="Address"
                          layout="inline"
                          defaultValue={profile.address ?? ""}
                          autoComplete="street-address"
                          placeholder="Building, street, area"
                        />
                      </ProfileField>
                    </div>
                  </div>
                </ProfileBlock>

                <ProfileBlock title="About" description="Optional. A short note about your role.">
                  <ProfileField id={aboutId} label="Bio">
                    <Textarea
                      id={aboutId}
                      name="about_me"
                      layout="inline"
                      rows={3}
                      defaultValue={profile.aboutMe ?? ""}
                      placeholder="e.g. Sales lead for DHA and Clifton projects"
                      className="min-h-[5.5rem]"
                    />
                  </ProfileField>
                </ProfileBlock>
              </>
            ) : (
              <ProfileBlock title="Admin account">
                <div className="space-y-4">
                  <ProfileField id={nameId} label="Display name">
                    <Input
                      id={nameId}
                      name="name"
                      layout="inline"
                      defaultValue={profile.name ?? ""}
                      autoComplete="name"
                    />
                  </ProfileField>
                  <ProfileField id={adminEmailId} label="Email address" icon={Mail}>
                    <Input
                      id={adminEmailId}
                      name="email"
                      type="email"
                      layout="inline"
                      defaultValue={profile.email}
                      autoComplete="email"
                    />
                  </ProfileField>
                </div>
              </ProfileBlock>
            )}
          </div>

          {msg ? (
            <AuthFormMessage variant={ok ? "success" : "error"}>{msg}</AuthFormMessage>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          {isUser ? (
            <ProfileHero
              displayName={displayName}
              email={profile.email}
              username={profile.username}
              imageUrl={profile.imageUrl}
            />
          ) : (
            <div className={cn(adminCard, "flex items-start gap-3 p-5")}>
              <UserRound className="mt-1 h-5 w-5 shrink-0 text-brand-accent" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-zinc-900">{displayName}</p>
                <p className="truncate text-sm text-zinc-600">{profile.email}</p>
              </div>
            </div>
          )}

          <div className={cn(adminCard, "p-5")}>
            <p className="font-semibold text-zinc-900">Save changes</p>
            <p className="mt-1 text-sm text-zinc-500">Unsaved changes are lost on refresh.</p>
            <Button type="submit" disabled={saving} className="mt-4 w-full">
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>

          <div className={cn(adminCard, "flex items-center justify-between gap-4 p-5")}>
            <div className="flex min-w-0 items-center gap-3">
              <KeyRound className="h-5 w-5 shrink-0 text-brand-accent" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">Password</p>
                <p className="text-sm text-zinc-500">Update your sign-in password</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/admin-change-password">Change</Link>
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}
