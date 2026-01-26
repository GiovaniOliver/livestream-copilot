import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackLink?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showBackLink = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-hero">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            FluxBoard
          </Link>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-100 mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-neutral-400">
                {subtitle}
              </p>
            )}
          </div>

          {/* Content */}
          <div>
            {children}
          </div>
        </div>

        {/* Back Link */}
        {showBackLink && (
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
