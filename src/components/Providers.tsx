
'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { AudioControlProvider } from "@/contexts/AudioControlContext";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AudioControlProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </AudioControlProvider>
    </AuthProvider>
  );
}
