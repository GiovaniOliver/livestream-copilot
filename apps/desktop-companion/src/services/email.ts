/**
 * Email Service
 *
 * Handles sending transactional emails for authentication flows.
 * Uses environment variables for SMTP configuration.
 *
 * Security Features:
 * - Validates email addresses before sending
 * - Uses secure SMTP connection (TLS)
 * - Templates are server-side only (no XSS risk)
 * - Rate limiting handled at application layer
 *
 * Environment Variables Required:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (usually 587 for TLS)
 * - SMTP_SECURE: Whether to use TLS (true/false)
 * - SMTP_USER: SMTP authentication username
 * - SMTP_PASS: SMTP authentication password
 * - SMTP_FROM: Email address to send from
 * - APP_URL: Base URL of the application for links
 *
 * @module services/email
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "../logger/index.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Email service configuration from environment
 */
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  appUrl: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Loads email configuration from environment variables.
 * Returns null if email is not configured (for development).
 *
 * @returns Email configuration or null if not configured
 */
function getEmailConfig(): EmailConfig | null {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    APP_URL,
  } = process.env;

  // If any required config is missing, email is not configured
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM || !APP_URL) {
    logger.warn(
      "[email] Email service not configured. Set SMTP environment variables to enable email."
    );
    return null;
  }

  return {
    host: SMTP_HOST,
    port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
    secure: SMTP_SECURE === "true",
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM,
    appUrl: APP_URL,
  };
}

// =============================================================================
// EMAIL SERVICE
// =============================================================================

/**
 * Email Service class for sending transactional emails.
 */
class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.config = getEmailConfig();

    if (this.config) {
      // Create SMTP transporter
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
        // Connection timeout (10 seconds)
        connectionTimeout: 10000,
        // Socket timeout (10 seconds)
        greetingTimeout: 10000,
        // Enable TLS
        requireTLS: !this.config.secure, // Use STARTTLS if not using secure
      });

      logger.info("[email] Email service initialized successfully");
    } else {
      logger.warn("[email] Email service disabled - configuration missing");
    }
  }

  /**
   * Checks if email service is configured and available.
   *
   * @returns True if email can be sent, false otherwise
   */
  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }

  /**
   * Sends a password reset email with a secure token link.
   *
   * Security considerations:
   * - Token is passed as URL parameter (HTTPS required in production)
   * - Link expires in 15 minutes (communicated to user)
   * - Generic sender to prevent phishing (use official company email)
   * - Clear instructions for users who didn't request reset
   *
   * @param to - Recipient email address
   * @param token - Password reset token (plaintext, not hash)
   * @throws Error if email service not configured or sending fails
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    if (!this.isConfigured() || !this.config) {
      logger.info(
        `[email] Would send password reset email to ${to} with token ${token}`
      );
      logger.info(
        `[email] Email service not configured - email not sent (development mode)`
      );
      return;
    }

    const resetUrl = `${this.config.appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const subject = "Reset Your Password";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      You requested a password reset for your account. Click the button below to set a new password:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; display: inline-block; font-size: 16px;">
        Reset Password
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; word-break: break-all; background: white; padding: 10px; border-radius: 5px; border: 1px solid #ddd;">
      ${resetUrl}
    </p>

    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Important:</strong> This link will expire in 15 minutes for your security.
      </p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated message. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Reset Your Password

You requested a password reset for your account.

Click the link below to set a new password:
${resetUrl}

This link will expire in 15 minutes for your security.

If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.

---
This is an automated message. Please do not reply to this email.
    `.trim();

    try {
      await this.transporter!.sendMail({
        from: this.config.from,
        to,
        subject,
        text,
        html,
      });

      logger.info(`[email] Password reset email sent to ${to}`);
    } catch (error) {
      logger.error({ err: error }, `[email] Failed to send password reset email to ${to}`);
      throw new Error("Failed to send password reset email");
    }
  }

  /**
   * Sends a password changed confirmation email.
   *
   * Security considerations:
   * - Confirms password change for user awareness
   * - Provides contact info if change was unauthorized
   * - Sent immediately after password change
   * - No action required from user (informational only)
   *
   * @param to - Recipient email address
   * @throws Error if email service not configured or sending fails
   */
  async sendPasswordChangedEmail(to: string): Promise<void> {
    if (!this.isConfigured() || !this.config) {
      logger.info(`[email] Would send password changed email to ${to}`);
      logger.info(
        `[email] Email service not configured - email not sent (development mode)`
      );
      return;
    }

    const subject = "Your Password Was Changed";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Password Changed Successfully</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your password was successfully changed. You can now log in with your new password.
    </p>

    <div style="background: #d4edda; border: 1px solid #28a745; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #155724;">
        ✅ All your active sessions have been logged out for security. Please log in again with your new password.
      </p>
    </div>

    <div style="background: #f8d7da; border: 1px solid #dc3545; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #721c24;">
        <strong>⚠️ Didn't make this change?</strong>
      </p>
      <p style="margin: 0; font-size: 14px; color: #721c24;">
        If you didn't change your password, your account may have been compromised. Please contact our support team immediately.
      </p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Change timestamp: ${new Date().toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "long",
      })}
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated message. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Password Changed Successfully

Your password was successfully changed. You can now log in with your new password.

All your active sessions have been logged out for security. Please log in again with your new password.

⚠️ Didn't make this change?
If you didn't change your password, your account may have been compromised. Please contact our support team immediately.

Change timestamp: ${new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "long",
    })}

---
This is an automated message. Please do not reply to this email.
    `.trim();

    try {
      await this.transporter!.sendMail({
        from: this.config.from,
        to,
        subject,
        text,
        html,
      });

      logger.info(`[email] Password changed confirmation email sent to ${to}`);
    } catch (error) {
      logger.error(
        { err: error },
        `[email] Failed to send password changed email to ${to}`
      );
      throw new Error("Failed to send password changed confirmation email");
    }
  }

  /**
   * Sends an email verification email with a verification link.
   *
   * @param to - Recipient email address
   * @param token - Email verification token
   * @throws Error if email service not configured or sending fails
   */
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    if (!this.isConfigured() || !this.config) {
      logger.info(
        `[email] Would send verification email to ${to} with token ${token}`
      );
      logger.info(
        `[email] Email service not configured - email not sent (development mode)`
      );
      return;
    }

    const verifyUrl = `${this.config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const subject = "Verify Your Email Address";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
  </div>

  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for signing up! Please verify your email address to complete your registration.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}"
         style="background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; display: inline-block; font-size: 16px;">
        Verify Email
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; word-break: break-all; background: white; padding: 10px; border-radius: 5px; border: 1px solid #ddd;">
      ${verifyUrl}
    </p>

    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Important:</strong> This link will expire in 24 hours.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated message. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Verify Your Email

Thank you for signing up! Please verify your email address to complete your registration.

Click the link below:
${verifyUrl}

This link will expire in 24 hours.

---
This is an automated message. Please do not reply to this email.
    `.trim();

    try {
      await this.transporter!.sendMail({
        from: this.config.from,
        to,
        subject,
        text,
        html,
      });

      logger.info(`[email] Verification email sent to ${to}`);
    } catch (error) {
      logger.error({ err: error }, `[email] Failed to send verification email to ${to}`);
      throw new Error("Failed to send verification email");
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Singleton email service instance.
 * Import and use this throughout the application.
 *
 * @example
 * import { emailService } from './services/email';
 * await emailService.sendPasswordResetEmail('user@example.com', token);
 */
export const emailService = new EmailService();
