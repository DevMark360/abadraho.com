import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Payment screenshots for manual wallet top-ups. Bank receipts show account numbers and
 * names, so they are kept OUTSIDE public/ and only served through the auth-checked proof
 * routes (owning builder + admins). One file per transaction: `<transactionId>.<ext>`.
 * Like public/, this folder lives on the server only (gitignored; cp -R deploys keep it).
 */
export const WALLET_PROOF_MAX_BYTES = 5 * 1024 * 1024;

const TYPES = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
} as const;
type ProofExt = keyof typeof TYPES;

function proofDir(): string {
  return process.env.WALLET_PROOF_DIR?.trim() || path.join(process.cwd(), "storage", "wallet-proofs");
}

/** Type from the file's first bytes, not its name — a renamed .html must not pass as .png. */
function sniffExtension(buf: Buffer): ProofExt | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return ".png";
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return ".webp";
  }
  if (buf.length >= 5 && buf.toString("ascii", 0, 5) === "%PDF-") return ".pdf";
  return null;
}

export type ValidatedProof = { buffer: Buffer; ext: ProofExt };

export async function validateWalletProof(
  file: File | null
): Promise<{ ok: true; proof: ValidatedProof } | { ok: false; error: string }> {
  if (!file || !file.size) return { ok: false, error: "Attach the payment screenshot" };
  if (file.size > WALLET_PROOF_MAX_BYTES) {
    return { ok: false, error: "Screenshot must be 5MB or smaller" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = sniffExtension(buffer);
  if (!ext) return { ok: false, error: "Screenshot must be a JPG, PNG, WebP or PDF file" };
  return { ok: true, proof: { buffer, ext } };
}

export async function saveWalletProof(transactionId: number, proof: ValidatedProof): Promise<void> {
  const dir = proofDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${transactionId}${proof.ext}`), proof.buffer);
}

async function findProofPath(transactionId: number): Promise<{ file: string; ext: ProofExt } | null> {
  const dir = proofDir();
  for (const ext of Object.keys(TYPES) as ProofExt[]) {
    const file = path.join(dir, `${transactionId}${ext}`);
    try {
      if ((await stat(file)).isFile()) return { file, ext };
    } catch {
      // not this extension
    }
  }
  return null;
}

export async function hasWalletProof(transactionId: number): Promise<boolean> {
  return (await findProofPath(transactionId)) != null;
}

export async function readWalletProof(
  transactionId: number
): Promise<{ data: Buffer; contentType: string; filename: string } | null> {
  const found = await findProofPath(transactionId);
  if (!found) return null;
  return {
    data: await readFile(found.file),
    contentType: TYPES[found.ext],
    filename: `topup-${transactionId}${found.ext}`,
  };
}

export async function deleteWalletProof(transactionId: number): Promise<void> {
  const found = await findProofPath(transactionId);
  if (found) await unlink(found.file).catch(() => {});
}

/** Response for the proof routes: inline view, never cached, never sniffed into HTML. */
export function walletProofResponse(proof: { data: Buffer; contentType: string; filename: string }) {
  return new Response(new Uint8Array(proof.data), {
    headers: {
      "Content-Type": proof.contentType,
      "Content-Disposition": `inline; filename="${proof.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
