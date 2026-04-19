// Shared design tokens — matches the app's warm, airy visual style
const C = {
  brand: "#a0704a",
  bg: "#f5f0eb",
  cardBg: "#ffffff",
  border: "#e8e0d8",
  text: "#2c2c2c",
  muted: "#8a7968",
  white: "#ffffff",
  // Section accent colors (subtle, not heavy backgrounds)
  dangerAccent: "#c0392b",
  warningAccent: "#b07830",
  successAccent: "#5a8a5a",
  neutralAccent: "#a0704a",
  mutedAccent: "#8a7968",
};

const FONT_SERIF = "Georgia, 'Times New Roman', serif";
const FONT_SANS = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Shared layout helpers
function emailWrapper(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT_SANS};">
  <div style="max-width:540px;margin:0 auto;padding:40px 16px;">
    ${content}
  </div>
</body>
</html>`;
}

function emailHeader(subtitle: string): string {
  return `
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="margin:0;font-size:24px;color:${C.brand};font-weight:500;font-family:${FONT_SERIF};letter-spacing:0.5px;">HomeBase</h1>
      <p style="margin:5px 0 0 0;font-size:12px;color:${C.muted};letter-spacing:1px;text-transform:uppercase;">${subtitle}</p>
    </div>`;
}

function emailFooter(note: string, appUrl: string): string {
  return `
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
      <p style="margin:0;font-size:11px;color:${C.muted};line-height:1.6;">
        ${note}
        <br/>Manage preferences in <a href="${appUrl}/settings" style="color:${C.brand};text-decoration:none;">Settings</a>.
      </p>
    </div>`;
}

function ctaButton(href: string, label: string): string {
  return `
    <div style="text-align:center;margin:28px 0 0 0;">
      <a href="${href}" style="display:inline-block;padding:10px 28px;background:${C.brand};color:${C.white};text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;font-family:${FONT_SANS};letter-spacing:0.3px;">${label}</a>
    </div>`;
}

// Section card with white background and left accent border
function sectionCard(
  title: string,
  count: number,
  accentColor: string,
  bodyHtml: string,
  subtitle?: string,
): string {
  return `
    <div style="margin-bottom:16px;background:${C.cardBg};border-radius:8px;border:1px solid ${C.border};border-left:3px solid ${accentColor};padding:14px 18px;">
      <p style="margin:0 0 2px 0;font-size:11px;font-weight:500;color:${accentColor};text-transform:uppercase;letter-spacing:1px;">${title} &middot; ${count}</p>
      ${subtitle ? `<p style="margin:0 0 8px 0;font-size:12px;color:${C.muted};">${subtitle}</p>` : `<div style="margin-bottom:8px;"></div>`}
      ${bodyHtml}
    </div>`;
}

function taskList(titles: string[]): string {
  return `<ul style="margin:0;padding:0;list-style:none;">
    ${titles
      .map(
        (t) =>
          `<li style="padding:4px 0;font-size:14px;color:${C.text};border-bottom:1px solid ${C.border};display:flex;align-items:baseline;gap:8px;"><span style="color:${C.brand};font-size:12px;flex-shrink:0;">&ndash;</span>${t}</li>`,
      )
      .join("")}
  </ul>`;
}

// ─── generateReminderHtml (legacy flat list, still used for nothing — kept for safety) ───

export interface ReminderData {
  userName: string | null;
  userEmail: string;
  taskTitles: string[];
  appUrl: string;
  type: "daily" | "weekly";
}

export function generateReminderHtml(data: ReminderData): string {
  const { userName, taskTitles, appUrl, type } = data;
  const greeting = userName ? `Hi ${userName}` : "Hi there";
  const count = taskTitles.length;
  const subject =
    type === "daily"
      ? `You have ${count} task${count !== 1 ? "s" : ""} due today`
      : `You have ${count} task${count !== 1 ? "s" : ""} due this week`;
  const intro =
    type === "daily"
      ? `Here are your tasks due <strong>today</strong>:`
      : `Here are your tasks due <strong>this week</strong>:`;

  const items = taskTitles
    .map(
      (t) =>
        `<li style="padding:4px 0;font-size:14px;color:${C.text};list-style:none;border-bottom:1px solid ${C.border};"><span style="color:${C.brand};margin-right:8px;">&ndash;</span>${t}</li>`,
    )
    .join("");

  return emailWrapper(
    subject,
    `${emailHeader(type === "daily" ? "Daily Reminder" : "Weekly Reminder")}
    <p style="font-size:15px;color:${C.text};margin:0 0 6px 0;font-family:${FONT_SANS};">${greeting},</p>
    <p style="font-size:14px;color:${C.muted};margin:0 0 20px 0;">${intro}</p>
    <div style="background:${C.cardBg};border-radius:8px;border:1px solid ${C.border};padding:14px 18px;margin-bottom:4px;">
      <ul style="margin:0;padding:0;">${items}</ul>
    </div>
    ${ctaButton(`${appUrl}/tasks`, "View Tasks")}
    ${emailFooter("You&apos;re receiving this because you enabled email reminders in HomeBase.", appUrl)}`,
  );
}

// ─── Daily Reminder ───

export interface DailyReminderData {
  userName: string | null;
  userEmail: string;
  appUrl: string;
  dueToday: string[];
  overdue: string[];
  comingUp: string[];
  noDate: string[];
}

export function generateDailyReminderHtml(data: DailyReminderData): string {
  const { userName, appUrl, dueToday, overdue, comingUp, noDate } = data;
  const greeting = userName ? `Hi ${userName}` : "Hi there";
  const totalCount = dueToday.length + overdue.length + comingUp.length + noDate.length;

  const overdueCard =
    overdue.length > 0
      ? sectionCard("Overdue", overdue.length, C.dangerAccent, taskList(overdue), "Past their due date")
      : "";

  const todayCard =
    dueToday.length > 0
      ? sectionCard("Due Today", dueToday.length, C.warningAccent, taskList(dueToday))
      : "";

  const comingUpCard =
    comingUp.length > 0
      ? sectionCard("Coming Up", comingUp.length, C.neutralAccent, taskList(comingUp))
      : "";

  const noDateCard =
    noDate.length > 0
      ? sectionCard("No Due Date", noDate.length, C.mutedAccent, taskList(noDate))
      : "";

  const emptyState =
    totalCount === 0
      ? `<div style="text-align:center;padding:32px 24px;background:${C.cardBg};border-radius:8px;border:1px solid ${C.border};">
          <p style="margin:0;font-size:14px;color:${C.muted};">You&apos;re all caught up &mdash; no pending tasks right now.</p>
        </div>`
      : "";

  return emailWrapper(
    "Your HomeBase Daily Reminder",
    `${emailHeader("Daily Reminder")}
    <p style="font-size:15px;color:${C.text};margin:0 0 4px 0;">${greeting},</p>
    <p style="font-size:14px;color:${C.muted};margin:0 0 24px 0;">Here&apos;s a snapshot of your tasks for today.</p>
    ${overdueCard}
    ${todayCard}
    ${comingUpCard}
    ${noDateCard}
    ${emptyState}
    ${ctaButton(`${appUrl}/tasks`, "View Tasks")}
    ${emailFooter("You&apos;re receiving this because you enabled daily reminders in HomeBase.", appUrl)}`,
  );
}

// ─── Weekly Reminder ───

export interface WeeklyReminderData {
  userName: string | null;
  userEmail: string;
  appUrl: string;
  dueThisWeek: string[];
  overdue: string[];
  comingUp: string[];
  noDate: string[];
}

export function generateWeeklyReminderHtml(data: WeeklyReminderData): string {
  const { userName, appUrl, dueThisWeek, overdue, comingUp, noDate } = data;
  const greeting = userName ? `Hi ${userName}` : "Hi there";
  const totalCount = dueThisWeek.length + overdue.length + comingUp.length + noDate.length;

  const overdueCard =
    overdue.length > 0
      ? sectionCard("Overdue", overdue.length, C.dangerAccent, taskList(overdue), "Past their due date")
      : "";

  const thisWeekCard =
    dueThisWeek.length > 0
      ? sectionCard("Due This Week", dueThisWeek.length, C.warningAccent, taskList(dueThisWeek))
      : "";

  const comingUpCard =
    comingUp.length > 0
      ? sectionCard("Coming Up", comingUp.length, C.neutralAccent, taskList(comingUp))
      : "";

  const noDateCard =
    noDate.length > 0
      ? sectionCard("No Due Date", noDate.length, C.mutedAccent, taskList(noDate))
      : "";

  const emptyState =
    totalCount === 0
      ? `<div style="text-align:center;padding:32px 24px;background:${C.cardBg};border-radius:8px;border:1px solid ${C.border};">
          <p style="margin:0;font-size:14px;color:${C.muted};">You&apos;re all caught up &mdash; no pending tasks right now.</p>
        </div>`
      : "";

  return emailWrapper(
    "Your HomeBase Weekly Reminder",
    `${emailHeader("Weekly Reminder")}
    <p style="font-size:15px;color:${C.text};margin:0 0 4px 0;">${greeting},</p>
    <p style="font-size:14px;color:${C.muted};margin:0 0 24px 0;">Here&apos;s a look at your week ahead.</p>
    ${overdueCard}
    ${thisWeekCard}
    ${comingUpCard}
    ${noDateCard}
    ${emptyState}
    ${ctaButton(`${appUrl}/tasks`, "View Tasks")}
    ${emailFooter("You&apos;re receiving this because you enabled weekly reminders in HomeBase.", appUrl)}`,
  );
}

// ─── Household Invite ───

export interface HouseholdInviteData {
  inviterName: string | null;
  householdName: string;
  inviteUrl: string;
  appUrl: string;
}

export function generateInviteHtml(data: HouseholdInviteData): string {
  const { inviterName, householdName, inviteUrl, appUrl } = data;
  const inviter = inviterName ?? "Someone";

  return emailWrapper(
    `You're invited to join ${householdName} on HomeBase`,
    `${emailHeader("Household Invitation")}
    <p style="font-size:15px;color:${C.text};margin:0 0 6px 0;">Hi there,</p>
    <p style="font-size:14px;color:${C.muted};margin:0 0 24px 0;line-height:1.6;">
      <span style="color:${C.text};font-weight:500;">${inviter}</span> has invited you to join
      <span style="color:${C.text};font-weight:500;">${householdName}</span> on HomeBase &mdash;
      the household task manager that keeps everyone on the same page.
    </p>
    <div style="background:${C.cardBg};border-radius:8px;border:1px solid ${C.border};padding:20px 18px;margin-bottom:4px;text-align:center;">
      <a href="${inviteUrl}" style="display:inline-block;padding:10px 28px;background:${C.brand};color:${C.white};text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;letter-spacing:0.3px;">Accept Invitation</a>
    </div>
    <p style="font-size:12px;color:${C.muted};margin:12px 0 0 0;text-align:center;">This invitation expires in 7 days. If you didn&apos;t expect this, you can safely ignore it.</p>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
      <p style="margin:0;font-size:11px;color:${C.muted};">HomeBase &mdash; household task management made easy.</p>
    </div>`,
  );
}

