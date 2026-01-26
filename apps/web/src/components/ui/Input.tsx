import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      startIcon,
      endIcon,
      className,
      disabled,
      type = 'text',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = Boolean(error);

    return (
      <div className={clsx('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-200"
          >
            {label}
            {props.required && <span className="ml-1 text-red-400">*</span>}
          </label>
        )}

        <div className="relative">
          {startIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {startIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={clsx(
              'w-full rounded-lg border bg-neutral-900/50 px-3.5 py-2.5 text-sm text-neutral-100',
              'placeholder:text-neutral-500',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2',
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              hasError
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                : 'border-neutral-800 focus:border-primary-500 focus:ring-primary-500/20',
              disabled && 'cursor-not-allowed opacity-60',
              className
            )}
            {...props}
          />

          {endIcon && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {endIcon}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            className={clsx(
              'text-xs',
              hasError ? 'text-red-400' : 'text-neutral-500'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
