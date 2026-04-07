"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { useRegister } from "../api/register";
import { useGoogleLogin } from "../api/login";

const registerSchema = z
  .object({
    displayName: z.string().min(1, "Name is required"),
    email: z.email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  inviteToken?: string;
}

export function RegisterForm({ inviteToken }: RegisterFormProps) {
  const router = useRouter();
  const registerMutation = useRegister();
  const googleLogin = useGoogleLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  function onSubmit(data: RegisterFormValues) {
    registerMutation.mutate(data, {
      onSuccess: () => {
        if (inviteToken) {
          router.push(`/invite/${inviteToken}`);
        } else {
          router.push("/dashboard");
        }
      },
    });
  }

  const error = registerMutation.error || googleLogin.error;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        id="displayName"
        label="Name"
        placeholder="Your name"
        autoComplete="name"
        error={errors.displayName?.message}
        {...register("displayName")}
      />

      <Input
        id="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        id="password"
        label="Password"
        type="password"
        placeholder="At least 6 characters"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Input
        id="confirmPassword"
        label="Confirm password"
        type="password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {error && (
        <p className="body text-destructive">{error.message}</p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? "Creating account..." : "Create account"}
      </Button>

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="caption text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => googleLogin.mutate()}
        disabled={googleLogin.isPending}
      >
        {googleLogin.isPending ? "Connecting..." : "Continue with Google"}
      </Button>
    </form>
  );
}
