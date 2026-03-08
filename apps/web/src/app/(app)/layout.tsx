import { Sidebar } from "@/components/layouts/sidebar";
import { MobileNav } from "@/components/layouts/mobile-nav";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <h1 className="heading-xs text-foreground">HomeBase</h1>
        </header>
        <div className="p-6">{children}</div>
        <MobileNav />
      </main>
    </div>
  );
}
