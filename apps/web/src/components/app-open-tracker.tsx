"use client";

import { useEffect } from "react";

const APP_OPEN_COUNT_KEY = "appOpenCount";

export function AppOpenTracker() {
  useEffect(() => {
    const current = Number(localStorage.getItem(APP_OPEN_COUNT_KEY) ?? 0);
    localStorage.setItem(APP_OPEN_COUNT_KEY, String(current + 1));
  }, []);

  return null;
}
