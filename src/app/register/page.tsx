
'use client';
import RegisterForm from "@/components/auth/RegisterForm";
import SiteHeader from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading || user) { 
     return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="animate-pulse rounded-md bg-muted h-[550px] w-full max-w-md"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow flex items-center justify-center p-4 bg-gradient-to-br from-background to-card">
        <RegisterForm />
      </main>
    </div>
  );
}
