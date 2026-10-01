import { redirect } from "next/navigation";

/** Admin accounts are created in the database — no public registration. */
export default function AdminRegisterPage() {
  redirect("/login");
}
