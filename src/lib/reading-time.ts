/** Estimate reading time from HTML or plain text (≈200 wpm). */
export function estimateReadingTime(text: string): number {
  const words = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").length;
  return Math.max(1, Math.ceil(words / 200));
}
