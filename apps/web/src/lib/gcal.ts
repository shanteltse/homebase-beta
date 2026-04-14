/**
 * Google Calendar API helper utilities.
 * All calls are server-side only.
 */

const GCAL_BASE = "https://www.googleapis.com/calendar/v3";

/** Thrown when the Google API returns 401 — access token expired or revoked. */
export class GCalUnauthorizedError extends Error {
  constructor() {
    super("GCal access token expired or revoked");
    this.name = "GCalUnauthorizedError";
  }
}

export type GCalEvent = {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status: string;
  updated: string;
};

export type GCalEventInput = {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
};

/** Refresh an access token using the refresh token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

/** List events from a calendar. */
export async function listEvents(
  accessToken: string,
  calendarId = "primary",
  opts?: { timeMin?: string; timeMax?: string; maxResults?: number },
): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    maxResults: String(opts?.maxResults ?? 250),
    singleEvents: "true",
    orderBy: "startTime",
  });
  if (opts?.timeMin) params.set("timeMin", opts.timeMin);
  if (opts?.timeMax) params.set("timeMax", opts.timeMax);

  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (res.status === 401) throw new GCalUnauthorizedError();
  if (!res.ok) throw new Error(`GCal list events failed: ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

/** Get a single event. */
export async function getEvent(
  accessToken: string,
  eventId: string,
  calendarId = "primary",
): Promise<GCalEvent | null> {
  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GCal get event failed: ${res.status}`);
  return res.json();
}

/** Create a new calendar event. */
export async function createEvent(
  accessToken: string,
  event: GCalEventInput,
  calendarId = "primary",
): Promise<GCalEvent> {
  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );
  if (!res.ok) throw new Error(`GCal create event failed: ${res.status}`);
  return res.json();
}

/** Update an existing calendar event. */
export async function updateEvent(
  accessToken: string,
  eventId: string,
  event: Partial<GCalEventInput>,
  calendarId = "primary",
): Promise<GCalEvent> {
  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );
  if (!res.ok) throw new Error(`GCal update event failed: ${res.status}`);
  return res.json();
}

/** Delete a calendar event. */
export async function deleteEvent(
  accessToken: string,
  eventId: string,
  calendarId = "primary",
): Promise<void> {
  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (res.status !== 204 && res.status !== 200 && res.status !== 404) {
    throw new Error(`GCal delete event failed: ${res.status}`);
  }
}

/** Build a GCal event from a HomeBase task. */
export function taskToGCalEvent(
  task: {
    title: string;
    notes?: string | null;
    assignee?: string | null;
    dueDate?: Date | null;
  },
  appUrl: string,
  taskId: string,
  includeNotes: boolean,
  includeAssignee: boolean,
): GCalEventInput {
  const descriptionParts: string[] = [];
  if (includeNotes && task.notes) descriptionParts.push(task.notes);
  if (includeAssignee && task.assignee) descriptionParts.push(`Assignee: ${task.assignee}`);
  descriptionParts.push(`\nView in HomeBase: ${appUrl}/tasks/${taskId}`);

  const description = descriptionParts.join("\n").trim();

  if (task.dueDate) {
    const iso = task.dueDate.toISOString();
    // If the date is midnight UTC, treat as all-day event
    const isAllDay = iso.endsWith("T00:00:00.000Z");
    if (isAllDay) {
      const dateStr = iso.split("T")[0]!;
      return {
        summary: task.title,
        description,
        start: { date: dateStr },
        end: { date: dateStr },
      };
    }
    return {
      summary: task.title,
      description,
      start: { dateTime: iso },
      end: { dateTime: new Date(task.dueDate.getTime() + 3600000).toISOString() },
    };
  }

  // No due date — use today as all-day event
  const today = new Date().toISOString().split("T")[0]!;
  return {
    summary: task.title,
    description,
    start: { date: today },
    end: { date: today },
  };
}
