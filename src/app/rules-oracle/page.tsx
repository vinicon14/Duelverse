
import AuthGuard from "@/components/AuthGuard";
import RulesOracleClient from "@/components/oracles/RulesOracleClient";
import SiteHeader from "@/components/SiteHeader";

export default function RulesOraclePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <RulesOracleClient />
        </AuthGuard>
      </main>
    </div>
  );
}
