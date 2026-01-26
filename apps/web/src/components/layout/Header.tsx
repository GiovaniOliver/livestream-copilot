"use client";

import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#workflows", label: "Workflows" },
  { href: "#observability", label: "Observability" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-stroke/50 bg-bg-0/80 backdrop-blur-xl">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/assets/logo-wordmark.png"
                alt="FluxBoard"
                width={140}
                height={34}
                className="h-8 w-auto"
                priority
              />
            </Link>
            <span className="badge hidden sm:inline-flex">
              Hackathon build
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="link rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="ml-2 rounded-lg bg-gradient-to-r from-teal to-purple px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 hover:shadow-glow"
            >
              Launch Dashboard
            </Link>
          </nav>

          {/* Mobile menu button - simplified for now */}
          <button
            type="button"
            className="btn-ghost p-2 md:hidden"
            aria-label="Toggle menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
