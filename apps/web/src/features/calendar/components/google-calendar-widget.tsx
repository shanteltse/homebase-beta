"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useUserProfile } from "@/features/auth/api/get-user-profile";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/utils/cn";

export function GoogleCalendarWidget() {
  const { data: profile, isLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [justConnected, setJustConnected] = useState(false);

  // Handle OAuth callback redirect with ?gcal=connected or ?gcal=error
  useEffect(() => {
    const gcal = searchParams.get("gcal");
    if (gcal === "connected") {
      setJustConnected(true);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      // Clear the param from the URL without a navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("gcal");
      window.history.replaceState({}, "", url.toString());
    } else if (gcal === "error") {
      setSyncMessage({ type: "error", text: "Connection failed — please try again" });
      const url = new URL(window.location.href);
      url.searchParams.delete("gcal");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, queryClient]);

  // Auto-dismiss "just connected" state after 4 seconds
  useEffect(() => {
    if (!justConnected) return;
    const t = setTimeout(() => setJustConnected(false), 4000);
    return () => clearTimeout(t);
  }, [justConnected]);

  // Auto-dismiss sync message after 3 seconds
  useEffect(() => {
    if (!syncMessage) return;
    const t = setTimeout(() => setSyncMessage(null), 3000);
    return () => clearTimeout(t);
  }, [syncMessage]);

  async function handleToggleGcalEvents() {
    const next = !(profile?.showGcalEvents ?? true);
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showGcalEvents: next }),
    });
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSyncMessage({
        type: "success",
        text: `Synced ${data.synced} task${data.synced !== 1 ? "s" : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch {
      setSyncMessage({ type: "error", text: "Sync failed" });
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-8 w-44 animate-pulse rounded-md bg-muted" />
    );
  }

  const isConnected = profile?.gcalConnected ?? false;

  // ── Not connected ────────────────────────────────────────────
  if (!isConnected) {
    return (
      <a
        href="/api/calendar/connect?from=calendar"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border",
          "bg-background px-3 py-1.5 text-sm font-medium text-foreground",
          "hover:bg-muted transition-colors",
        )}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        Connect Google Calendar
      </a>
    );
  }

  // ── Just connected ───────────────────────────────────────────
  if (justConnected) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-1.5 text-sm text-green-800 animate-in fade-in duration-300">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Google Calendar connected!
      </div>
    );
  }

  // ── Connected ────────────────────────────────────────────────
  const lastSync = profile?.gcalLastSync
    ? new Date(profile.gcalLastSync).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Sync message */}
      {syncMessage && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            syncMessage.type === "success"
              ? "text-green-700"
              : "text-destructive",
          )}
        >
          {syncMessage.type === "success" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {syncMessage.text}
        </span>
      )}

      {/* Connected pill */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Google Calendar
        {lastSync && (
          <span className="text-green-600 font-normal">· {lastSync}</span>
        )}
      </div>

      {/* Sync Now */}
      <button
        type="button"
        onClick={handleSyncNow}
        disabled={isSyncing}
        title="Sync tasks to Google Calendar now"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border",
          "bg-background px-2.5 py-1 text-xs font-medium text-foreground",
          "hover:bg-muted transition-colors disabled:opacity-50",
        )}
      >
        {isSyncing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        {isSyncing ? "Syncing…" : "Sync Now"}
      </button>

      {/* Show/hide GCal events toggle */}
      <button
        type="button"
        onClick={handleToggleGcalEvents}
        title={profile?.showGcalEvents ?? true ? "Hide Google Calendar events" : "Show Google Calendar events"}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border",
          "bg-background px-2.5 py-1 text-xs font-medium transition-colors",
          profile?.showGcalEvents ?? true
            ? "text-foreground hover:bg-muted"
            : "text-muted-foreground hover:bg-muted",
        )}
      >
        {profile?.showGcalEvents ?? true ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
        {profile?.showGcalEvents ?? true ? "Showing" : "Hidden"}
      </button>

      {/* Settings link */}
      <Link
        href="/settings?section=calendar"
        title="Calendar sync settings"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border",
          "bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground",
          "hover:bg-muted hover:text-foreground transition-colors",
        )}
      >
        <Settings className="h-3 w-3" />
        Settings
      </Link>
    </div>
  );
}
