"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/contexts/AuthContext';

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

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error: authError, clearError, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordRequirements, setPasswordRequirements] = useState(PASSWORD_REQUIREMENTS);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

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

    // Name validation (optional but validate if provided)
    if (formData.name && formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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

    // Terms agreement validation
    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms and privacy policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
      });
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Registration error:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const allRequirementsMet = passwordRequirements.every(req => req.met);

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your FluxBoard journey today"
    >
      {/* Error Message */}
      {authError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{authError}</p>
        </div>
      )}

      {/* OAuth Buttons */}
      <OAuthButtons action="register" />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-800"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-neutral-900 px-2 text-neutral-500">
            Or register with email
          </span>
        </div>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="John Doe"
          autoComplete="name"
          fullWidth
          disabled={isLoading}
          helperText="Optional"
        />

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
          label="Confirm password"
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

        {/* Terms Agreement */}
        <div>
          <label className="flex items-start cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                if (errors.terms) {
                  setErrors(prev => {
                    const { terms: _, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              className="w-4 h-4 mt-1 text-primary-500 bg-neutral-800 border-neutral-700 rounded focus:ring-primary-500 focus:ring-2"
              disabled={isLoading}
            />
            <span className="ml-2 text-sm text-neutral-300">
              I agree to the{' '}
              <Link href="/terms" className="text-primary-400 hover:text-primary-300 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary-400 hover:text-primary-300 underline">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="mt-1 text-xs text-red-400">{errors.terms}</p>
          )}
        </div>

        <Button
          type="submit"
          fullWidth
          disabled={isLoading}
          className="mt-6"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      {/* Sign In Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
