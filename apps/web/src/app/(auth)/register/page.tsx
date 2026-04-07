"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="title text-foreground">Create account</h2>
        <p className="body text-muted-foreground">
          {inviteToken
            ? "Create an account to accept your household invitation."
            : "Get started with your HomeBase."}
        </p>
      </div>

      <RegisterForm inviteToken={inviteToken} />

      <p className="body text-center text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={inviteToken ? `/login?invite=${inviteToken}` : "/login"}
          className="text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
