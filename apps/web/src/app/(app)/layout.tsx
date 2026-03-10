import { Sidebar } from "@/components/layouts/sidebar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { NotificationProvider } from "@/features/notifications/components/notification-provider";
import { CompletionCelebration } from "@/features/gamification/components/completion-celebration";
import { OfflineBanner } from "@/components/offline-banner";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <NotificationProvider>
        <OfflineBanner />
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1">
            <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
              <h1 className="heading-xs text-foreground">HomeBase</h1>
              <NotificationBell />
            </header>
            <div className="hidden md:flex items-center justify-end border-b border-border px-6 py-2">
              <NotificationBell />
            </div>
            <div className="p-6">{children}</div>
            <MobileNav />
          </main>
        </div>
        <CompletionCelebration />
      </NotificationProvider>
    </AuthGuard>
  );
}
