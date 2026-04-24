import { Sidebar } from "@/components/layouts/sidebar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { MobileHeader } from "@/components/layouts/mobile-header";
import { NotificationProvider } from "@/features/notifications/components/notification-provider";
import { CompletionCelebration } from "@/features/gamification/components/completion-celebration";
import { OfflineBanner } from "@/components/offline-banner";
import { SetupBanner } from "@/features/onboarding/components/setup-banner";
import { WelcomeModal } from "@/features/onboarding/components/welcome-modal";
import { VoiceFab } from "@/features/voice/components/voice-fab";
import { MicPermissionBanner } from "@/features/voice/components/mic-permission-banner";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <NotificationProvider>
        <div className="flex h-dvh w-full max-w-full overflow-x-hidden bg-background">
          <Sidebar />
          <main className="flex-1 min-w-0 w-0 flex flex-col overflow-hidden">
            {/* Mobile header */}
            <MobileHeader />
            {/* Desktop header */}
            <div className="hidden shrink-0 md:flex items-center justify-end border-b border-border px-6 py-2">
              <NotificationBell />
            </div>
            <OfflineBanner />
            {/* Onboarding setup banner — only shows when setup is incomplete */}
            <SetupBanner />
            {/* Microphone permission banner — one-time, shown when mic is denied */}
            <MicPermissionBanner />
            <div
              id="main-scroll"
              className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 [scrollbar-gutter:stable]"
              style={{ paddingBottom: "var(--content-pb)" }}
            >
              {children}
            </div>
            <MobileNav />
          </main>
        </div>
        <CompletionCelebration />
        {/* Welcome modal — shown once to brand-new users */}
        <WelcomeModal />
        {/* Voice-to-task FAB — fixed top-right, below the notification bell */}
        <VoiceFab />
      </NotificationProvider>
    </AuthGuard>
  );
}
