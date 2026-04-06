import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — HomeBase",
  description: "How HomeBase collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  const lastUpdated = "April 6, 2026";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to HomeBase
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_li]:text-muted-foreground [&_li]:leading-relaxed">

          <p>
            HomeBase (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is a household task
            management app. This policy explains what information we collect when you use HomeBase,
            how we use it, and the choices you have.
          </p>

          <h2>Information we collect</h2>
          <p>
            We collect information you provide directly and information generated as you use the app:
          </p>
          <ul>
            <li>
              <strong>Account information</strong> — your name and email address when you register,
              or the equivalent from your Google account if you sign in with Google.
            </li>
            <li>
              <strong>Task and household data</strong> — tasks, subtasks, notes, due dates, tags, and
              any other content you enter into HomeBase, including household member names and email
              addresses you add during setup.
            </li>
            <li>
              <strong>Notification preferences</strong> — your choices about daily recap emails,
              morning summaries, and task reminders.
            </li>
            <li>
              <strong>Google Calendar tokens</strong> — if you connect Google Calendar, we store
              OAuth access and refresh tokens to sync tasks on your behalf. We do not store or read
              any calendar event content beyond what is required for syncing tasks you create in
              HomeBase.
            </li>
            <li>
              <strong>Usage signals</strong> — whether you use the app in standalone (PWA) mode,
              and aggregate feature usage, to help us improve the product.
            </li>
          </ul>
          <p>
            We do not collect payment information. HomeBase does not currently charge for access.
          </p>

          <h2>How we use your information</h2>
          <ul>
            <li>To create and maintain your account and household.</li>
            <li>To store and display your tasks and data across devices.</li>
            <li>
              To send notification emails (daily recap, morning summary, task reminders) based on
              your preferences. You can turn these off at any time in Settings.
            </li>
            <li>To sync tasks with Google Calendar when you enable that feature.</li>
            <li>
              To run AI-powered features — task parsing and list import — using the Anthropic API.
              The text you submit for these features is sent to Anthropic for processing and is
              subject to{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Anthropic&rsquo;s privacy policy
              </a>
              . We do not store the raw input beyond the duration of the request.
            </li>
            <li>To improve HomeBase based on aggregate, non-identifying usage patterns.</li>
          </ul>

          <h2>Third-party services</h2>
          <p>HomeBase uses the following third-party services, each with their own privacy practices:</p>
          <ul>
            <li>
              <strong>Vercel</strong> — hosting and infrastructure. Vercel Analytics collects
              anonymous page view data. No personal information is linked to analytics events.
            </li>
            <li>
              <strong>Neon</strong> — our database provider. Your data is stored in a Neon
              PostgreSQL database in the US.
            </li>
            <li>
              <strong>Google</strong> — sign-in and optional Calendar integration. Google&rsquo;s
              use of data from the Calendar integration is governed by{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google&rsquo;s Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong>Anthropic</strong> — AI task parsing. Only the text you explicitly submit
              for parsing is sent. See their{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                privacy policy
              </a>
              .
            </li>
          </ul>

          <h2>Data retention</h2>
          <p>
            We retain your account and task data for as long as your account is active. If you
            delete your account, your data is permanently deleted from our database within 30 days.
            Backups may retain data for up to an additional 30 days after deletion.
          </p>

          <h2>Your rights and choices</h2>
          <ul>
            <li>
              <strong>Access and export</strong> — you can view all your tasks in the app at any
              time.
            </li>
            <li>
              <strong>Correction</strong> — you can update your name and notification preferences
              in Settings.
            </li>
            <li>
              <strong>Deletion</strong> — you can delete individual tasks at any time. To delete
              your account and all associated data, contact us at the address below.
            </li>
            <li>
              <strong>Google Calendar disconnect</strong> — you can disconnect Google Calendar in
              Settings at any time, which revokes our access to your Google account.
            </li>
            <li>
              <strong>Notification opt-out</strong> — you can disable all notification emails in
              Settings.
            </li>
          </ul>

          <h2>Children&rsquo;s privacy</h2>
          <p>
            HomeBase is not directed at children under 13. We do not knowingly collect personal
            information from children under 13. If you believe we have collected such information,
            please contact us and we will delete it promptly.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            We may update this policy from time to time. When we do, we&rsquo;ll update the
            &ldquo;last updated&rdquo; date at the top of this page. Continued use of HomeBase after
            changes are posted constitutes your acceptance of the updated policy.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about this policy or want to request deletion of your data, please
            reach out at{" "}
            <a
              href="mailto:privacy@homebase.app"
              className="text-primary hover:underline"
            >
              privacy@homebase.app
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
# privacy
