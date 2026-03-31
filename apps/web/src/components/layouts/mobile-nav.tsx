"use client";

import { navItems } from "@/config/navigation";
import { NavLink } from "./nav-link";

export function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
    >
      {navItems.map((item) => (
        <NavLink key={item.href} {...item} variant="mobile" />
      ))}
    </nav>
  );
}
