"use client";

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * ProtectedRoute Component
 *
 * Wraps content that requires authentication.
 * Redirects unauthenticated users to login page.
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/auth/login',
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      // Store the intended destination
      const returnUrl = pathname !== redirectTo ? pathname : '/dashboard';
      const loginUrl = `${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`;
      router.push(loginUrl);
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, pathname, router]);

  // Show loading state
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto">
            <svg
              className="animate-spin h-16 w-16 text-primary-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-sm text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if authentication required but user not authenticated
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

/**
 * withAuth HOC
 *
 * Higher-order component to wrap page components with authentication.
 * Usage: export default withAuth(YourPage);
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
