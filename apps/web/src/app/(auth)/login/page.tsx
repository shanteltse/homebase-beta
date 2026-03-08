import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="title text-foreground">Welcome back</h2>
        <p className="body text-muted-foreground">
          Log in to your account to continue.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-8 text-center body text-muted-foreground">
        Login form coming soon
      </div>

      <p className="body text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
