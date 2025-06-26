
import AuthGuard from "@/components/AuthGuard";
import GetProClient from "@/components/pro/GetProClient";
import SiteHeader from "@/components/SiteHeader";

export default function GetProPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <GetProClient />
        </AuthGuard>
      </main>
    </div>
  );
}
