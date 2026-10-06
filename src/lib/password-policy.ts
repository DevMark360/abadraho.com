/**
 * Password rules for new accounts, shared by the signup form (live checklist) and the API.
 */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "digit", label: "One number (0-9)", test: (p: string) => /\d/.test(p) },
  {
    id: "special",
    label: "One special character (!@#$…)",
    test: (p: string) => /[^A-Za-z0-9\s]/.test(p),
  },
] as const;

export const PASSWORD_MAX_LENGTH = 128;

/** null when valid, otherwise the first unmet rule as a sentence. */
export function passwordProblem(password: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) return "Password is too long (max 128 characters).";
  const missing = PASSWORD_RULES.find((r) => !r.test(password));
  // Lowercase only the first letter ("(A-Z)" must stay uppercase).
  return missing ? `Password needs: ${missing.label[0].toLowerCase()}${missing.label.slice(1)}.` : null;
}
