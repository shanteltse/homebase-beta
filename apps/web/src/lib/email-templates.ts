export interface PasswordResetData {
  userName: string | null;
  resetUrl: string;
  appUrl: string;
}

export function generatePasswordResetHtml(data: PasswordResetData): string {
  const { userName, resetUrl } = data;
  const greeting = userName ? `Hi ${userName}` : "Hi there";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your HomeBase password</title>
</head>
<body style="margin:0;padding:0;background:#faf7f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:40px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="margin:0;font-size:28px;color:#b08068;font-weight:700;">HomeBase</h1>
    </div>
    <p style="font-size:16px;color:#4a3f3a;margin:0 0 8px 0;">${greeting},</p>
    <p style="font-size:15px;color:#7a6f6a;margin:0 0 24px 0;">
      We received a request to reset your password. Click the button below to choose a new one.
      This link expires in 1 hour.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#b08068;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
        Reset password
      </a>
    </div>
    <p style="font-size:13px;color:#7a6f6a;margin:0 0 4px 0;">
      If you didn&apos;t request this, you can safely ignore this email.
    </p>
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e8e0da;text-align:center;">
      <p style="margin:0;font-size:12px;color:#7a6f6a;">
        You&apos;re receiving this because you have an account on HomeBase.
      </p>
    </div>
  </div>
</body>
</html>`;
}

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

const COLORS = {
  primary: "#b08068",
  background: "#faf7f4",
  text: "#4a3f3a",
  textLight: "#7a6f6a",
  danger: "#c0392b",
  dangerBg: "#fdf0ef",
  success: "#27ae60",
  successBg: "#eafaf1",
  warning: "#f39c12",
  warningBg: "#fef9e7",
  border: "#e8e0da",
  white: "#ffffff",
};

function priorityBadge(priority: string): string {
  const colors: Record<string, string> = {
    high: COLORS.danger,
    medium: COLORS.warning,
    low: COLORS.textLight,
  };
  const color = colors[priority] ?? COLORS.textLight;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:${COLORS.white};background:${color};text-transform:uppercase;">${priority}</span>`;
}

function taskRow(task: DigestTask): string {
  const duePart = task.dueDate
    ? `<span style="color:${COLORS.textLight};font-size:13px;"> &mdash; due ${task.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>`
    : "";
  return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid ${COLORS.border};font-size:14px;color:${COLORS.text};">
        ${task.title} ${duePart}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid ${COLORS.border};text-align:right;">
        ${priorityBadge(task.priority)}
      </td>
    </tr>`;
}

function taskTable(tasks: DigestTask[]): string {
  if (tasks.length === 0) return "";
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      ${tasks.map(taskRow).join("")}
    </table>`;
}

function section(
  title: string,
  count: number,
  bgColor: string,
  accentColor: string,
  content: string,
): string {
  return `
    <div style="margin-bottom:24px;background:${bgColor};border-radius:8px;padding:16px;border-left:4px solid ${accentColor};">
      <h2 style="margin:0 0 8px 0;font-size:16px;color:${accentColor};">${title} (${count})</h2>
      ${content}
    </div>`;
}

export function generateDigestHtml(data: DigestData): string {
  const {
    userName,
    overdueTasks,
    dueTodayTasks,
    dueThisWeekTasks,
    recentlyCompleted,
    currentStreak,
    appUrl,
  } = data;

  const greeting = userName ? `Hi ${userName}` : "Hi there";

  let overdueSection = "";
  if (overdueTasks.length > 0) {
    overdueSection = section(
      "Overdue",
      overdueTasks.length,
      COLORS.dangerBg,
      COLORS.danger,
      `<p style="margin:0 0 8px 0;font-size:13px;color:${COLORS.danger};">These tasks are past their due date.</p>${taskTable(overdueTasks)}`,
    );
  }

  let todaySection = "";
  if (dueTodayTasks.length > 0) {
    todaySection = section(
      "Due Today",
      dueTodayTasks.length,
      COLORS.warningBg,
      COLORS.warning,
      taskTable(dueTodayTasks),
    );
  }

  let weekSection = "";
  if (dueThisWeekTasks.length > 0) {
    weekSection = section(
      "Coming Up This Week",
      dueThisWeekTasks.length,
      COLORS.white,
      COLORS.primary,
      taskTable(dueThisWeekTasks),
    );
  }

  let completedSection = "";
  if (recentlyCompleted.length > 0) {
    completedSection = section(
      "Recently Completed",
      recentlyCompleted.length,
      COLORS.successBg,
      COLORS.success,
      `<p style="margin:0;font-size:13px;color:${COLORS.success};">Great work! You completed ${recentlyCompleted.length} task${recentlyCompleted.length === 1 ? "" : "s"} in the last 24 hours.</p>
      <ul style="margin:8px 0 0 0;padding-left:20px;color:${COLORS.text};font-size:14px;">
        ${recentlyCompleted.map((t) => `<li style="margin-bottom:4px;">${t.title}</li>`).join("")}
      </ul>`,
    );
  }

  let streakSection = "";
  if (currentStreak !== null && currentStreak > 0) {
    streakSection = `
      <div style="text-align:center;margin-bottom:24px;padding:16px;background:${COLORS.warningBg};border-radius:8px;">
        <span style="font-size:32px;">&#128293;</span>
        <p style="margin:8px 0 0 0;font-size:16px;font-weight:600;color:${COLORS.text};">${currentStreak}-day streak!</p>
        <p style="margin:4px 0 0 0;font-size:13px;color:${COLORS.textLight};">Keep it going!</p>
      </div>`;
  }

  const noTasks =
    overdueTasks.length === 0 &&
    dueTodayTasks.length === 0 &&
    dueThisWeekTasks.length === 0 &&
    recentlyCompleted.length === 0;

  const emptyState = noTasks
    ? `<div style="text-align:center;padding:24px;color:${COLORS.textLight};font-size:14px;">
        <p>You're all caught up! No pending tasks right now.</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HomeBase Daily Digest</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="margin:0;font-size:28px;color:${COLORS.primary};font-weight:700;">HomeBase</h1>
      <p style="margin:4px 0 0 0;font-size:13px;color:${COLORS.textLight};">Daily Digest</p>
    </div>

    <!-- Greeting -->
    <p style="font-size:16px;color:${COLORS.text};margin:0 0 24px 0;">${greeting}, here's your task overview for today:</p>

    ${streakSection}
    ${overdueSection}
    ${todaySection}
    ${weekSection}
    ${completedSection}
    ${emptyState}

    <!-- CTA -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 32px;background:${COLORS.primary};color:${COLORS.white};text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">View Dashboard</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid ${COLORS.border};">
      <p style="margin:0;font-size:12px;color:${COLORS.textLight};">
        You're receiving this because you have an account on HomeBase.
      </p>
    </div>
  </div>
</body>
</html>`;
}