// ─── Password Reset ───

export interface PasswordResetData {
  userName: string | null;
  resetUrl: string;
  appUrl: string;
}

export function generatePasswordResetHtml(data: PasswordResetData): string {
  const { userName, resetUrl, appUrl } = data;
  const greeting = userName ? `Hi ${userName}` : "Hi there";

  return emailWrapper(
    "Reset your HomeBase password",
    `${emailHeader("Password Reset")}
    <p style="font-size:15px;color:${C.text};margin:0 0 6px 0;">${greeting},</p>
    <p style="font-size:14px;color:${C.muted};margin:0 0 24px 0;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
      This link expires in 1 hour.
    </p>
    <div style="background:${C.cardBg};border-radius:8px;border:1px solid ${C.border};padding:20px 18px;margin-bottom:4px;text-align:center;">
      <a href="${resetUrl}" style="display:inline-block;padding:10px 28px;background:${C.brand};color:${C.white};text-decoration:none;border-radius:8px;font-size:13px;font-weight:500;letter-spacing:0.3px;">Reset Password</a>
    </div>
    <p style="font-size:12px;color:${C.muted};margin:12px 0 0 0;text-align:center;">If you didn&apos;t request this, you can safely ignore this email.</p>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
      <p style="margin:0;font-size:11px;color:${C.muted};">You&apos;re receiving this because you have an account on HomeBase.</p>
    </div>`,
  );
}

