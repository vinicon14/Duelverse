
import AuthGuard from "@/components/AuthGuard";
import RankingClient from "@/components/ranking/RankingClient";
import SiteHeader from "@/components/SiteHeader";

export default function RankingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <RankingClient />
        </AuthGuard>
      </main>
    </div>
  );
}
