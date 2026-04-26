export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // In development, allow all origins
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const allowedHost = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).host
    : null;

  if (origin) {
    try {
      // Allow Capacitor (iOS/Android) native WebView origins
      if (origin.startsWith("capacitor://") || origin.startsWith("ionic://")) return true;
      const originHost = new URL(origin).host;
      if (allowedHost && originHost === allowedHost) return true;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (allowedHost && refererHost === allowedHost) return true;
    } catch {
      return false;
    }
  }

  // If no Origin or Referer header is present, this is likely a same-origin
  // request from a browser (GET requests don't always send Origin) or a
  // server-side call. Allow it since auth is still checked separately.
  if (!origin && !referer) {
    return true;
  }

  return false;
}
