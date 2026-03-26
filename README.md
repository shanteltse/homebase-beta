# HomeBase

A household task management app with shared task lists, calendar views, AI-powered task input, and gamification. Built as a modern web + mobile app.

**Live site:** https://homebase-beta-vert.vercel.app

---

## Table of Contents

- [What This App Does](#what-this-app-does)
- [Tech Stack Overview](#tech-stack-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup (Neon Postgres)](#database-setup-neon-postgres)
- [Running the App](#running-the-app)
- [Running the Mobile App](#running-the-mobile-app)
- [Available Commands](#available-commands)
- [How the App is Organized](#how-the-app-is-organized)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Testing](#testing)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Key Design Decisions](#key-design-decisions)
- [Extending the App](#extending-the-app)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Further Reading](#further-reading)

---

## What This App Does

HomeBase helps households manage tasks together. Key features:

- **Task management** — Create, edit, complete, and delete tasks with priorities, categories, due dates, subtasks, tags, and notes
- **Household sharing** — Create a household with a join code, invite members, assign tasks to each other
- **Calendar views** — See tasks on a month, week, or day calendar
- **AI smart input** — Type a natural language description (e.g., "dentist Tuesday 3pm") and AI extracts the task details
- **Notifications** — Overdue reminders, due-today alerts, and in-app notifications
- **Achievements** — Gamification badges for milestones like completing your first task or hitting streaks
- **Mobile app** — A companion React Native (Expo) app that connects to the same backend

---

## Tech Stack Overview

You don't need to be deeply familiar with all of these, but here's what powers the app:

| Layer | Technology | What It Does |
|-------|-----------|--------------|
| **Monorepo** | Turborepo + pnpm | Manages multiple apps/packages in one repo |
| **Web app** | Next.js 16 (React 19) | The main web application (server + client) |
| **Mobile app** | Expo SDK 54 (React Native) | iOS/Android companion app |
| **Styling** | Tailwind CSS 4 | Utility-based CSS (classes like `bg-red-500`) |
| **UI components** | Radix UI | Accessible, pre-built interactive components (dialogs, dropdowns, etc.) |
| **Database** | Neon Postgres | Cloud-hosted PostgreSQL database |
| **ORM** | Drizzle ORM | Translates between TypeScript and SQL |
| **Auth** | NextAuth v5 (Auth.js) | Handles login/signup (email+password and Google) |
| **State** | React Query + Zustand | Manages server data caching and global app state |
| **Forms** | React Hook Form + Zod | Form handling and input validation |
| **AI** | Anthropic Claude API | Powers the smart task parsing feature |
| **Testing** | Vitest + Playwright | Unit/integration tests + browser automation tests |
| **Deploy** | Vercel | Hosts the web app with automatic deployments |

---

## Project Structure

This is a **monorepo** — multiple apps and shared packages live in one repository.

```
homebase-beta/
├── apps/
│   ├── web/                  # The main Next.js web app
│   │   ├── src/
│   │   │   ├── app/          # Pages and API routes
│   │   │   │   ├── (auth)/   # Login and register pages
│   │   │   │   ├── (app)/    # Main app pages (dashboard, tasks, calendar, settings)
│   │   │   │   └── api/      # Server-side API endpoints
│   │   │   ├── components/   # Shared UI components
│   │   │   ├── config/       # App configuration (env vars, routes)
│   │   │   ├── db/           # Database connection and schema
│   │   │   ├── features/     # Feature modules (tasks, auth, calendar, etc.)
│   │   │   ├── hooks/        # Reusable React hooks
│   │   │   ├── lib/          # Core utilities (auth, API client, rate limiting)
│   │   │   ├── stores/       # Global state stores
│   │   │   ├── testing/      # Test setup and mock data
│   │   │   ├── types/        # TypeScript type definitions
│   │   │   └── utils/        # Helper functions
│   │   ├── e2e/              # End-to-end browser tests
│   │   ├── public/           # Static files (icons, manifest)
│   │   └── .env.example      # Template for environment variables
│   │
│   └── mobile/               # Expo React Native mobile app
│       ├── src/
│       │   ├── app/          # Screens (file-based routing, like the web app)
│       │   ├── components/   # Mobile UI components
│       │   ├── features/     # Feature modules
│       │   ├── hooks/        # Mobile-specific hooks
│       │   └── lib/          # API client, auth helpers
│       └── app.json          # Expo configuration
│
├── packages/
│   ├── shared/               # Types and schemas shared between web + mobile
│   │   └── src/
│   │       ├── types/        # Task, User, Household, Category, Tag, Gamification
│   │       └── constants/    # Achievement definitions
│   ├── ui/                   # Shared web UI component library
│   ├── eslint-config/        # Shared code linting rules
│   └── typescript-config/    # Shared TypeScript settings
│
├── docs/                     # Project documentation
│   ├── CODING_GUIDELINES.md  # Architecture patterns and code standards
│   ├── MIGRATION_PLAN.md     # Original 5-phase migration roadmap
│   └── AUDIT_FINDINGS.md     # Security audit of the legacy app
│
├── turbo.json                # Monorepo task configuration
├── pnpm-workspace.yaml       # Workspace definitions
└── package.json              # Root scripts and dependencies
```

---

## Getting Started

### Prerequisites

You need these installed on your machine:

1. **Node.js 22** — [Download here](https://nodejs.org/) (use the LTS version)
2. **pnpm 9** — Install after Node.js:
   ```bash
   npm install -g pnpm@9
   ```
3. **Git** — [Download here](https://git-scm.com/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/homebase-beta.git
cd homebase-beta

# 2. Install all dependencies
pnpm install

# 3. Copy the environment variables template
cp apps/web/.env.example apps/web/.env
```

Now fill in the `.env` file — see [Environment Variables](#environment-variables) below.

---

## Environment Variables

All environment variables go in `apps/web/.env`. Here's what each one does:

```bash
# REQUIRED — Your Neon Postgres database connection string
# Get this from your Neon dashboard (see Database Setup below)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# REQUIRED — A random secret used to sign authentication tokens
# Generate one by running this in your terminal:
#   openssl rand -base64 32
AUTH_SECRET="your-generated-secret-here"

# OPTIONAL — For "Sign in with Google" functionality
# Get these from Google Cloud Console > APIs & Services > Credentials
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# OPTIONAL — For AI-powered task parsing
# Get this from https://console.anthropic.com/
ANTHROPIC_API_KEY=""

# OPTIONAL — Secret for Vercel Cron jobs (notification generation, email digests)
# Only needed in production. Generate with: openssl rand -base64 32
CRON_SECRET=""
```

**Important:** Never commit the `.env` file to git. It's already in `.gitignore`.

---

## Database Setup (Neon Postgres)

This app uses [Neon](https://neon.tech) — a cloud-hosted PostgreSQL database. There is no local database to set up.

### Creating a Neon Database

1. Sign up at [neon.tech](https://neon.tech) (free tier available)
2. Create a new project
3. Copy the connection string — it looks like `postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Paste it as `DATABASE_URL` in your `apps/web/.env`

### Setting Up the Schema

Once your `DATABASE_URL` is configured:

```bash
# Push the schema to your database (creates all tables)
pnpm --filter web db:push

# Optionally, seed with sample data
pnpm --filter web db:seed
```

### Neon Branching (Environments)

Neon supports database branching (similar to git branches). The project uses:

| Environment | Neon Branch | Purpose |
|-------------|-------------|---------|
| Production | `main` | Live user data |
| Development | `preview/dev` | Testing new features |
| CI | `ci` | Automated test runs |

You can create branches in the Neon dashboard. Each branch gets its own connection string.

### Viewing Your Data

```bash
# Open Drizzle Studio — a visual database browser
pnpm --filter web db:studio
```

This opens a web interface where you can browse tables and data.

---

## Running the App

### Web App (Development)

```bash
# Start the development server (all apps)
pnpm dev

# Or just the web app
pnpm --filter web dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
# Build everything
pnpm build

# Start the production server
pnpm --filter web start
```

---

## Running the Mobile App

The mobile app is built with [Expo](https://expo.dev/) and connects to the web app's API.

### Prerequisites

1. Install the **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Make sure your phone and computer are on the same WiFi network

### Running Locally

```bash
# Start the Expo development server
pnpm --filter mobile dev
```

This shows a QR code in your terminal. Scan it with:
- **iOS:** Camera app
- **Android:** Expo Go app

### Mobile API Configuration

The mobile app needs to know where the API server is. This is set in `apps/mobile/app.json`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://homebase-beta-vert.vercel.app"
    }
  }
}
```

- **For production:** Use your deployed Vercel URL (already configured)
- **For local development:** Change this to your computer's local IP (e.g., `http://192.168.1.100:3000`). Find your IP with `ifconfig` (Mac) or `ipconfig` (Windows).

### Key Mobile Details

- **Auth:** Uses JWT tokens stored securely on the device (not cookies like the web app)
- **Styling:** Uses plain React Native `StyleSheet` (not Tailwind/NativeWind — incompatible with Expo Go SDK 54)
- **Design:** Warm earth-tone palette matching the web app (#b08068 terracotta primary, #faf7f4 cream background)

---

## Available Commands

Run these from the repository root:

| Command | What It Does |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Check code for style issues |
| `pnpm fmt` | Auto-format code with Prettier |
| `pnpm check-types` | Check for TypeScript errors |
| `pnpm test` | Run unit and integration tests |
| `pnpm --filter web dev` | Start only the web app |
| `pnpm --filter mobile dev` | Start only the mobile app |
| `pnpm --filter web test:e2e` | Run end-to-end browser tests |
| `pnpm --filter web db:push` | Push schema changes to the database |
| `pnpm --filter web db:generate` | Generate a migration file from schema changes |
| `pnpm --filter web db:migrate` | Run pending database migrations |
| `pnpm --filter web db:studio` | Open visual database browser |
| `pnpm --filter web db:seed` | Populate database with sample data |

---

## How the App is Organized

### Feature Modules

The app is organized by **feature** — each feature is a self-contained folder with its own API calls, components, and hooks:

```
src/features/
├── auth/          # Login, registration, session management
├── tasks/         # Task CRUD, filtering, sorting, task cards
├── calendar/      # Month, week, and day calendar views
├── household/     # Household creation, join codes, member management
├── notifications/ # In-app notifications, reminders
├── ai/            # AI task parsing and suggestions
└── gamification/  # Achievements, badges, streaks
```

Each feature follows this pattern:
```
features/tasks/
├── api/           # Functions that talk to the server
├── components/    # UI components for this feature
├── hooks/         # Custom React hooks for this feature
└── __tests__/     # Tests for this feature
```

### Data Flow

All data follows this path:

```
User Interface (React components)
    ↕ React Query (caches data, manages loading states)
    ↕ API Client (sends HTTP requests)
    ↕ API Routes (server-side, in apps/web/src/app/api/)
    ↕ Drizzle ORM (translates to SQL)
    ↕ Neon Postgres (database)
```

**Key rule:** The database is never accessed directly from the browser. All data goes through API routes on the server.

---

## Authentication

The app supports two login methods:

1. **Email + Password** — Users register with email/password; passwords are hashed with bcrypt
2. **Google OAuth** — "Sign in with Google" (requires Google Cloud credentials)

### How Auth Works

- **Web app:** Uses NextAuth v5 with JWT sessions stored in secure cookies
- **Mobile app:** Gets a JWT token from `/api/auth/mobile/token` and stores it in the device's secure storage. Sends it as a `Bearer` token with every API request.

Both paths are handled automatically. The server checks for a Bearer token first (mobile), then falls back to checking the NextAuth session cookie (web).

### Setting Up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select an existing one)
3. Go to **APIs & Services > Credentials**
4. Create an **OAuth 2.0 Client ID** (Web application type)
5. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
   - For local dev: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret into your `.env` file

---

## Database Schema

The database has these tables:

### Auth Tables (managed by NextAuth)
- **users** — User accounts (id, name, email, password hash, timestamps)
- **accounts** — OAuth provider connections (Google, etc.)
- **sessions** — Active sessions
- **verification_tokens** — Email verification tokens

### App Tables
- **tasks** — All task data (title, category, priority, status, due date, subtasks, tags, notes, links, recurring pattern, starred flag)
- **households** — Household groups (name, join code, creator)
- **household_members** — Links users to households (with role: owner or member)
- **achievements** — Unlocked achievement badges per user
- **notifications** — In-app notifications (type, title, message, read status)

### Modifying the Schema

The schema is defined in `apps/web/src/db/schema.ts`. To make changes:

1. Edit the schema file
2. Run `pnpm --filter web db:push` to apply changes directly, **OR**
3. Run `pnpm --filter web db:generate` to create a migration file, then `pnpm --filter web db:migrate` to apply it

Use `db:push` for quick development. Use `db:generate` + `db:migrate` for production changes (creates a versioned migration history).

---

## API Routes

All server-side endpoints live in `apps/web/src/app/api/`. Here's every route:

### Authentication
| Method | Route | What It Does |
|--------|-------|-------------|
| `*` | `/api/auth/[...nextauth]` | NextAuth.js handlers (login, logout, session) |
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/mobile/token` | Get a JWT for mobile app login |
| `POST` | `/api/auth/mobile/register` | Register from the mobile app |

### Tasks
| Method | Route | What It Does |
|--------|-------|-------------|
| `GET` | `/api/tasks` | List all tasks for the current user |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/[taskId]` | Get a single task |
| `PATCH` | `/api/tasks/[taskId]` | Update a task |
| `DELETE` | `/api/tasks/[taskId]` | Delete a task |

### Households
| Method | Route | What It Does |
|--------|-------|-------------|
| `GET` | `/api/households` | Get the user's household |
| `POST` | `/api/households` | Create a new household |
| `POST` | `/api/households/join` | Join a household with a code |
| `POST` | `/api/households/leave` | Leave the current household |
| `GET` | `/api/households/members` | List household members |

### Notifications
| Method | Route | What It Does |
|--------|-------|-------------|
| `GET` | `/api/notifications` | Get notifications for the current user |
| `PATCH` | `/api/notifications/[id]` | Mark a notification as read |
| `DELETE` | `/api/notifications/[id]` | Delete a notification |
| `POST` | `/api/notifications/read-all` | Mark all notifications as read |
| `POST` | `/api/notifications/generate` | Generate notifications (called by Vercel Cron) |

### Achievements
| Method | Route | What It Does |
|--------|-------|-------------|
| `GET` | `/api/achievements` | Get the user's achievements |
| `POST` | `/api/achievements/check` | Check and unlock new achievements |

### AI Features
| Method | Route | What It Does |
|--------|-------|-------------|
| `POST` | `/api/ai/parse-task` | Parse natural language into task fields |
| `POST` | `/api/ai/suggest-links` | Suggest relevant links for a task |

### Email
| Method | Route | What It Does |
|--------|-------|-------------|
| `POST` | `/api/email/digest` | Send email digest (called by Vercel Cron) |

---

## Testing

### Running Tests

```bash
# Unit + integration tests
pnpm test

# Watch mode (re-runs on file changes)
pnpm --filter web test:watch

# End-to-end browser tests
pnpm --filter web test:e2e
```

### Test Structure

- **Unit/integration tests** use [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) and live next to the code they test in `__tests__/` folders
- **End-to-end tests** use [Playwright](https://playwright.dev/) and live in `apps/web/e2e/`
- **Mock API responses** use [MSW (Mock Service Worker)](https://mswjs.io/) in `apps/web/src/testing/`

### Writing a New Test

Tests go in a `__tests__` folder next to the component:

```
features/tasks/components/__tests__/task-card.test.tsx
```

---

## Deployment

### Vercel (Web App)

The web app is deployed to [Vercel](https://vercel.com/). Deployment is automatic:

- **Push to `main`** → deploys to production
- **Open a pull request** → creates a preview deployment

#### Vercel Project Settings

- **Root directory:** `apps/web` (set in Vercel project settings, not in config files)
- **Framework:** Next.js (auto-detected)
- **Node.js version:** 22

#### Environment Variables in Vercel

Add these in your Vercel project settings (Settings > Environment Variables):

| Variable | Required | Environment |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | All |
| `AUTH_SECRET` | Yes | All |
| `AUTH_GOOGLE_ID` | Optional | All |
| `AUTH_GOOGLE_SECRET` | Optional | All |
| `ANTHROPIC_API_KEY` | Optional | All |
| `CRON_SECRET` | Optional | Production |

### Mobile App

The mobile app is not yet published to app stores. Currently it runs via Expo Go for development and testing. To publish:

1. Create an [Expo account](https://expo.dev/)
2. Run `eas build` to create iOS/Android builds
3. Submit to App Store / Google Play via `eas submit`

See the [Expo docs on publishing](https://docs.expo.dev/distribution/introduction/) for full instructions.

---

## CI/CD Pipeline

Every push to `main` and every pull request runs these automated checks via GitHub Actions:

| Check | What It Does | Must Pass? |
|-------|-------------|------------|
| **Lint** | Checks code style and formatting | Yes |
| **Type Check** | Ensures no TypeScript errors | Yes |
| **Unit Tests** | Runs Vitest test suite | Yes |
| **E2E Tests** | Runs Playwright browser tests | Yes |

The CI config is in `.github/workflows/ci.yml`.

### GitHub Secrets Needed

For CI to work, add these secrets in your GitHub repo (Settings > Secrets and variables > Actions):

| Secret | What It's For |
|--------|--------------|
| `CI_DATABASE_URL` | Connection string for the CI Neon branch |
| `AUTH_SECRET` | Auth token signing (same format as local) |

---

## Key Design Decisions

These are important architectural choices to understand before making changes:

### No Separate Backend
Next.js serves as both the frontend and the API. All server-side logic lives in `apps/web/src/app/api/` routes. There's no Express server, no separate API project.

### All Data Through API Routes
Even though Next.js supports Server Components that can query the database directly, this app routes everything through API endpoints. This is because the mobile app also needs to call the same endpoints.

### JWT Auth Strategy
Authentication uses JWT (JSON Web Tokens) rather than database sessions. This means the server doesn't need to look up a session in the database on every request — the token contains the user's identity.

### Dual Auth Support
The server accepts authentication two ways: via NextAuth session cookies (web) and via Bearer tokens (mobile). The `getAuthUser()` helper in `lib/get-auth-user.ts` handles both transparently.

### Feature-Based Organization
Code is organized by feature (tasks, calendar, auth) rather than by type (all components together, all hooks together). This keeps related code close together and makes features easier to find and modify.

### Shared Package
Types, schemas, and constants that both the web and mobile app need live in `packages/shared`. This avoids duplicating type definitions.

### Security First
- API keys (Anthropic, database) are never exposed to the browser
- All inputs are validated with Zod schemas on both client and server
- Security headers are configured in `next.config.js` (HSTS, X-Frame-Options, etc.)
- Rate limiting protects API endpoints (20 req/min for AI, 100 req/min general)
- Row-level security: API routes always filter by the authenticated user's ID

---

## Extending the App

### Adding a New Feature

1. **Create the feature folder:**
   ```
   src/features/your-feature/
   ├── api/           # API calls + React Query hooks
   ├── components/    # UI components
   └── hooks/         # Custom hooks (if needed)
   ```

2. **If it needs new database tables:** Add them to `apps/web/src/db/schema.ts` and run `pnpm --filter web db:push`

3. **If it needs new API routes:** Create them in `apps/web/src/app/api/your-feature/route.ts`

4. **If it needs a new page:** Create it in `apps/web/src/app/(app)/your-feature/page.tsx`

5. **Add shared types** to `packages/shared/src/types/` if the mobile app also needs them

### Adding a New API Endpoint

Create a `route.ts` file in the appropriate `api/` folder:

```typescript
// apps/web/src/app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your logic here...

  return NextResponse.json({ data: "your data" });
}
```

### Adding a New Database Table

1. Define the table in `apps/web/src/db/schema.ts`:
   ```typescript
   export const yourTable = pgTable("your_table", {
     id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
     userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
     // ... your columns
     createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
   });
   ```

2. Push to database: `pnpm --filter web db:push`

### Adding a New UI Component

Shared UI components (buttons, inputs, dialogs) go in `packages/ui/src/`. Feature-specific components go in the feature's `components/` folder.

### Ideas for Extended Functionality

Here are some features that could be built on top of the current foundation:

| Feature | Complexity | What's Needed |
|---------|-----------|---------------|
| **Push notifications (mobile)** | Medium | New `push_tokens` DB table, Expo Push Notifications integration, new API routes |
| **Offline support (mobile)** | High | React Query persist to device storage, mutation queue for offline changes |
| **Email digests** | Medium | Email provider integration (Resend/SendGrid), HTML email templates, Vercel Cron schedule |
| **Recurring task auto-generation** | Medium | Server-side logic to create next occurrence when a recurring task is completed |
| **Google OAuth on mobile** | Medium | `expo-auth-session` integration, token exchange with backend |
| **Drag-and-drop calendar** | Medium | React DnD or similar library, task date update on drop |
| **Real-time updates** | High | WebSocket or Server-Sent Events for live task list sync between household members |
| **File attachments** | Medium | Cloud storage (S3/Cloudflare R2), upload API routes, new DB column |
| **Onboarding wizard** | Low | Step-by-step first-time setup flow, `hasCompletedOnboarding` user flag |
| **Custom categories** | Low | UI for creating/editing categories, new DB table or JSONB column on users |
| **Dark mode** | Low | Tailwind dark variant classes, theme toggle in settings |
| **Export/import data** | Low | API route to generate CSV/JSON, import parsing logic |
| **Activity feed** | Medium | Event logging table, feed UI showing recent household activity |
| **Sentry error tracking** | Low | Install `@sentry/nextjs`, configure in `next.config.js` |

### Important Considerations for New Features

- **Always add auth checks.** Every API route must call `getAuthUser()` and return 401 if null.
- **Always filter by user ID.** Database queries must include `where(eq(tasks.userId, user.id))` to prevent users from seeing each other's data.
- **Validate inputs with Zod.** Define a schema for every API input and validate before processing.
- **Use React Query for data fetching.** Don't use raw `fetch` in components — wrap it in a React Query hook so caching, loading states, and error handling work automatically.
- **Don't import between features.** Features should be independent. If two features need the same thing, put it in `components/`, `hooks/`, `lib/`, or `packages/shared/`.
- **Keep the mobile app in sync.** If you add or change an API endpoint, make sure the mobile app's API client handles it too (if applicable).

---

## Common Tasks

### "I need to change the database schema"

1. Edit `apps/web/src/db/schema.ts`
2. Run `pnpm --filter web db:push` (development) or `pnpm --filter web db:generate` + `pnpm --filter web db:migrate` (production)

### "I need to add a new page"

Create a file at `apps/web/src/app/(app)/your-page/page.tsx`. It will automatically be available at `/your-page`. The `(app)` wrapper ensures the user must be logged in.

### "I need to change the look and feel"

- **Colors/fonts:** Edit `apps/web/src/app/globals.css` for CSS variables and `packages/ui/` for component styles
- **Design tokens:** Primary color is `#b08068` (terracotta), background is `#faf7f4` (warm cream)
- **Typography:** Custom utility classes (`heading-xl`, `body`, `label`, etc.) are defined in `globals.css`

### "I need to update dependencies"

```bash
# Update a specific package
pnpm --filter web add package-name@latest

# Update all packages (be careful — test after)
pnpm update --recursive
```

### "How do I check if everything is working?"

```bash
# Run all checks (same as CI)
pnpm lint && pnpm check-types && pnpm test
```

---

## Troubleshooting

### "pnpm install fails"

Make sure you're using pnpm 9 and Node.js 22:
```bash
node --version   # Should be v22.x.x
pnpm --version   # Should be 9.x.x
```

### "Database connection fails"

- Check that `DATABASE_URL` in `apps/web/.env` is correct
- Make sure the Neon database is active (free tier databases pause after inactivity — wake them by visiting the Neon dashboard)
- The connection string must include `?sslmode=require`

### "Auth isn't working"

- Make sure `AUTH_SECRET` is set in `.env`
- For Google OAuth: check that the redirect URI matches exactly (`http://localhost:3000/api/auth/callback/google` for local dev)

### "Mobile app can't connect to local server"

- Make sure your phone and computer are on the same WiFi
- Use your computer's local IP address (not `localhost`) in `apps/mobile/app.json`
- The web dev server must be running (`pnpm --filter web dev`)

### "Tests are failing"

- Run `pnpm install` to make sure dependencies are up to date
- For E2E tests: run `pnpm --filter web exec playwright install` to install browser binaries
- E2E tests need `DATABASE_URL` and `AUTH_SECRET` in the environment

---

## Further Reading

- `docs/CODING_GUIDELINES.md` — Detailed architecture patterns, naming conventions, and code standards
- `docs/MIGRATION_PLAN.md` — The original 5-phase plan that guided the rebuild from the legacy app
- `docs/AUDIT_FINDINGS.md` — Security issues found in the legacy app and how this rebuild addresses them
- [Next.js Docs](https://nextjs.org/docs) — Framework documentation
- [Drizzle ORM Docs](https://orm.drizzle.team/) — Database ORM documentation
- [Expo Docs](https://docs.expo.dev/) — Mobile app framework documentation
- [React Query Docs](https://tanstack.com/query/latest) — Data fetching library documentation
- [Tailwind CSS Docs](https://tailwindcss.com/docs) — CSS framework documentation
- [NextAuth.js Docs](https://authjs.dev/) — Authentication library documentation
