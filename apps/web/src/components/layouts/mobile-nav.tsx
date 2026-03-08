"use client";

import { navItems } from "@/config/navigation";
import { NavLink } from "./nav-link";

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-border bg-background md:hidden">
      {navItems.map((item) => (
        <NavLink key={item.href} {...item} variant="mobile" />
      ))}
    </nav>
  );
}
