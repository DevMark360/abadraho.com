/** @deprecated Legacy iframe embed removed — use native admin pages */
export function AdminLegacyEmbed({
  title,
}: {
  path: string;
  title?: string;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {title ? <p className="font-medium">{title}</p> : null}
      <p className="mt-1">
        This view is not available here. Use the workspace sidebar to open the matching page.
      </p>
    </div>
  );
}
