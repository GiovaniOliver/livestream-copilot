"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { logger } from "@/lib/logger";
import { API_CONFIG } from '@/lib/config';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Get tokens from URL params (set by backend redirect)
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const isNewUser = searchParams.get('isNewUser') === 'true';
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        return;
      }

      if (!accessToken || !refreshToken) {
        setError('Missing authentication tokens');
        return;
      }

      try {
        // Store tokens in localStorage
        localStorage.setItem('fluxboard_access_token', accessToken);
        localStorage.setItem('fluxboard_refresh_token', refreshToken);
        localStorage.setItem('fluxboard_remember_me', 'true');

        // Calculate token expiry (default to 15 minutes)
        const expiryTime = Date.now() + 15 * 60 * 1000;
        localStorage.setItem('fluxboard_token_expiry', expiryTime.toString());

        // Fetch and store user data
        const response = await fetch(`${API_CONFIG.baseUrl}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.user) {
            localStorage.setItem('fluxboard_user', JSON.stringify(data.data.user));
          }
        }

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (err) {
        logger.error('OAuth callback error:', err);
        setError('Failed to complete authentication');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <AuthLayout
        title="Authentication failed"
        subtitle="There was a problem signing you in"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-neutral-300">
              {error}
            </p>
          </div>

          <div className="pt-4">
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              Back to login
            </a>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Completing sign in"
      subtitle="Please wait while we finish setting up your account"
    >
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto">
          <svg className="animate-spin h-16 w-16 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <p className="text-sm text-neutral-400">
          Authenticating...
        </p>
      </div>
    </AuthLayout>
  );
}
