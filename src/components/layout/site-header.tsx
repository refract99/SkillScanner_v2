"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { UserButton, SignOutButton } from "@clerk/nextjs";
import { Shield, LogOut } from "lucide-react";

export function SiteHeader() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold text-foreground hover:opacity-80 transition-opacity"
        >
          <Shield className="size-4 text-primary" aria-hidden="true" />
          SkillScanner
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-3">
          <Link
            href="/scan"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Scan
          </Link>

          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <UserButton />
              <SignOutButton redirectUrl="/">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </SignOutButton>
            </>
          ) : isLoaded ? (
            <>
              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
