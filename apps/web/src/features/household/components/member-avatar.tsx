"use client";

import Image from "next/image";
import { cn } from "@/utils/cn";

export const AVATAR_COLORS = [
  { bg: "#E2A96B", text: "#7A4A1E" },
  { bg: "#7EC8A4", text: "#1A5C3A" },
  { bg: "#89B4E8", text: "#1A3F6B" },
  { bg: "#E88989", text: "#6B1A1A" },
  { bg: "#B89AE8", text: "#3D1A6B" },
  { bg: "#E8C889", text: "#6B4A1A" },
] as const;

type MemberAvatarProps = {
  name: string | null;
  image: string | null;
  size?: "sm" | "md";
  avatarColor?: string | null;
  useGooglePhoto?: boolean;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MemberAvatar({ name, image, size = "md", avatarColor, useGooglePhoto = true }: MemberAvatarProps) {
  const sizeClasses = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";

  if (useGooglePhoto && image) {
    return (
      <Image
        src={image}
        alt={name ?? "Member"}
        width={size === "sm" ? 24 : 32}
        height={size === "sm" ? 24 : 32}
        className={cn("rounded-full object-cover", sizeClasses)}
      />
    );
  }

  const colorEntry = avatarColor
    ? AVATAR_COLORS.find((c) => c.bg === avatarColor)
    : undefined;

  if (colorEntry) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-full font-medium", sizeClasses)}
        style={{ backgroundColor: colorEntry.bg, color: colorEntry.text }}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
        sizeClasses,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
