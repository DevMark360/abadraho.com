"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthPageFallback } from "@/components/auth/auth-page-fallback";
import { AuthTabs, type AuthTab } from "@/components/auth/auth-tabs";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";

function UnifiedAuthInner() {
  const searchParams = useSearchParams();
  const tab: AuthTab = searchParams.get("tab") === "register" ? "register" : "signin";

  return (
    <AuthFormCard
      title={tab === "register" ? "Join AbadRaho" : "Welcome back"}
      subtitle={
        tab === "register"
          ? "Save wishlists, compare projects, and contact developers"
          : "One sign-in for buyers, agents, builders, and staff"
      }
      logoHref="/"
    >
      {tab === "register" ? (
        <>
          <AuthTabs active="register" />
          <RegisterForm embedded />
        </>
      ) : (
        <>
          <AuthTabs active="signin" />
          <LoginForm embedded />
        </>
      )}
    </AuthFormCard>
  );
}

export function UnifiedAuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <UnifiedAuthInner />
    </Suspense>
  );
}
