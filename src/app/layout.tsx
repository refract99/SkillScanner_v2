import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers";
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
  title: "SkillScanner — AI Agent Security Scanner",
  description:
    "Know what a skill does before you install it. Comprehensive security scanning for AI agent skills and MCP servers. Free. Under 60 seconds.",
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
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
