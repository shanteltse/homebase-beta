import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="title text-foreground">Create account</h2>
        <p className="body text-muted-foreground">
          Get started with your HomeBase.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-8 text-center body text-muted-foreground">
        Registration form coming soon
      </div>

      <p className="body text-center text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
