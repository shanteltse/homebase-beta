# HomeBase Migration Plan

> Migrating the legacy single-file PWA to a Next.js 16 turborepo.
> This is a ground-up rewrite, not a port. No legacy code is carried over.

---

## Overview

The legacy HomeBase app is a ~7,000-line single HTML file with embedded CSS/JS, vanilla JavaScript state management, direct browser API calls to Anthropic, and Firebase for optional cloud sync. The beta replaces it with a modular Next.js App Router architecture following the patterns defined in [CODING_GUIDELINES.md](./CODING_GUIDELINES.md).

## Server Architecture

HomeBase does **not** need a separate backend. Next.js serves as both the frontend and the server layer in a single deployment.

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel / Node                      │
│                                                         │
│  ┌──────────────┐    ┌────────────────────────────────┐ │
│  │  Next.js App  │    │  Next.js Server Layer          │ │
│  │  (React UI)   │───>│                                │ │
│  │               │    │  API Routes:                   │ │
│  │  - App Router │    │    /api/ai/parse-task           │ │
│  │  - RSC        │    │    /api/ai/suggest-links        │ │
│  │  - Client     │    │    /api/auth/session            │ │
│  │    Components │    │    /api/notifications/schedule   │ │
│  │               │    │    /api/email/digest             │ │
│  └──────────────┘    │                                │ │
│                       │  Server Actions:               │ │
│                       │    createTask, updateTask, etc. │ │
│                       │                                │ │
│                       │  Middleware:                    │ │
│                       │    Auth session validation      │ │
│                       └──────────┬─────────────────────┘ │
└──────────────────────────────────┼───────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
              │  Firebase  │ │ Anthropic │ │   Email   │
              │  Auth +    │ │ Claude    │ │  Provider │
              │  Firestore │ │ API       │ │ (Resend)  │
              └───────────┘ └───────────┘ └───────────┘
```

### What Lives Where

| Concern                     | Where it Runs                        | Why                                                            |
| --------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| **UI rendering**            | Client + Server Components           | Next.js App Router handles both                                |
| **Auth identity**           | Client-side Firebase Auth SDK        | Firebase handles sign-in UI and tokens                         |
| **Auth session**            | Next.js API route + httpOnly cookie  | Server sets secure cookie from Firebase token                  |
| **Route protection**        | Next.js middleware (`middleware.ts`) | Runs on edge before page loads                                 |
| **Firestore reads/writes**  | Client-side Firebase SDK             | Firestore security rules enforce access; React Query caches    |
| **Anthropic AI calls**      | Next.js API routes only              | API key stays server-side (audit requirement)                  |
| **Notification scheduling** | Vercel Cron + Next.js API route      | Durable server-side scheduling (not service worker setTimeout) |
| **Email digests**           | Vercel Cron + Next.js API route      | Server composes and sends via email provider                   |
| **Rate limiting**           | Next.js middleware or API routes     | Protects AI endpoints from abuse                               |

### Why Not a Separate Backend?

1. **Next.js API routes** handle every server-side need: auth cookies, AI proxy, email, cron triggers.
2. **Firestore** is the database — it has its own security rules and doesn't need a backend in front of it.
3. **Firebase Auth** runs client-side — the server only needs to verify tokens for the session cookie.
4. **Vercel Cron** handles scheduled jobs (notifications, digests) — no always-on server needed.
5. One deployment, one repo, one CI pipeline. No infra to manage.

### When You'd Reconsider

- **Heavy background processing** (e.g., processing thousands of recurring tasks at midnight) — move to Cloud Functions or a queue.
- **WebSocket real-time sync** beyond what Firestore's real-time listeners provide — add a dedicated service.
- **Multi-platform API** (React Native app needs the same API) — extract API routes into a shared service.

None of these apply at launch. Revisit when the need is concrete.

---

### What We're Migrating

| Legacy Feature                             | Complexity | Priority |
| ------------------------------------------ | ---------- | -------- |
| Task CRUD (create, edit, delete, complete) | Medium     | P0       |
| Categories & subcategories                 | Low        | P0       |
| Due dates & natural language parsing       | Medium     | P1       |
| Subtasks                                   | Low        | P1       |
| Recurring tasks                            | Medium     | P2       |
| Tags                                       | Low        | P1       |
| Assignees & household members              | Medium     | P2       |
| Calendar views (month/week/day)            | High       | P2       |
| Firebase Auth (email, Google)              | Medium     | P0       |
| Firestore sync                             | Medium     | P1       |
| Notifications & reminders                  | High       | P3       |
| AI task parsing (Anthropic)                | Medium     | P3       |
| AI link suggestions                        | Low        | P3       |
| Gamification & achievements                | Low        | P4       |
| Email digests                              | Medium     | P4       |
| Onboarding wizard                          | Low        | P2       |
| Dashboard rundown                          | Low        | P2       |
| Service worker / offline                   | High       | P4       |
| Settings management                        | Low        | P1       |

---

## Phases

### Phase 0: Foundation (current state -> buildable skeleton)

**Goal:** Set up the tooling, design system base, and domain model so every subsequent phase has a solid foundation.

#### 0.1 Install Core Dependencies

```
# apps/web
pnpm add @tanstack/react-query zod zustand axios
pnpm add react-hook-form @hookform/resolvers
pnpm add firebase firebase-admin

