import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAdWalletTransactionsClient } from "@/components/admin/admin-ad-wallet-transactions-client";

export default function AdminAdWalletTransactionsPage() {
  return (
    <AdminShell title="Ad wallet top-up requests">
      <AdminAdWalletTransactionsClient />
    </AdminShell>
  );
}
