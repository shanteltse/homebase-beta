"use client";

import { navItems } from "@/config/navigation";
import { NavLink } from "./nav-link";

export function Sidebar() {
  return (
    <aside className="hidden w-60 border-r border-border bg-background md:block">
      <div className="p-6">
        <h1 className="heading-sm text-foreground">HomeBase</h1>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
