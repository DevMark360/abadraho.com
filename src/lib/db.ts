/** Use MySQL only when explicitly enabled and configured */
export function isDatabaseEnabled(): boolean {
  return (
    process.env.USE_DATABASE === "true" &&
    Boolean(process.env.DATABASE_URL?.includes("mysql"))
  );
}
