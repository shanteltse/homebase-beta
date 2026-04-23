const KEY = "mobile_auth_token";

// Use window.Capacitor directly — Capacitor.isNativePlatform() is unreliable
// in a Vercel-hosted bundle loaded inside a Capacitor WebView.
function isNative(): boolean {
  return typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.();
}

// In-memory cache so Preferences is only read from disk once per session.
// Set to undefined (uninitialized), null (no token), or the token string.
let cache: string | null | undefined = undefined;

export async function getMobileToken(): Promise<string | null> {
  if (!isNative()) return null;
  if (cache !== undefined) return cache;
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key: KEY });
  cache = value;
  return cache;
}

export async function setMobileToken(token: string): Promise<void> {
  if (!isNative()) return;
  cache = token;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: KEY, value: token });
}

export async function clearMobileToken(): Promise<void> {
  if (!isNative()) return;
  cache = null;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.remove({ key: KEY });
}
