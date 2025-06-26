
import AuthGuard from "@/components/AuthGuard";
import ProfileEditorClient from "@/components/profile/ProfileEditorClient";
import SiteHeader from "@/components/SiteHeader";

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex">
        <AuthGuard>
          <ProfileEditorClient />
        </AuthGuard>
      </main>
    </div>
  );
}
