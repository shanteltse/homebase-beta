"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Calendar, RefreshCw, Unlink, Check, AlertCircle } from "lucide-react";
import { useUserProfile } from "@/features/auth/api/get-user-profile";
import { useQueryClient } from "@tanstack/react-query";

export function GoogleCalendarSettings() {
  const { data: profile, isLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check for OAuth callback result in URL
  useEffect(() => {
    const gcal = searchParams.get("gcal");
    if (gcal === "connected") {
      setStatusMessage({ type: "success", text: "Google Calendar connected successfully!" });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } else if (gcal === "error") {
      setStatusMessage({ type: "error", text: "Failed to connect Google Calendar. Please try again." });
    }
  }, [searchParams, queryClient]);

  async function handleSync() {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      setSyncResult(`Synced ${data.synced} task${data.synced !== 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch {
      setSyncResult("Sync failed — please try again");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? All synced event mappings will be removed.")) return;
    setIsDisconnecting(true);
    try {
      await fetch("/api/calendar/disconnect", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setStatusMessage({ type: "success", text: "Google Calendar disconnected." });
    } catch {
      setStatusMessage({ type: "error", text: "Failed to disconnect. Please try again." });
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function updateSetting(key: string, value: string | boolean) {
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = profile?.gcalConnected ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" /> Google Calendar
        </CardTitle>
        <CardDescription>
          Sync your HomeBase tasks with Google Calendar — two-way.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          {/* Status message */}
          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                statusMessage.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {statusMessage.text}
            </div>
          )}

          {/* Connection status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground shrink-0">Status</p>
              {isConnected ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 shrink-0">
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">Not connected</Badge>
              )}
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <a
                href="/api/calendar/connect"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Calendar className="h-3.5 w-3.5" />
                Connect Google Calendar
              </a>
            )}
          </div>

          {syncResult && (
            <p className="text-xs text-muted-foreground">{syncResult}</p>
          )}

          {profile?.gcalLastSync && (
            <p className="text-xs text-muted-foreground">
              Last synced:{" "}
              {new Date(profile.gcalLastSync).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}

          {/* Sync settings — only shown when connected */}
          {isConnected && (
            <>
              <div className="border-t border-border pt-4 flex flex-col gap-4">
                <p className="text-sm font-medium text-foreground">Sync Settings</p>

                {/* Show GCal events toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm text-foreground">Show Google Calendar Events</p>
                    <p className="text-xs text-muted-foreground">Display imported Google Calendar events in the calendar view</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile?.showGcalEvents ?? true}
                    onChange={(e) => updateSetting("showGcalEvents", e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </label>

                {/* Enable sync toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm text-foreground">Enable sync</p>
                    <p className="text-xs text-muted-foreground">Keep tasks and calendar events in sync</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profile?.gcalSyncEnabled ?? true}
                    onChange={(e) => updateSetting("gcalSyncEnabled", e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </label>

                {/* What to sync */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm text-foreground">What to sync</p>
                  <select
                    value={profile?.gcalSyncWhat ?? "all"}
                    onChange={(e) => updateSetting("gcalSyncWhat", e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">All tasks with dates</option>
                    <option value="starred">Starred tasks only</option>
                    <option value="today_week">Today &amp; this week</option>
                  </select>
                </div>

                {/* Sync frequency */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm text-foreground">Sync frequency</p>
                  <select
                    value={profile?.gcalSyncFrequency ?? "realtime"}
                    onChange={(e) => updateSetting("gcalSyncFrequency", e.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="realtime">Real-time (on task changes)</option>
                    <option value="hourly">Hourly</option>
                    <option value="twice_daily">Twice daily</option>
                  </select>
                </div>

                {/* Include in events */}
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-foreground">Include in events</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile?.gcalIncludeNotes ?? true}
                      onChange={(e) => updateSetting("gcalIncludeNotes", e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <p className="text-sm text-muted-foreground">Task notes</p>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile?.gcalIncludeAssignee ?? true}
                      onChange={(e) => updateSetting("gcalIncludeAssignee", e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <p className="text-sm text-muted-foreground">Assignee</p>
                  </label>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Two-way sync:</strong> Changes in HomeBase sync to Google Calendar and vice versa.
                  Deleting an event in Google Calendar will delete the task in HomeBase.
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
