
import AuthGuard from "@/components/AuthGuard";
import DashboardClient from "@/components/dashboard/DashboardClient";
import SiteHeader from "@/components/SiteHeader";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow flex">
          <DashboardClient />
        </main>
      </div>
    </AuthGuard>
  );
}
