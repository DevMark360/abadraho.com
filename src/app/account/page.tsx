import { redirect } from "next/navigation";
import { getAccountHomePath } from "@/config/account-nav";
import { getSession } from "@/lib/session";
import { AccountHubClient } from "@/components/account/account-hub-client";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?ref=/account");
  }

  const home = getAccountHomePath(session.userTypeId, session.role);
  if (home !== "/account") {
    redirect(home);
  }

  return <AccountHubClient />;
}
