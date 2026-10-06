import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Phone numbers, shared by forms (live validation) and API routes (server validation).
 *
 * Storage format: international digits without "+" (e.g. 923001234567, 971501234567), the same
 * shape WhatsApp Cloud API expects. Older rows may hold local Pakistani digits (03001234567);
 * splitStoredPhone() understands both.
 */
export const DEFAULT_PHONE_COUNTRY: CountryCode = "PK";

export type PhoneCountryOption = { code: CountryCode; name: string; dial: string };

let countryOptionsCache: PhoneCountryOption[] | null = null;

/** All countries with dial codes, sorted by name (Pakistan first). */
export function phoneCountryOptions(): PhoneCountryOption[] {
  if (countryOptionsCache) return countryOptionsCache;
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const list = getCountries().map((code) => ({
    code,
    name: names.of(code) ?? code,
    dial: `+${getCountryCallingCode(code)}`,
  }));
  list.sort((a, b) =>
    a.code === DEFAULT_PHONE_COUNTRY ? -1 : b.code === DEFAULT_PHONE_COUNTRY ? 1 : a.name.localeCompare(b.name)
  );
  countryOptionsCache = list;
  return list;
}

export function countryName(code: CountryCode): string {
  return phoneCountryOptions().find((c) => c.code === code)?.name ?? code;
}

export function isCountryCode(value: string | null | undefined): value is CountryCode {
  return Boolean(value) && (getCountries() as string[]).includes(value as string);
}

export type PhoneCheck =
  | { ok: true; stored: string; e164: string }
  | { ok: false; message: string };

/**
 * Validate a number typed for a country (live in the form, and again on the server).
 * `national` may include spaces, dashes, or a leading 0; it may also be a full +number.
 */
export function checkPhone(national: string, country: CountryCode): PhoneCheck {
  const raw = national.trim();
  if (!raw) return { ok: false, message: "Phone number is required." };
  if (/[^\d\s()+.-]/.test(raw)) return { ok: false, message: "Use digits only." };

  const label = `${countryName(country)} (+${getCountryCallingCode(country)})`;
  const length = validatePhoneNumberLength(raw, country);
  if (length === "TOO_SHORT") return { ok: false, message: `Too short for ${label}.` };
  if (length === "TOO_LONG") return { ok: false, message: `Too long for ${label}.` };
  if (length === "INVALID_COUNTRY") return { ok: false, message: "Choose a country code." };

  const parsed = parsePhoneNumberFromString(raw, country);
  if (!parsed || !parsed.isValid()) {
    return { ok: false, message: `Not a valid ${countryName(country)} number.` };
  }
  return { ok: true, stored: parsed.number.slice(1), e164: parsed.number };
}

/** Server-side: validate an already-combined value (stored digits, +number, or legacy local). */
export function checkStoredPhone(value: string): PhoneCheck {
  const { country, national } = splitStoredPhone(value);
  return checkPhone(national, country);
}

/**
 * Split a saved value back into country + national number for editing.
 * Accepts international digits (923001234567), "+92 300…", or legacy local (03001234567).
 */
export function splitStoredPhone(value: string | null | undefined): {
  country: CountryCode;
  national: string;
} {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return { country: DEFAULT_PHONE_COUNTRY, national: "" };
  // Legacy Pakistani local formats: 03xxxxxxxxx (11) or 3xxxxxxxxx (10).
  if (/^0\d{10}$/.test(digits) || /^3\d{9}$/.test(digits)) {
    return { country: "PK", national: digits.replace(/^0/, "") };
  }
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  if (parsed?.country) return { country: parsed.country, national: parsed.nationalNumber };
  return { country: DEFAULT_PHONE_COUNTRY, national: digits };
}

/**
 * Every saved form of the same number, for duplicate checks: the international digits plus the
 * legacy Pakistani local forms (03xxxxxxxxx / 3xxxxxxxxx) older rows may hold.
 */
export function phoneLookupVariants(stored: string): string[] {
  const digits = stored.replace(/\D/g, "");
  const { country, national } = splitStoredPhone(digits);
  const variants = new Set([digits]);
  if (country === "PK" && national) {
    variants.add(`92${national}`);
    variants.add(`0${national}`);
    variants.add(national);
  }
  return [...variants];
}