# packages/ui
pnpm add tailwindcss @tailwindcss/postcss class-variance-authority clsx tailwind-merge
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover
pnpm add @radix-ui/react-checkbox @radix-ui/react-select @radix-ui/react-tabs
pnpm add lucide-react

# dev dependencies (root or apps/web)
pnpm add -D vitest @testing-library/react @testing-library/user-event jsdom
pnpm add -D msw @mswjs/data
pnpm add -D @playwright/test
```

#### 0.2 Configure Tailwind CSS

- Set up Tailwind in `apps/web` and `packages/ui`.
- Define the HomeBase design tokens (colors, typography, spacing) based on the legacy palette:
  - Primary: `#b08068` (warm terracotta)
  - Background: `#faf7f4` (warm cream)
  - Text: `#4a3f3a` (dark brown)
  - Category colors for Home, Personal, Work
- Fonts: Inter (UI), DM Serif Display (headings)

#### 0.3 Define Domain Models & Zod Schemas

Create `src/types/` with typed domain boundaries before any feature code:

```
src/types/
├── task.ts          # Task, Subtask, RecurringPattern, TaskPriority, TaskStatus
├── category.ts      # Category, Subcategory
├── tag.ts           # Tag
├── user.ts          # User, UserSettings, NotificationPreferences
├── household.ts     # Household, HouseholdMember
└── gamification.ts  # Achievement, Badge, Stats
```

Each type file includes both the TypeScript type and the Zod schema so validation is defined once:

```ts
// src/types/task.ts
export const taskPrioritySchema = z.enum(["high", "medium", "low"]);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.string(),
  subcategory: z.string().optional(),
  priority: taskPrioritySchema.default("medium"),
  dueDate: z.string().datetime().optional(),
  completed: z.boolean().default(false),
  completedAt: z.string().datetime().optional(),
  subtasks: z.array(subtaskSchema).default([]),
  tags: z.array(z.string()).default([]),
  assignee: z.string().optional(),
  recurring: recurringPatternSchema.optional(),
  notes: z.string().optional(),
  links: z.array(z.string().url()).default([]),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Task = z.infer<typeof taskSchema>;
```

#### 0.4 Build Base UI Components

In `packages/ui`, create the essential primitives:

- [ ] `button.tsx` — with variants (primary, secondary, destructive, ghost)
- [ ] `input.tsx` — text input with label, error state
- [ ] `textarea.tsx`
- [ ] `select.tsx` — Radix Select
- [ ] `checkbox.tsx` — Radix Checkbox
- [ ] `dialog.tsx` — Radix Dialog (modal)
- [ ] `dropdown-menu.tsx` — Radix Dropdown
- [ ] `popover.tsx` — Radix Popover
- [ ] `tabs.tsx` — Radix Tabs
- [ ] `badge.tsx` — for tags, priorities, statuses
- [ ] `spinner.tsx` — loading indicator
- [ ] `card.tsx` — content container
- [ ] `form.tsx` — form wrapper integrating React Hook Form
- [ ] `cn.ts` — utility (`clsx` + `tailwind-merge`)

#### 0.5 Set Up App Shell

- [ ] Root `layout.tsx` — fonts, metadata, global styles
- [ ] `providers.tsx` — QueryClientProvider, auth context
- [ ] `(auth)/layout.tsx` — centered auth layout
- [ ] `(app)/layout.tsx` — dashboard layout with sidebar/nav
- [ ] `config/paths.ts` — all route definitions
- [ ] `config/env.ts` — env var validation with Zod
- [ ] `lib/react-query.ts` — QueryClient defaults
- [ ] `lib/api-client.ts` — configured fetch/axios instance

