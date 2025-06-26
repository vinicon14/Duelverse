
import AuthGuard from "@/components/AuthGuard";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";
import SiteHeader from "@/components/SiteHeader";

export default function AdminPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <AdminDashboardClient />
        </AuthGuard>
      </main>
    </div>
  );
}
