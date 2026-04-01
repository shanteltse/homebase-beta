"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="title text-foreground">Welcome back</h2>
        <p className="body text-muted-foreground">
          Log in to your account to continue.
        </p>
      </div>

      {resetSuccess && (
        <p className="body text-center text-green-700 bg-green-50 rounded-lg px-3 py-2">
          Password updated! Log in with your new password.
        </p>
      )}

      <LoginForm />

      <p className="body text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
