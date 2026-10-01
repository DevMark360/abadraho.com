import { Input } from "@/components/ui/input";

export function SignInFields({
  emailPlaceholder = "Email",
  passwordPlaceholder = "Password",
  email = "",
  onEmailChange,
}: {
  emailPlaceholder?: string;
  passwordPlaceholder?: string;
  email?: string;
  onEmailChange?: (value: string) => void;
}) {
  return (
    <>
      <Input
        name="email"
        type="email"
        required
        value={onEmailChange ? email : undefined}
        defaultValue={onEmailChange ? undefined : email || undefined}
        onChange={onEmailChange ? (e) => onEmailChange(e.target.value) : undefined}
        placeholder={emailPlaceholder}
        autoComplete="email"
      />
      <Input
        name="password"
        type="password"
        required
        placeholder={passwordPlaceholder}
        autoComplete="current-password"
      />
    </>
  );
}
