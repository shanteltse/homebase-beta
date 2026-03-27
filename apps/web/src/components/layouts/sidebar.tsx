"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { navItems } from "@/config/navigation";
import { NavLink } from "./nav-link";
import { useLogout } from "@/features/auth/api/logout";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const logout = useLogout();
  const router = useRouter();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => router.push("/login"),
    });
  }

  return (
    <aside className="hidden w-60 flex-col border-r border-border bg-background md:flex">
      <div className="p-6">
        <Link href="/dashboard">
          <h1 className="heading-sm text-foreground hover:text-primary transition-colors">HomeBase</h1>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
