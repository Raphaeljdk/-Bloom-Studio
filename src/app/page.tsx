"use client";

import { useUIStore } from "@/stores/ui-store";
import { GlobalErrorBoundary } from "@/components/providers/global-error-boundary";
import GlobalErrorHandler from "@/components/providers/global-error-handler";
import { PWARegister } from "@/components/providers/pwa-register";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthScreen } from "@/components/bloom/auth-screen";
import { Dashboard } from "@/components/bloom/dashboard";
import { StoryEditor } from "@/components/bloom/story-editor";

export default function Home() {
  return (
    <GlobalErrorBoundary>
      <GlobalErrorHandler />
      <PWARegister />
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}

function AppRouter() {
  const view = useUIStore((s) => s.view);

  if (view === "auth") return <AuthScreen />;
  if (view === "story") return <StoryEditor />;
  return <Dashboard />;
}
