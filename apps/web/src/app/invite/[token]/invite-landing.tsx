"use client";

import Link from "next/link";
import { buttonVariants } from "@repo/ui/button";
import { cn } from "@repo/ui/cn";

interface InviteLandingProps {
  householdName: string;
  token: string;
}

export function InviteLanding({ householdName, token }: InviteLandingProps) {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="flex flex-col gap-2">
        <h2 className="title text-foreground">You&apos;re invited!</h2>
        <p className="body text-muted-foreground">
          You&apos;ve been invited to join{" "}
          <strong className="text-foreground">{householdName}</strong> on HomeBase.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href={`/register?invite=${token}`}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Create an account
        </Link>
        <Link
          href={`/login?invite=${token}`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          Log in to accept
        </Link>
      </div>

      <p className="caption text-muted-foreground">
        This invitation expires in 7 days.
      </p>
    </div>
  );
}
