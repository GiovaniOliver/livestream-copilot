"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { resetPassword } from '@/lib/api/auth';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met?: boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number', test: (p) => /\d/.test(p) },
  { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordRequirements, setPasswordRequirements] = useState(PASSWORD_REQUIREMENTS);
  const [success, setSuccess] = useState(false);

  // Check if token exists
  useEffect(() => {
    if (!token) {
      setErrors({ token: 'Invalid or missing reset token' });
    }
  }, [token]);

  // Update password requirements as user types
  useEffect(() => {
    if (formData.password) {
      setPasswordRequirements(
        PASSWORD_REQUIREMENTS.map(req => ({
          ...req,
          met: req.test(formData.password),
        }))
      );
    }
  }, [formData.password]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!token) {
      newErrors.token = 'Invalid or missing reset token';
      setErrors(newErrors);
      return false;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const unmetRequirements = passwordRequirements.filter(req => !req.met);
      if (unmetRequirements.length > 0) {
        newErrors.password = 'Password does not meet all requirements';
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !token) {
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({
        token,
        password: formData.password,
      });
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/auth/login?reset=true');
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      setErrors({ submit: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Password reset successful"
        subtitle="Your password has been changed"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-neutral-300">
              Your password has been successfully reset.
            </p>
            <p className="text-xs text-neutral-500">
              Redirecting to login page...
            </p>
          </div>

          <div className="pt-4">
            <Link href="/auth/login">
              <Button fullWidth>
                Continue to login
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (errors.token) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This password reset link is invalid or has expired"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-neutral-300">
              The password reset link you used is invalid or has expired.
            </p>
            <p className="text-xs text-neutral-500">
              Reset links are valid for 1 hour.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Link href="/auth/forgot-password">
              <Button fullWidth>
                Request new reset link
              </Button>
            </Link>

            <Link href="/auth/login">
              <button className="w-full text-sm text-neutral-400 hover:text-neutral-300 transition-colors">
                Back to login
              </button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your new password below"
    >
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            placeholder="Create a strong password"
            autoComplete="new-password"
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

          {/* Password Requirements */}
          {formData.password && (
            <div className="mt-3 space-y-2">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  {req.met ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={req.met ? 'text-green-400' : 'text-neutral-500'}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Confirm new password"
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder="Confirm your password"
          autoComplete="new-password"
          required
          fullWidth
          disabled={isLoading}
          endIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="pointer-events-auto text-neutral-400 hover:text-neutral-300"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
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

        <Button
          type="submit"
          fullWidth
          disabled={isLoading}
          className="mt-6"
        >
          {isLoading ? 'Resetting password...' : 'Reset password'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="text-sm text-neutral-400 hover:text-neutral-300 transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
