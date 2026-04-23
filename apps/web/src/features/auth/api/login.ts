import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import { Capacitor } from "@capacitor/core";

type LoginInput = {
  email: string;
  password: string;
};

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      if (Capacitor.isNativePlatform()) {
        const res = await fetch("/api/auth/mobile/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) throw new Error("Invalid email or password");
        const { token } = await res.json() as { token: string };
        const { setMobileToken } = await import("@/lib/mobile-auth-storage");
        await setMobileToken(token);
        return { ok: true };
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      if (Capacitor.isNativePlatform()) {
        void queryClient.invalidateQueries({ queryKey: ["mobile-user"] });
      }
    },
  });
}

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const MOBILE_REDIRECT_URI = "https://homebase-beta-web.vercel.app/api/auth/mobile/google/callback";

export function useGoogleLogin() {
  return useMutation({
    mutationFn: async () => {
      const isNative = typeof window !== "undefined" &&
        (window.navigator.userAgent.includes("Capacitor") ||
          !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
      console.log("[mobile-auth] isNative:", isNative, "clientId:", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "SET" : "MISSING", "ua:", typeof window !== "undefined" ? window.navigator.userAgent : "SSR");
      if (isNative) {
        alert("Opening browser with clientId: " + (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "SET" : "MISSING"));
        const { Browser } = await import("@capacitor/browser");
        const params = new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          redirect_uri: MOBILE_REDIRECT_URI,
          response_type: "code",
          scope: "openid email profile",
          access_type: "offline",
          prompt: "select_account",
        });
        const googleAuthUrl = `${GOOGLE_AUTH_BASE}?${params.toString()}`;
        alert("URL: " + googleAuthUrl.slice(0, 100));
        try {
          alert("Calling Browser.open now");
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: googleAuthUrl });
          alert("Browser.open completed");
        } catch (err) {
          alert("Browser.open error: " + String(err));
        }
        return;
      }

      await signIn("google", { redirectTo: "/dashboard" });
    },
  });
}