#### 0.6 Set Up Testing Infrastructure

- [ ] Vitest config in `apps/web`
- [ ] MSW handlers directory (`src/testing/mocks/handlers/`)
- [ ] Mock database setup (`src/testing/mocks/db.ts`)
- [ ] Custom `renderApp()` test utility
- [ ] Playwright config for e2e

**Exit criteria:** `pnpm dev` runs, app shell renders with nav, all types compile, one trivial test passes.

---

### Phase 1: Auth + Task CRUD (core loop)

**Goal:** A user can sign up, log in, and create/read/update/delete tasks. This is the minimum viable product.

#### 1.1 Authentication Feature

```
src/features/auth/
├── api/
│   ├── login.ts
│   ├── register.ts
│   ├── logout.ts
│   └── get-user.ts
├── components/
│   ├── login-form.tsx
│   ├── register-form.tsx
│   └── __tests__/
│       ├── login-form.test.tsx
│       └── register-form.test.tsx
└── hooks/
    └── use-auth.ts
```

- Firebase Auth with email/password and Google sign-in.
- Session via **httpOnly cookies** set by a Next.js API route (not client-side tokens).
- `middleware.ts` at the app root to protect `(app)` routes.
- Auth state provided via React Query (`useUser` pattern).

#### 1.2 Tasks Feature — CRUD

```
src/features/tasks/
├── api/
│   ├── get-tasks.ts
│   ├── get-task.ts
│   ├── create-task.ts
│   ├── update-task.ts
│   └── delete-task.ts
├── components/
│   ├── task-list.tsx
│   ├── task-card.tsx
│   ├── task-detail.tsx
│   ├── create-task-form.tsx
│   ├── edit-task-form.tsx
│   ├── task-filters.tsx
│   └── __tests__/
│       ├── task-list.test.tsx
│       └── create-task-form.test.tsx
├── hooks/
│   └── use-task-filters.ts
└── types/
    └── index.ts
```

- Task list page at `(app)/tasks/page.tsx`
- Task detail at `(app)/tasks/[taskId]/page.tsx`
- Filter by: status (all, overdue, today, upcoming), category, priority
- Sort by: due date, priority, created date
- Complete/uncomplete toggle
- Data stored in Firestore via client SDK (security rules enforce access; no API route needed)
- React Query caches Firestore data on the client

#### 1.3 Categories & Subcategories

- Built into the task creation/edit flow.
- Default categories: Family & Home, Personal, Work & Career.
- Subcategories per category (user-customizable in Phase 2).
- Color-coded category badges.

#### 1.4 Integration Tests

- [ ] Login flow (render form, submit, redirect to dashboard)
- [ ] Register flow
- [ ] Create task (fill form, submit, appears in list)
- [ ] Edit task
- [ ] Delete task (confirm dialog, removed from list)
- [ ] Filter tasks by category and status

**Exit criteria:** User can register, log in, create tasks with categories and priorities, view/filter task list, edit and delete tasks. All integration tests pass.

---

### Phase 2: Enrichment (make tasks useful)

**Goal:** Add the features that make tasks actionable — due dates, subtasks, tags, assignees, and the dashboard overview.

#### 2.1 Due Dates & Sorting

- Date picker component (Radix Popover + calendar grid or a lightweight library).
- Status derivation: overdue, due today, due soon (next 3 days), upcoming.
- Sort task list by due date.
- Visual indicators for overdue tasks.

#### 2.2 Subtasks

- Inline subtask list within task detail.
- Add/remove/toggle subtasks.
- Progress bar showing completion percentage.

#### 2.3 Tags Feature

```
src/features/tags/
├── api/
│   ├── get-tags.ts
│   ├── create-tag.ts
│   └── delete-tag.ts
├── components/
│   ├── tag-picker.tsx
│   ├── tag-manager.tsx
│   └── tag-badge.tsx
```

- Tag picker with search and inline creation.
- Filter tasks by tag.
- Tag management page in settings.

#### 2.4 Assignees

- Assign tasks to household members.
- Assignee avatar/name on task cards.
- Filter tasks by assignee.

#### 2.5 Settings Feature

```
src/features/settings/
├── components/
│   ├── settings-page.tsx
│   ├── category-settings.tsx
│   ├── assignee-settings.tsx
│   └── notification-settings.tsx (placeholder)
```