// ─── Daily Digest ───

export interface DigestTask {
  id: string;
  title: string;
  category: string;
  priority: "high" | "medium" | "low";
  dueDate: Date | null;
}

export interface DigestData {
  userName: string;
  userEmail: string;
  overdueTasks: DigestTask[];
  dueTodayTasks: DigestTask[];
  dueThisWeekTasks: DigestTask[];
  recentlyCompleted: DigestTask[];
  currentStreak: number | null;
  appUrl: string;
}

function digestTaskList(tasks: DigestTask[]): string {
  return `<ul style="margin:0;padding:0;list-style:none;">
    ${tasks
      .map((t) => {
        const duePart = t.dueDate
          ? `<span style="color:${C.muted};font-size:12px;"> &mdash; ${t.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>`
          : "";
        const priorityColor =
          t.priority === "high" ? C.dangerAccent : t.priority === "medium" ? C.warningAccent : C.mutedAccent;
        return `<li style="padding:5px 0;font-size:14px;color:${C.text};border-bottom:1px solid ${C.border};display:flex;align-items:baseline;gap:8px;">
          <span style="color:${C.brand};font-size:12px;flex-shrink:0;">&ndash;</span>
          <span>${t.title}${duePart}</span>
          <span style="margin-left:auto;font-size:11px;color:${priorityColor};text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;">${t.priority}</span>
        </li>`;
      })
      .join("")}
  </ul>`;
}

export function generateDigestHtml(data: DigestData): string {
  const { userName, overdueTasks, dueTodayTasks, dueThisWeekTasks, recentlyCompleted, currentStreak, appUrl } = data;
  const greeting = userName ? `Hi ${userName}` : "Hi there";

  const overdueCard =
    overdueTasks.length > 0
      ? sectionCard("Overdue", overdueTasks.length, C.dangerAccent, digestTaskList(overdueTasks), "Past their due date")
      : "";

  const todayCard =
    dueTodayTasks.length > 0
      ? sectionCard("Due Today", dueTodayTasks.length, C.warningAccent, digestTaskList(dueTodayTasks))
      : "";

  const weekCard =
    dueThisWeekTasks.length > 0
      ? sectionCard("Coming Up This Week", dueThisWeekTasks.length, C.neutralAccent, digestTaskList(dueThisWeekTasks))
      : "";

  const completedCard =
    recentlyCompleted.length > 0
      ? sectionCard(
          "Recently Completed",
          recentlyCompleted.length,
          C.successAccent,
          `<p style="margin:0 0 8px 0;font-size:13px;color:${C.muted};">Great work! You completed ${recentlyCompleted.length} task${recentlyCompleted.length === 1 ? "" : "s"} in the last 24 hours.</p>${digestTaskList(recentlyCompleted)}`,
        )
      : "";

  const streakBadge =
    currentStreak !== null && currentStreak > 0
      ? `<div style="text-align:center;margin-bottom:20px;background:${C.cardBg};border-radius:8px;border:1px solid ${C.border};padding:16px;">
          <p style="margin:0;font-size:22px;">&#128293;</p>
          <p style="margin:6px 0 2px 0;font-size:15px;font-weight:500;color:${C.text};">${currentStreak}-day streak</p>
          <p style="margin:0;font-size:12px;color:${C.muted};">Keep it going!</p>
        </div>`
      : "";

  const noTasks =
    overdueTasks.length === 0 &&
    dueTodayTasks.length === 0 &&
    dueThisWeekTasks.length === 0 &&
    recentlyCompleted.length === 0;

  const emptyState = noTasks
    ? `<div style="text-align:center;padding:32px 24px;background:${C.cardBg};border-radius:8px;border:1px solid ${C.border};">
        <p style="margin:0;font-size:14px;color:${C.muted};">You&apos;re all caught up &mdash; no pending tasks right now.</p>
      </div>`
    : "";

  return emailWrapper(
    "HomeBase Daily Digest",
    `${emailHeader("Daily Digest")}
    <p style="font-size:15px;color:${C.text};margin:0 0 4px 0;">${greeting},</p>
    <p style="font-size:14px;color:${C.muted};margin:0 0 24px 0;">Here&apos;s your task overview for today.</p>
    ${streakBadge}
    ${overdueCard}
    ${todayCard}
    ${weekCard}
    ${completedCard}
    ${emptyState}
    ${ctaButton(`${appUrl}/dashboard`, "View Dashboard")}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid ${C.border};text-align:center;">
      <p style="margin:0;font-size:11px;color:${C.muted};">You&apos;re receiving this because you have an account on HomeBase.</p>
    </div>`,
  );
}
