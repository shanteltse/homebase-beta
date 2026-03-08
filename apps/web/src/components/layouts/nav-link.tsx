"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import type { LucideIcon } from "lucide-react";

type NavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: "sidebar" | "mobile";
};

export function NavLink({
  href,
  label,
  icon: Icon,
  variant = "sidebar",
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
