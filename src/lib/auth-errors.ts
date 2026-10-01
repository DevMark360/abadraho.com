import type { ZodError } from "zod";

export const LOGIN_FAILURE = {
  EMAIL_NOT_FOUND: "email_not_found",
  WRONG_PASSWORD: "wrong_password",
  OAUTH_ONLY: "oauth_only",
  NO_WORKSPACE_ACCESS: "no_workspace_access",
} as const;

export type LoginFailureReason = (typeof LOGIN_FAILURE)[keyof typeof LOGIN_FAILURE];

export type AuthAttemptResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: LoginFailureReason; provider?: string | null };

export function loginFailureMessage(
  reason: LoginFailureReason,
  opts?: { provider?: string | null }
): string {
  switch (reason) {
    case LOGIN_FAILURE.EMAIL_NOT_FOUND:
      return "No account found with this email address.";
    case LOGIN_FAILURE.WRONG_PASSWORD:
      return "Incorrect password. Please try again.";
    case LOGIN_FAILURE.OAUTH_ONLY: {
      const provider = (opts?.provider ?? "").toUpperCase();
      if (provider === "GOOGLE") {
        return "This email is registered with Google. Use Continue with Google to sign in.";
      }
      if (provider === "FACEBOOK") {
        return "This email is registered with Facebook. Use Continue with Facebook to sign in.";
      }
      return "This email uses social sign-in. Use Google or Facebook instead of a password.";
    }
    case LOGIN_FAILURE.NO_WORKSPACE_ACCESS:
      return "No workspace account found for this email. Use member sign-in or ask your administrator.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export function resolvePublicLoginFailure(
  userAttempt: AuthAttemptResult<unknown>,
  adminAttempt: AuthAttemptResult<unknown>
): { message: string; reason: LoginFailureReason } {
  const failed = [userAttempt, adminAttempt].filter(
    (attempt): attempt is Extract<AuthAttemptResult<unknown>, { ok: false }> => !attempt.ok
  );

  const wrongPassword = failed.find((a) => a.reason === LOGIN_FAILURE.WRONG_PASSWORD);
  if (wrongPassword) {
    return {
      message: loginFailureMessage(LOGIN_FAILURE.WRONG_PASSWORD),
      reason: LOGIN_FAILURE.WRONG_PASSWORD,
    };
  }

  const oauthOnly = failed.find((a) => a.reason === LOGIN_FAILURE.OAUTH_ONLY);
  if (oauthOnly) {
    return {
      message: loginFailureMessage(LOGIN_FAILURE.OAUTH_ONLY, { provider: oauthOnly.provider }),
      reason: LOGIN_FAILURE.OAUTH_ONLY,
    };
  }

  return {
    message: loginFailureMessage(LOGIN_FAILURE.EMAIL_NOT_FOUND),
    reason: LOGIN_FAILURE.EMAIL_NOT_FOUND,
  };
}

export function resolveAdminLoginFailure(
  attempt: AuthAttemptResult<unknown>
): { message: string; reason: LoginFailureReason } {
  if (attempt.ok) {
    return {
      message: loginFailureMessage(LOGIN_FAILURE.EMAIL_NOT_FOUND),
      reason: LOGIN_FAILURE.EMAIL_NOT_FOUND,
    };
  }

  return {
    message: loginFailureMessage(attempt.reason, { provider: attempt.provider }),
    reason: attempt.reason,
  };
}

export function zodLoginValidationMessage(error: ZodError): string {
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field === "email") {
      if (issue.code === "invalid_string" || issue.code === "invalid_type") {
        return "Enter a valid email address.";
      }
    }
    if (field === "password") {
      return "Enter your password.";
    }
  }
  return "Enter your email and password.";
}

export function zodRegisterValidationMessage(error: ZodError): string {
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field === "firstName") return "First name is required.";
    if (field === "lastName") return "Last name is required.";
    if (field === "email") return "Enter a valid email address.";
    if (field === "password") {
      if (issue.code === "too_small") {
        return "Password must be at least 8 characters.";
      }
      return "Enter a password.";
    }
  }
  return "Please check the registration form and try again.";
}

export function zodPasswordChangeValidationMessage(error: ZodError): string {
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field === "currentPassword") return "Enter your current password.";
    if (field === "password") {
      if (issue.code === "too_small") {
        return "New password must be at least 8 characters.";
      }
      return "Enter a new password.";
    }
    if (field === "token") return "Reset link is missing or invalid.";
  }
  return "Please check the password form and try again.";
}

export function passwordResetEmailMismatchMessage(): string {
  return "You can only request a password reset for your own account email. Sign out first if you need to reset a different account.";
}

export function normalizeAuthEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}
