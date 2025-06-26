
import AuthGuard from "@/components/AuthGuard";
import CardOracleClient from "@/components/oracles/CardOracleClient";
import SiteHeader from "@/components/SiteHeader";

export default function CardOraclePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <CardOracleClient />
        </AuthGuard>
      </main>
    </div>
  );
}
