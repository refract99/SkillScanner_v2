import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
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
    default: "SkillScanner — AI Agent Security Scanner",
    template: "%s — SkillScanner",
  },
  description:
    "Know what a skill does before you install it. Comprehensive security scanning for AI agent skills and MCP servers. Free. Under 60 seconds.",
  keywords: [
    "AI agent security",
    "MCP server scanner",
    "skill security",
    "prompt injection",
    "supply chain attack",
    "Claude Code skills",
  ],
  openGraph: {
    title: "SkillScanner — AI Agent Security Scanner",
    description:
      "Know what a skill does before you install it. Comprehensive security scanning for AI agent skills and MCP servers. Free. Under 60 seconds.",
    type: "website",
    siteName: "SkillScanner",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkillScanner — AI Agent Security Scanner",
    description:
      "Know what a skill does before you install it. Comprehensive security scanning for AI agent skills and MCP servers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "SkillScanner",
    description:
      "Comprehensive security scanning for AI agent skills and MCP servers. Free. Under 60 seconds.",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      >
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground">
          {/* Skip to main content — keyboard / screen reader accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
          >
            Skip to main content
          </a>
          <ConvexClientProvider>
            <SiteHeader />
            <div id="main-content" className="flex flex-col flex-1">
              {children}
            </div>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
