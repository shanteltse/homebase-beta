"use client";

import { useState } from "react";
import { Badge } from "@repo/ui/badge";
import { Spinner } from "@repo/ui/spinner";
import { useHouseholdMembers } from "../api/get-members";
import { MemberAvatar, AVATAR_COLORS } from "./member-avatar";
import { useUser } from "@/features/auth/api/get-user";
import { useUserProfile, useUpdateUserProfile } from "@/features/auth/api/get-user-profile";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/utils/cn";

function OwnMemberRow({ member }: { member: { id: string; name: string | null; email: string; image: string | null; role: "owner" | "member"; avatarColor: string | null; useGooglePhoto: boolean } }) {
  const { data: profile } = useUserProfile();
  const { update } = useUpdateUserProfile();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name ?? "");
  const [avatarColor, setAvatarColor] = useState<string | null>(member.avatarColor);
  const [useGooglePhoto, setUseGooglePhoto] = useState(member.useGooglePhoto);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await update({ name, avatarColor, useGooglePhoto });
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["household-members"] });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setName(member.name ?? "");
    setAvatarColor(member.avatarColor);
    setUseGooglePhoto(member.useGooglePhoto);
    setEditing(false);
  }

  const hasGooglePhoto = !!member.image;

  return (
    <div className="flex flex-col gap-3 rounded-md px-2 py-2">
      <div className="flex items-center gap-3">
        <MemberAvatar
          name={editing ? name : member.name}
          image={member.image}
          avatarColor={editing ? avatarColor : member.avatarColor}
          useGooglePhoto={editing ? useGooglePhoto : member.useGooglePhoto}
        />
        <div className="flex flex-1 flex-col min-w-0">
          <span className="body font-medium text-foreground">
            {member.name ?? "Unnamed"} <span className="text-xs text-muted-foreground font-normal">(you)</span>
          </span>
          <span className="caption text-muted-foreground">{member.email}</span>
        </div>
        <Badge variant={member.role === "owner" ? "default" : "secondary"}>
          {member.role === "owner" ? "Owner" : "Member"}
        </Badge>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Edit profile"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      {editing && (
        <div className="flex flex-col gap-3 pl-11">
          {/* Name input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              maxLength={100}
            />
          </div>

          {/* Google photo toggle (only if they have one) */}
          {hasGooglePhoto && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useGooglePhoto}
                onChange={(e) => setUseGooglePhoto(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
              />
              <span className="text-sm text-foreground">Use Google photo</span>
            </label>
          )}

          {/* Color picker (shown when not using Google photo, or no Google photo) */}
          {(!useGooglePhoto || !hasGooglePhoto) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Avatar color</label>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color.bg}
                    type="button"
                    onClick={() => setAvatarColor(color.bg)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      avatarColor === color.bg ? "border-foreground scale-110" : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: color.bg }}
                    aria-label={`Avatar color ${color.bg}`}
                  />
                ))}
                {avatarColor && (
                  <button
                    type="button"
                    onClick={() => setAvatarColor(null)}
                    className="h-7 w-7 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove color"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Save / Cancel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check className="h-3 w-3" />
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MemberList() {
  const { data: members, isLoading } = useHouseholdMembers();
  const { data: user } = useUser();

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <p className="body text-muted-foreground">No members found.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member) =>
        member.id === user?.id ? (
          <OwnMemberRow key={member.id} member={member} />
        ) : (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
          >
            <MemberAvatar
              name={member.name}
              image={member.image}
              avatarColor={member.avatarColor}
              useGooglePhoto={member.useGooglePhoto}
            />
            <div className="flex flex-1 flex-col">
              <span className="body font-medium text-foreground">
                {member.name ?? "Unnamed"}
              </span>
              <span className="caption text-muted-foreground">{member.email}</span>
            </div>
            <Badge variant={member.role === "owner" ? "default" : "secondary"}>
              {member.role === "owner" ? "Owner" : "Member"}
            </Badge>
          </div>
        )
      )}
    </div>
  );
}
