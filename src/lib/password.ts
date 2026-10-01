import bcrypt from "bcryptjs";

/** Laravel `Hash::make` uses `$2y$`; bcryptjs expects `$2a$` / `$2b$`. */
export function normalizePasswordHash(hash: string): string {
  if (hash.startsWith("$2y$")) return `$2a$${hash.slice(4)}`;
  return hash;
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, normalizePasswordHash(hash));
  } catch {
    return false;
  }
}

export async function hashPassword(plain: string, rounds = 10): Promise<string> {
  return bcrypt.hash(plain, rounds);
}
