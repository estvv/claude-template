import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "./service-worker-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unlocked",
  description: "Application de suivi d'achievements gamifiés entre potes.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Unlocked",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  other: {
    // Legacy tag for iOS < 17.4 — Next's `appleWebApp.capable` only
    // emits the modern `mobile-web-app-capable` tag.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
