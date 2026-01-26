"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error: authError, clearError, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Handle registration success message
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Registration successful! Please log in to continue.');
    }

    if (searchParams.get('reset') === 'true') {
      setSuccessMessage('Password reset successful! Please log in with your new password.');
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData, rememberMe);
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Login error:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {authError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{authError}</p>
        </div>
      )}

      {/* OAuth Buttons */}
      <OAuthButtons action="login" />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-neutral-900 px-2 text-neutral-500">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="you@example.com"
          autoComplete="email"
          required
          fullWidth
          disabled={isLoading}
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            fullWidth
            disabled={isLoading}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pointer-events-auto text-neutral-400 hover:text-neutral-300"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-primary-500 bg-neutral-800 border-neutral-700 rounded focus:ring-primary-500 focus:ring-2"
              disabled={isLoading}
            />
            <span className="ml-2 text-sm text-neutral-300">Remember me</span>
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          disabled={isLoading}
          className="mt-6"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {/* Sign Up Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400">
          Don't have an account?{' '}
          <Link
            href="/auth/register"
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
