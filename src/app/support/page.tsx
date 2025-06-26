
import AuthGuard from "@/components/AuthGuard";
import SupportClient from "@/components/support/SupportClient";
import SiteHeader from "@/components/SiteHeader";

export default function SupportPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <SupportClient />
        </AuthGuard>
      </main>
    </div>
  );
}
