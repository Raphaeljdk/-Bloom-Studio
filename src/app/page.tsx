"use client";

import { useUIStore } from "@/stores/ui-store";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthScreen } from "@/components/bloom/auth-screen";
import { Dashboard } from "@/components/bloom/dashboard";
import { StoryEditor } from "@/components/bloom/story-editor";

export default function Home() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryProvider>
  );
}

function AppRouter() {
  const view = useUIStore((s) => s.view);

  if (view === "auth") return <AuthScreen />;
  if (view === "story") return <StoryEditor />;
  return <Dashboard />;
}
