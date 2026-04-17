"use client";

import { useState, useRef } from "react";
import { Copy, Check, Send, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Spinner } from "@repo/ui/spinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/dialog";
import { useHousehold } from "../api/get-household";
import { useCreateHousehold } from "../api/create-household";
import { useJoinHousehold } from "../api/join-household";
import { useLeaveHousehold } from "../api/leave-household";
import { MemberList } from "./member-list";

export function HouseholdSettings() {
  const { data: household, isLoading } = useHousehold();
  const createHousehold = useCreateHousehold();
  const joinHousehold = useJoinHousehold();
  const leaveHousehold = useLeaveHousehold();
  const queryClient = useQueryClient();

  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteError, setInviteError] = useState("");

  // Household name editing
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  function startEditName() {
    setEditNameValue(household?.name ?? "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  async function handleSaveName() {
    const trimmed = editNameValue.trim();
    if (!trimmed || trimmed === household?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/households", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to rename household");
      await queryClient.invalidateQueries({ queryKey: ["household"] });
      setEditingName(false);
    } catch {
      // keep editing open on error
    } finally {
      setSavingName(false);
    }
  }

  function handleNameBlur() {
    // Slight delay so a Save button click registers before blur cancels
    setTimeout(() => {
      if (!savingName) setEditingName(false);
    }, 150);
  }

  function handleCreate() {
    const name = householdName.trim();
    if (!name) return;
    createHousehold.mutate(
      { name },
      { onSuccess: () => setHouseholdName("") },
    );
  }

  function handleJoin() {
    const code = inviteCode.trim();
    if (!code) return;
    joinHousehold.mutate(
      { code },
      { onSuccess: () => setInviteCode("") },
    );
  }

  function handleCopyCode() {
    if (!household?.code) return;
    const message = `Join my HomeBase household! Sign up at https://homebase-beta-web.vercel.app/ and use code ${household.code} to get started. 🏡`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLeave() {
    leaveHousehold.mutate(undefined, {
      onSuccess: () => setShowLeaveConfirm(false),
    });
  }

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteStatus("sending");
    setInviteError("");
    try {
      const res = await fetch("/api/households/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to send invitation");
      }
      setInviteStatus("sent");
      setInviteEmail("");
      setTimeout(() => setInviteStatus("idle"), 4000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
      setInviteStatus("error");
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Household</CardTitle>
          <CardDescription>Manage your household.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!household) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Household</CardTitle>
          <CardDescription>
            Create or join a household to share tasks with family members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {/* Create Household */}
            <div className="flex flex-col gap-3">
              <h4 className="label font-medium text-foreground">
                Create a Household
              </h4>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  id="household-name"
                  label="Household name"
                  placeholder="e.g. The Smiths"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                />
                <Button
                  onClick={handleCreate}
                  disabled={
                    !householdName.trim() || createHousehold.isPending
                  }
                >
                  {createHousehold.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
              {createHousehold.error && (
                <p className="body text-destructive">
                  {createHousehold.error.message}
                </p>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Join Household */}
            <div className="flex flex-col gap-3">
              <h4 className="label font-medium text-foreground">
                Join a Household
              </h4>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  id="invite-code"
                  label="Invite code"
                  placeholder="e.g. ABC123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleJoin();
                    }
                  }}
                />
                <Button
                  onClick={handleJoin}
                  disabled={!inviteCode.trim() || joinHousehold.isPending}
                >
                  {joinHousehold.isPending ? "Joining..." : "Join"}
                </Button>
              </div>
              {joinHousehold.error && (
                <p className="body text-destructive">
                  {joinHousehold.error.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Household</CardTitle>
          <CardDescription>Manage your household.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {/* Household Info */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="label text-muted-foreground">Name</p>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onBlur={handleNameBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      maxLength={100}
                      disabled={savingName}
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void handleSaveName()}
                      disabled={savingName || !editNameValue.trim()}
                      className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {savingName ? "Saving…" : "Save"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="body text-foreground">{household.name}</p>
                    <button
                      type="button"
                      onClick={startEditName}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Edit household name"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="label text-muted-foreground">Invite Code</p>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground">
                    {household.code}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Members */}
            <div className="flex flex-col gap-3">
              <h4 className="label font-medium text-foreground">Members</h4>
              <MemberList />
            </div>

            <div className="border-t border-border" />

            {/* Invite by email */}
            <div className="flex flex-col gap-3">
              <h4 className="label font-medium text-foreground">Invite a Member</h4>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  id="invite-email"
                  label="Email address"
                  type="email"
                  placeholder="name@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleInvite();
                    }
                  }}
                />
                <Button
                  onClick={() => void handleInvite()}
                  disabled={!inviteEmail.trim() || inviteStatus === "sending"}
                >
                  {inviteStatus === "sending" ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send invite
                    </>
                  )}
                </Button>
              </div>
              {inviteStatus === "sent" && (
                <p className="body text-green-700">Invitation sent!</p>
              )}
              {inviteStatus === "error" && (
                <p className="body text-destructive">{inviteError}</p>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Leave */}
            <Button
              variant="destructive"
              onClick={() => setShowLeaveConfirm(true)}
            >
              Leave Household
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave household</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave &ldquo;{household.name}&rdquo;?
              You will need a new invite code to rejoin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowLeaveConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={leaveHousehold.isPending}
            >
              {leaveHousehold.isPending ? "Leaving..." : "Leave"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
