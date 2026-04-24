import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signIn } from "next-auth/react";

type LoginInput = {
  email: string;
  password: string;
};

function isNative(): boolean {
  return typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.();
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      if (isNative()) {
        const res = await fetch("/api/auth/mobile/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json() as { token?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Invalid email or password");
        const { token } = json as { token: string };
        const { setMobileToken } = await import("@/lib/mobile-auth-storage");
        await setMobileToken(token);
        return { ok: true };
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      if (isNative()) {
        void queryClient.invalidateQueries({ queryKey: ["mobile-user"] });
      }
    },
  });
}

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const MOBILE_REDIRECT_URI = "https://homebase-beta-web.vercel.app/api/auth/mobile/google/callback";

export function buildGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: MOBILE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export function useGoogleLogin() {
  return useMutation({
    mutationFn: async () => {
      await signIn("google", { redirectTo: "/dashboard" });
    },
  });
}
