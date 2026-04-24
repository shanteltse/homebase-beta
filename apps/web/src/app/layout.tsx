import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import { PwaInit } from "@/components/pwa-init";
import "./globals.css";

const inter = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "HomeBase",
  description: "Your personal command center for home and family life.",
  manifest: "/manifest.json",
  themeColor: "#b08068",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HomeBase",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#b08068" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HomeBase" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans`}>
        <PwaInit />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
