
import AuthGuard from "@/components/AuthGuard";
import VerificationQuizClient from "@/components/quiz/VerificationQuizClient";
import SiteHeader from "@/components/SiteHeader";

export default function VerificationQuizPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <VerificationQuizClient />
        </AuthGuard>
      </main>
    </div>
  );
}