- Manage custom categories and subcategories.
- Manage household member list (assignees).
- Settings page at `(app)/settings/page.tsx`.

#### 2.6 Dashboard

- `(app)/dashboard/page.tsx` — the "Rundown" view.
- Top priority tasks.
- Today's tasks.
- Overdue count.
- Quick-add task bar.

#### 2.7 Onboarding Wizard

- First-time user flow after registration.
- Steps: add household members, pick starter categories, notification preferences.
- Stored as a `hasCompletedOnboarding` flag on the user profile.

**Exit criteria:** Tasks have due dates with overdue indicators, subtasks with progress, tags with picker, assignees. Dashboard shows daily overview. Settings page manages categories/assignees.

---

### Phase 3: Calendar + Sync + Notifications

**Goal:** Multi-view calendar, reliable Firestore sync, and durable notification system.

#### 3.1 Calendar Feature

```
src/features/calendar/
├── components/
│   ├── calendar-view.tsx
│   ├── month-view.tsx
│   ├── week-view.tsx
│   ├── day-view.tsx
│   ├── calendar-task-item.tsx
│   └── calendar-nav.tsx
├── hooks/
│   └── use-calendar-state.ts
```

- Month, week, and day views.
- Tasks displayed on their due dates.
- Click a day to see/add tasks.
- View preference persisted in URL params.

#### 3.2 Firestore Data Layer

- `src/lib/firestore.ts` — Firestore client SDK configuration.
- **Client-side Firestore SDK** handles reads/writes directly — no API routes in between.
- Firestore security rules are the access control layer (not a backend).
- React Query manages client-side cache; Firestore is the persistence layer.
- Firestore's real-time listeners (`onSnapshot`) can feed into React Query for live updates.
- Conflict resolution: last-write-wins with `updatedAt` timestamps.
- Data model in Firestore:
  ```
  users/{userId}/tasks/{taskId}
  users/{userId}/tags/{tagId}
  users/{userId}/settings
  households/{code}/members/{userId}
  households/{code}/tasks/{taskId}  (shared tasks)
  ```
- **What still goes through API routes:** Only things that need server secrets or server authority:
  - AI calls (Anthropic API key)
  - Auth session cookie (httpOnly, set by server)
  - Email sending (email provider API key)
  - Cron-triggered jobs (notification dispatch, digest generation)

#### 3.3 Household Sharing

```
src/features/household/
├── api/
│   ├── create-household.ts
│   ├── join-household.ts
│   ├── get-household.ts
│   └── get-members.ts
├── components/
│   ├── household-settings.tsx
│   ├── invite-member.tsx
│   └── member-list.tsx
```

- Generate/join household codes.
- Shared task lists within household.
- Tightened Firestore rules (address audit finding).

#### 3.4 Notifications

```
src/features/notifications/
├── api/
│   ├── schedule-notification.ts
│   └── get-notification-preferences.ts
├── components/
│   ├── notification-settings.tsx
│   └── notification-toast.tsx
├── hooks/
│   └── use-notifications.ts
```

- **Server-scheduled** notifications (not service worker setTimeout — addresses audit finding).
- Morning recap, overdue reminders, due-today alerts.
- Quiet hours support.
- Web Push via FCM with server-side scheduling.
- In-app notification toast system via Zustand store.

#### 3.5 Recurring Tasks

- Recurring patterns: daily, weekly, biweekly, monthly, custom intervals.
- Server-side recurrence generation (API route creates next occurrence on completion).
- UI for setting recurrence in task form.

**Exit criteria:** Calendar renders tasks across month/week/day views. Data syncs to Firestore. Household members share tasks. Notifications are server-scheduled and reliable. Recurring tasks auto-generate.

---

### Phase 4: AI Features

**Goal:** Restore AI-powered features with proper server-side key management.

#### 4.1 AI Proxy API Route

```
app/api/ai/
├── parse-task/route.ts      # Natural language -> structured task fields
└── suggest-links/route.ts   # Task title -> relevant link suggestions
```

- Anthropic API key stored as server-side environment variable (`ANTHROPIC_API_KEY`).
- **Never exposed to the browser** (addresses critical audit finding).
- Rate limiting per user.
- Input sanitization before sending to Claude.

#### 4.2 Natural Language Task Input

