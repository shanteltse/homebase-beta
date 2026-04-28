"use client";

import { useEffect } from "react";
import { useUser } from "@/features/auth/api/get-user";

function isNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
}

export function PushNotificationRegistrar() {
  console.log("[push] registrar mounted");
  const { data: user } = useUser();

  useEffect(() => {
    console.log("[push] effect fired — user:", !!user, "isNative:", isNative());
    if (!user || !isNative()) return;

    async function registerPush() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === "prompt") {
          const result = await PushNotifications.requestPermissions();
          if (result.receive !== "granted") return;
        } else if (permStatus.receive !== "granted") {
          return;
        }

        // Listeners must be added before register() so the token isn't missed
        // if APNs responds before the listener is attached.
        PushNotifications.addListener("registration", async (token) => {
          console.log("[push] Got APNs token, registering with server...");
          try {
            const res = await fetch("/api/push/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: token.value, platform: "ios" }),
            });
            const data = await res.json();
            if (!res.ok) {
              console.error("[push] Server rejected token registration", res.status, data);
            } else {
              console.log("[push] Token registered successfully", data);
            }
          } catch (err) {
            console.error("[push] Failed to register token", err);
          }
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[push] Registration error", err);
        });

        await PushNotifications.register();
      } catch (err) {
        console.error("[push] Push setup error", err);
      }
    }

    void registerPush();
  }, [user]);

  return null;
}
