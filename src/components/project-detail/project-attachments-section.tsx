"use client";

import { Download, FileText, Paperclip } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import type { ProjectDocumentLink } from "@/types/project-detail";
import { logClientActivity } from "@/lib/client/activity-log";

export function ProjectAttachmentsSection({
  projectId,
  projectName,
  documents,
}: {
  projectId: number;
  projectName: string;
  documents: ProjectDocumentLink[];
}) {
  const { user } = useAuth();

  if (!documents.length) return null;

  function onDownload(doc: ProjectDocumentLink) {
    logClientActivity(user?.id, {
      description: `Download PDF: ${doc.label}`,
      log_name: "downloadPdf",
      subject_id: projectId,
      subject_type: "project",
      log_table: "projects",
      objective: projectName,
    });
  }

  return (
    <section className="overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay">
      <div className="border-b border-zinc-100 bg-zinc-50/80 px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
          <Paperclip className="h-5 w-5" />
          Project attachments
        </h2>
      </div>
      <div className="divide-y divide-zinc-100">
        {documents.map((doc) => (
          <a
            key={doc.filename}
            href={doc.downloadPath}
            download
            onClick={() => onDownload(doc)}
            className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-clay-well sm:gap-4 sm:px-5"
          >
            <FileText className="h-6 w-6 shrink-0 text-brand-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-900">
                {doc.label === "Download PDF" ? "Download PDF" : doc.label}
              </p>
              <p className="truncate text-xs text-zinc-500" title={doc.filename}>{doc.filename}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-zinc-700">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