- Enhanced task creation: user types "dentist appointment next Tuesday at 3pm" and AI extracts:
  - Title: "Dentist appointment"
  - Due date: next Tuesday 3:00 PM
  - Category: Personal > Health
- Shown as a suggestion the user can accept/modify.

#### 4.3 AI Follow-Up Suggestions

- On task completion, optionally suggest follow-up tasks.
- User can accept, dismiss, or modify.

#### 4.4 Smart Link Suggestions

- Given a task title, suggest relevant URLs.
- User can attach or dismiss.

**Exit criteria:** AI features work entirely through server-side proxy. User can use natural language input. Suggestions are non-intrusive and dismissible.

---

### Phase 5: Polish & Scale

**Goal:** Gamification, email digests, offline support, performance optimization, and production hardening.

#### 5.1 Gamification

```
src/features/gamification/
├── components/
│   ├── achievement-badge.tsx
│   ├── stats-dashboard.tsx
│   └── completion-celebration.tsx
├── hooks/
│   └── use-achievements.ts
```

- Badges for milestones (first task, 7-day streak, etc.).
- Completion celebration animation (confetti).
- Weekly/monthly stats.

#### 5.2 Email Digests

- API route that composes and sends HTML email recap.
- Configurable frequency (daily/weekly) and time.
- Email provider integration (Resend, SendGrid, or similar).

#### 5.3 Offline Support (PWA)

- Service worker with `next-pwa` or custom implementation.
- Cache app shell and static assets.
- Queue mutations when offline, sync when back online.
- This is P4 because it requires careful handling of conflict resolution.

#### 5.4 Performance & Production Hardening

- [ ] Sentry integration for error tracking.
- [ ] CSP headers in `next.config.js` (addresses audit finding).
- [ ] Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- [ ] Lighthouse audit — target 90+ on all metrics.
- [ ] Bundle analysis and optimization.
- [ ] Image optimization (next/image for any user-facing images).
- [ ] Rate limiting on API routes.

#### 5.5 E2E Test Suite

- [ ] Full auth flow (register -> onboard -> dashboard).
- [ ] Task lifecycle (create -> edit -> complete -> delete).
- [ ] Calendar navigation.
- [ ] Household invite and shared tasks.
- [ ] Settings changes persist.

**Exit criteria:** Production-ready app with error tracking, security headers, offline support, gamification, email digests, and comprehensive E2E coverage.

---

## Phase Summary

| Phase | Name                            | Delivers                                                              | Key Dependencies     |
| ----- | ------------------------------- | --------------------------------------------------------------------- | -------------------- |
| **0** | Foundation                      | Tooling, types, UI primitives, app shell, test infra                  | None                 |
| **1** | Auth + Task CRUD                | Login/register, task create/read/update/delete, filters               | Phase 0              |
| **2** | Enrichment                      | Due dates, subtasks, tags, assignees, settings, dashboard, onboarding | Phase 1              |
| **3** | Calendar + Sync + Notifications | Calendar views, Firestore sync, households, notifications, recurring  | Phase 2              |
| **4** | AI Features                     | Server-proxied NLP parsing, link suggestions, follow-ups              | Phase 1 (API routes) |
| **5** | Polish & Scale                  | Gamification, email digests, offline/PWA, security hardening, E2E     | Phase 3              |

Phases 3 and 4 can run in parallel since they have no interdependencies beyond Phase 1.

---

## Risks & Mitigations

| Risk                                   | Impact                  | Mitigation                                                      |
| -------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| Firestore rules too permissive         | Data leak between users | Write rules test suite; rule: users read/write only own data    |
| Offline sync conflicts                 | Data loss               | Last-write-wins with `updatedAt`; defer full offline to Phase 5 |
| AI costs spiral                        | Budget overrun          | Rate limit per user; cache common parse patterns server-side    |
| Scope creep from legacy feature parity | Never ships             | Phases are scoped; ship Phase 1 as usable MVP                   |
| Next.js 16 breaking changes            | Migration friction      | Pin version; follow canary changelog                            |

---

## Definition of Done (per phase)

- [ ] All features in the phase work end-to-end.
- [ ] Integration tests pass for every user-facing flow.
- [ ] No TypeScript errors (`pnpm check-types` passes).
- [ ] No lint errors (`pnpm lint` passes).
- [ ] Code follows [CODING_GUIDELINES.md](./CODING_GUIDELINES.md).
- [ ] No secrets in client bundles.
- [ ] PR reviewed and merged to `main`.
