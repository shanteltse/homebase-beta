import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { signOut } from "next-auth/react";

function isNative(): boolean {
  return typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.();
}

export function useLogout(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (isNative()) {
        const { clearMobileToken } = await import("@/lib/mobile-auth-storage");
        await clearMobileToken();
        localStorage.clear();
        sessionStorage.clear();
        queryClient.clear();
        return;
      }
      await signOut({ redirect: false });
    },
  });
}
