import { redirect } from "next/navigation";

/** Legacy `/admin/teams` → my teams list */
export default function AdminTeamsRedirectPage() {
  redirect("/admin/my-teams");
}
