"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { useLogin, useGoogleLogin, buildGoogleAuthUrl } from "../api/login";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  inviteToken?: string;
}

function isNative(): boolean {
  return typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.();
}

export function LoginForm({ inviteToken }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const login = useLogin();
  const googleLogin = useGoogleLogin();

  async function handleNativeGoogleLogin() {
    if (!isNative()) {
      googleLogin.mutate();
      return;
    }

    alert("Registering appUrlOpen listener now");
    const { App } = await import("@capacitor/app");
    const { Browser } = await import("@capacitor/browser");

    // Register listener BEFORE opening the browser to guarantee ordering
    const handle = await App.addListener("appUrlOpen", async (event: { url: string }) => {
      alert("appUrlOpen callback fired: " + event.url.slice(0, 50));
      if (!event.url.startsWith("com.homebase.app://auth/callback")) return;

      const qs = event.url.includes("?") ? event.url.split("?")[1]! : "";
      const params = new URLSearchParams(qs);
      const token = params.get("token");
      alert("raw token last 30: " + (token ?? "NULL").slice(-30) + " length: " + (token?.length ?? 0));

      if (token) {
        await handle.remove();
        const { setMobileToken, getMobileToken } = await import("@/lib/mobile-auth-storage");
        await setMobileToken(token);
        await getMobileToken(); // warm in-memory cache before navigation triggers fetches
        await Browser.close();
        await queryClient.invalidateQueries({ queryKey: ["mobile-user"] });
        router.push(inviteToken ? `/invite/${inviteToken}` : "/dashboard");
      }
    });

    await Browser.open({ url: buildGoogleAuthUrl() });
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(data: LoginFormValues) {
    login.mutate(data, {
      onSuccess: () => {
        router.push(inviteToken ? `/invite/${inviteToken}` : "/dashboard");
      },
    });
  }

  const error = login.error || googleLogin.error;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        id="email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="flex flex-col gap-1">
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>

      {error && (
        <p className="body text-destructive">
          Invalid email or password. Please try again.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={login.isPending}
      >
        {login.isPending ? "Logging in..." : "Log in"}
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
        onClick={() => void handleNativeGoogleLogin()}
        disabled={googleLogin.isPending}
      >
        {googleLogin.isPending ? "Connecting..." : "Continue with Google"}
      </Button>
    </form>
  );
}
