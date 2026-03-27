import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Grove - Financial OS for Ambitious Businesses",
    template: "%s | Grove",
  },
  description:
    "Grove brings together your accounting, sales, and operations data into one intelligent platform. AI-powered insights, real-time dashboards, and management accounts that write themselves.",
  keywords: [
    "financial operating system",
    "management accounts",
    "AI finance",
    "Xero integration",
    "Shopify analytics",
    "CFO dashboard",
    "KPI tracking",
    "scenario modelling",
    "investor portal",
    "financial intelligence",
  ],
  authors: [{ name: "Grove" }],
  creator: "Grove",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"),
  openGraph: {
    title: "Grove - Financial OS for Ambitious Businesses",
    description:
      "AI-powered financial intelligence. Connect Xero, Shopify, and more. Get management accounts, KPIs, and investor-ready reports in minutes.",
    type: "website",
    locale: "en_GB",
    siteName: "Grove",
  },
  twitter: {
    card: "summary_large_image",
    title: "Grove - Financial OS for Ambitious Businesses",
    description:
      "AI-powered financial intelligence for ambitious businesses.",
    creator: "@usegrove",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#059669" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
