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

export function LoginForm({ inviteToken }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const login = useLogin();
  const googleLogin = useGoogleLogin();

  async function handleNativeGoogleLogin() {
    const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.();
    alert("handleNativeGoogleLogin — isNative: " + isNative);

    if (!isNative) {
      googleLogin.mutate();
      return;
    }

    const { App } = await import("@capacitor/app");
    const { Browser } = await import("@capacitor/browser");

    // Register listener BEFORE opening the browser to avoid any race condition
    alert("Registering appUrlOpen listener...");
    const handle = await App.addListener("appUrlOpen", async (event: { url: string }) => {
      alert("appUrlOpen fired: " + event.url.slice(0, 80));
      if (!event.url.startsWith("com.homebase.app://auth/callback")) return;

      const qs = event.url.includes("?") ? event.url.split("?")[1]! : "";
      const params = new URLSearchParams(qs);
      const token = params.get("token");
      alert("token present: " + !!token + (token ? " prefix: " + token.slice(0, 20) : ""));

      if (token) {
        await handle.remove();
        const { setMobileToken } = await import("@/lib/mobile-auth-storage");
        await setMobileToken(token);
        alert("Token stored. Closing browser...");
        await Browser.close();
        await queryClient.invalidateQueries({ queryKey: ["mobile-user"] });
        router.push(inviteToken ? `/invite/${inviteToken}` : "/dashboard");
      }
    });

    const googleAuthUrl = buildGoogleAuthUrl();
    alert("Opening browser: " + googleAuthUrl.slice(0, 80));
    await Browser.open({ url: googleAuthUrl });
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
        if (inviteToken) {
          router.push(`/invite/${inviteToken}`);
        } else {
          router.push("/dashboard");
        }
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
