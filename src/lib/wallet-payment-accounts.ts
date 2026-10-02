/**
 * Where builders send manual wallet top-ups, read from .env (server-only — the wallet API
 * passes the list to the page). Every field is optional; an account shows only when its
 * number is set. Banks: WALLET_BANK_* and, for extra banks, WALLET_BANK_2_*, WALLET_BANK_3_*.
 *
 *   WALLET_BANK_NAME, WALLET_BANK_ACCOUNT_TITLE, WALLET_BANK_ACCOUNT_NUMBER, WALLET_BANK_IBAN
 *   WALLET_JAZZCASH_NUMBER, WALLET_JAZZCASH_TITLE
 *   WALLET_EASYPAISA_NUMBER, WALLET_EASYPAISA_TITLE
 */
export type WalletPaymentAccount = {
  label: string;
  fields: Array<{ name: string; value: string }>;
};

function env(key: string): string {
  return process.env[key]?.trim().replace(/^"(.*)"$/, "$1") ?? "";
}

function compact(fields: Array<{ name: string; value: string }>) {
  return fields.filter((f) => f.value);
}

export function getWalletPaymentAccounts(): WalletPaymentAccount[] {
  const accounts: WalletPaymentAccount[] = [];

  for (const prefix of ["WALLET_BANK", "WALLET_BANK_2", "WALLET_BANK_3"]) {
    const number = env(`${prefix}_ACCOUNT_NUMBER`);
    const iban = env(`${prefix}_IBAN`);
    if (!number && !iban) continue;
    accounts.push({
      label: env(`${prefix}_NAME`) || "Bank transfer",
      fields: compact([
        { name: "Account title", value: env(`${prefix}_ACCOUNT_TITLE`) },
        { name: "Account number", value: number },
        { name: "IBAN", value: iban },
      ]),
    });
  }

  for (const [prefix, label] of [
    ["WALLET_JAZZCASH", "JazzCash"],
    ["WALLET_EASYPAISA", "Easypaisa"],
  ] as const) {
    const number = env(`${prefix}_NUMBER`);
    if (!number) continue;
    accounts.push({
      label,
      fields: compact([
        { name: "Account title", value: env(`${prefix}_TITLE`) },
        { name: "Mobile account", value: number },
      ]),
    });
  }

  return accounts;
}
