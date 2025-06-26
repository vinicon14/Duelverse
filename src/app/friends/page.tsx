
import AuthGuard from "@/components/AuthGuard";
import FriendsClient from "@/components/friends/FriendsClient";
import SiteHeader from "@/components/SiteHeader";

export default function FriendsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <FriendsClient />
        </AuthGuard>
      </main>
    </div>
  );
}
