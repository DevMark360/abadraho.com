"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/admin/admin-form-section";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";

type LogoState = { url: string | null; source: "upload" | "file" | null };

function checkFile(file: File): string | null {
  if (!/\.(jpe?g|png|webp|gif)$/i.test(file.name)) return "Logo must be JPG, PNG, WebP or GIF";
  if (file.size > MAX_BYTES) return "Logo must be under 2MB";
  return null;
}

/**
 * Builder logo (map pins, map cards, builder page). Edit mode uploads/removes right away;
 * create mode keeps the chosen file and the form uploads it after the builder is saved.
 */
export function AdminBuilderLogoField({
  builderId,
  pendingFile,
  onPendingFile,
}: {
  builderId?: number;
  pendingFile: File | null;
  onPendingFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<LogoState>({ url: null, source: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!builderId) return;
    fetch(`/api/admin/builders/${builderId}/logo`)
      .then((r) => r.json())
      .then((j: { success?: boolean } & LogoState) => {
        if (j.success) setLogo({ url: j.url, source: j.source });
      })
      .catch(() => undefined);
  }, [builderId]);

  const pendingPreview = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );
  useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
  }, [pendingPreview]);

  async function send(method: "POST" | "DELETE", file?: File) {
    if (!builderId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let body: FormData | undefined;
      if (file) {
        body = new FormData();
        body.append("logo", file);
      }
      const res = await fetch(`/api/admin/builders/${builderId}/logo`, { method, body });
      const j = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string } & LogoState;
      if (!j.success) {
        setError(j.message ?? "Could not update the logo");
        return;
      }
      setLogo({ url: j.url, source: j.source });
      setNotice(method === "POST" ? "Logo saved. It shows on the map and builder page now." : "Logo removed.");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function onChoose(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    if (builderId) void send("POST", file);
    else onPendingFile(file);
  }

  const shownUrl = builderId ? logo.url : pendingPreview;
  const canRemove = builderId ? logo.source === "upload" : Boolean(pendingFile);

  return (
    <div>
      <FieldLabel hint="Square image, about 300×300, white or transparent background. JPG, PNG, WebP, max 2MB">
        Logo
      </FieldLabel>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
          {shownUrl ? (
            <img src={shownUrl} alt="Builder logo" className="h-full w-full object-contain p-2" />
          ) : (
            <Building2 className="h-7 w-7 text-zinc-300" aria-hidden />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {busy ? "Saving…" : shownUrl ? "Replace logo" : "Upload logo"}
            </Button>
            {canRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={busy}
                onClick={() => (builderId ? void send("DELETE") : onPendingFile(null))}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </Button>
            ) : null}
          </div>
          {builderId && logo.source === "file" ? (
            <p className="text-xs text-zinc-500">
              Using the logo file from public/builders-logos. Upload one here to replace it.
            </p>
          ) : null}
          {!builderId && pendingFile ? (
            <p className="text-xs text-zinc-500">Uploaded when you save the builder.</p>
          ) : null}
          {notice ? <p className="text-xs text-emerald-700">{notice}</p> : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onChoose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
