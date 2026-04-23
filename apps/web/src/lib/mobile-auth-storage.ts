import { Capacitor } from "@capacitor/core";

const KEY = "mobile_auth_token";

// In-memory cache so Preferences is only read from disk once per session.
// Set to undefined (uninitialized), null (no token), or the token string.
let cache: string | null | undefined = undefined;

export async function getMobileToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  if (cache !== undefined) return cache;
  const { Preferences } = await import("@capacitor/preferences");
  const { value } = await Preferences.get({ key: KEY });
  cache = value;
  return cache;
}

export async function setMobileToken(token: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  cache = token;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: KEY, value: token });
}

export async function clearMobileToken(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  cache = null;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.remove({ key: KEY });
}
