# Password Reset System Documentation

Complete implementation of secure password reset functionality for SOC-401.

## Overview

The password reset system provides a secure, production-ready implementation with defense-in-depth security measures.

## Security Features

### Token Security
- **15-minute expiration window** - Minimizes exposure if token is intercepted
- **Cryptographically secure token generation** - Uses `crypto.randomBytes(32)` for 256 bits of entropy
- **Hashed token storage** - Tokens stored as SHA-256 hashes, never in plaintext
- **Constant-time comparison** - Prevents timing attacks using `crypto.timingSafeEqual()`
- **Single-use tokens** - Tokens marked as used after successful reset
- **Automatic cleanup** - Expired and used tokens are automatically deleted

### Anti-Enumeration Protection
- **Silent success** - Same response whether email exists or not
- **Timing consistency** - Request times don't leak email existence
- **Audit logging** - All attempts logged for security monitoring

### Password Security
- **Strength validation** - Enforces complexity requirements
- **HIBP breach check** - Rejects passwords from known data breaches
- **Email similarity check** - Prevents using email as password
- **Bcrypt hashing** - Passwords hashed with cost factor 12

### Session Security
- **Session invalidation** - All active sessions revoked after password reset
- **Forced re-authentication** - User must log in with new password
- **Email notification** - User receives confirmation email after password change

## API Endpoints

### Request Password Reset

**POST** `/api/v1/auth/forgot-password`

```json
{
  "email": "user@example.com"
}
```

**Response** (always 200, regardless of email existence):
```json
{
  "success": true,
  "data": {
    "message": "If an account with this email exists, a password reset link has been sent."
  }
}
```

**Security Notes:**
- Returns same response for existing and non-existing emails
- Rate limited to 3 requests per hour per IP
- Invalidates any previous reset tokens for the user

### Reset Password

**POST** `/api/v1/auth/reset-password`

```json
{
  "token": "abc123...",
  "password": "NewSecurePassword123!@#"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "message": "Password has been reset successfully. Please log in with your new password."
  }
}
```

**Error Responses**:

Invalid or expired token (401):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired token"
  }
}
```

Weak password (400):
```json
{
  "success": false,
  "error": {
    "code": "WEAK_PASSWORD",
    "message": "Password must be at least 12 characters, Password must contain at least one uppercase letter, ..."
  }
}
```

## Email Configuration

### Required Environment Variables

Add these to your `.env` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true for port 465, false for other ports (uses STARTTLS)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM="Your App Name <noreply@yourapp.com>"

# Application URL (for reset links)
APP_URL=https://yourapp.com  # or http://localhost:3000 for development
```

### Gmail Setup (Example)

1. Enable 2-factor authentication on your Google account
2. Generate an app-specific password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a password for "Mail" application
   - Use this password in `SMTP_PASS`

### Other SMTP Providers

**SendGrid:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**AWS SES:**
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

**Mailgun:**
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## Database Schema

The password reset system uses the `PasswordResetToken` model:

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique  // SHA-256 hash of the token
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  email     String   // Email address for the reset request
  expiresAt DateTime // 15 minutes from creation
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([token])
  @@index([userId])
  @@index([email])
  @@index([expiresAt])
}
```

## Implementation Details

### Token Generation Flow

1. User requests password reset via email
2. System checks if user exists (silent failure if not)
3. Generate cryptographically secure 32-byte token
4. Hash token with SHA-256
5. Store hash in database with 15-minute expiration
6. Invalidate any previous reset tokens for this user
7. Send email with plaintext token in reset URL
8. Log audit event

### Token Validation Flow

1. User submits token and new password
2. Hash submitted token with SHA-256
3. Query all non-expired, unused tokens
4. Use constant-time comparison to find matching token
5. Validate new password strength (including HIBP check)
6. Update user password with bcrypt
7. Mark token as used
8. Revoke all active sessions
9. Clean up old tokens
10. Send confirmation email
11. Log audit event

### Security Audit Events

All password reset operations are logged:

- `auth.password_reset.email_not_found` - Reset requested for unknown email
- `auth.password_reset.deleted_account` - Reset requested for deleted account
- `auth.password_reset.requested` - Reset token generated and sent
- `auth.password_reset.invalid_token` - Invalid token submitted
- `auth.password_reset.expired` - Expired token submitted
- `auth.password_reset.weak_password` - Password failed strength validation
- `auth.password_reset.success` - Password successfully reset

## Testing

### Run Tests

```bash
cd apps/desktop-companion
pnpm test src/__tests__/auth/password-reset.test.ts
```

### Test Coverage

The test suite covers:
- ✅ Token generation and storage
- ✅ Email enumeration protection
- ✅ Token expiration handling
- ✅ Password strength validation
- ✅ Session invalidation
- ✅ Single-use token enforcement
- ✅ Constant-time comparison
- ✅ Concurrent request handling
- ✅ HIBP breach check

## Usage Examples

### Basic Flow

```typescript
import { authService } from './auth/service';

// User requests password reset
await authService.requestPasswordReset('user@example.com');
// Email sent with token

// User submits new password with token from email
await authService.resetPassword(tokenFromEmail, 'NewSecurePass123!@#');
// Password updated, sessions invalidated, confirmation email sent
```

### Error Handling

```typescript
try {
  await authService.resetPassword(token, newPassword);
  console.log('Password reset successful');
} catch (error) {
  if (error instanceof AuthError) {
    switch (error.code) {
      case 'INVALID_TOKEN':
        console.log('Token is invalid or expired');
        break;
      case 'WEAK_PASSWORD':
        console.log('Password does not meet requirements');
        break;
      default:
        console.log('An error occurred');
    }
  }
}
```

## Production Deployment Checklist

### Security
- [ ] HTTPS enabled (required for secure token transmission)
- [ ] SMTP credentials stored in secure environment variables
- [ ] Rate limiting configured on password reset endpoints
- [ ] CORS configured to allow only trusted origins
- [ ] Security headers configured (HSTS, CSP, etc.)

### Email
- [ ] SMTP credentials validated
- [ ] Email templates tested
- [ ] "From" address configured with proper SPF/DKIM/DMARC
- [ ] Email delivery monitoring set up
- [ ] Bounce handling configured

### Monitoring
- [ ] Audit logs being collected
- [ ] Alerts configured for suspicious activity:
  - Multiple failed reset attempts
  - Unusual volume of reset requests
  - Failed email deliveries
- [ ] Metrics tracking:
  - Password reset request volume
  - Success/failure rates
  - Token expiration rates

### Compliance
- [ ] Privacy policy updated to mention password reset emails
- [ ] Terms of service reviewed
- [ ] GDPR compliance verified (data retention, user rights)
- [ ] Data breach notification procedures in place

## Troubleshooting

### Email Not Sending

**Development Mode:**
```
[email] Email service not configured - email not sent (development mode)
```
This is normal when SMTP variables are not set. Tokens will be logged to console.

**Production Issues:**
1. Verify SMTP credentials
2. Check firewall allows outbound SMTP connections
3. Verify SPF/DKIM records for sender domain
4. Check application logs for detailed error messages

### Token Invalid or Expired

Tokens expire after 15 minutes. This is intentional for security.

**Solutions:**
- Request a new password reset
- Increase expiration time in `getPasswordResetTokenExpiry()` (not recommended)
- Ensure system clock is accurate

### Password Rejected

Common reasons:
- Less than 12 characters
- Missing uppercase/lowercase/number/special character
- Similar to email address
- Found in data breach (HIBP check)

**Solutions:**
- Follow password requirements shown in error message
- Choose a unique password not found in breaches

## Rate Limiting

Default rate limits (configured in `auth/rate-limiters.ts`):

- **Password reset request:** 3 per hour per IP
- **Password reset submit:** 3 per hour per IP
- **General auth endpoints:** 100 per 15 minutes per IP

These limits prevent:
- Email bombing attacks
- Brute force token attempts
- Resource exhaustion

## Architecture Decisions

### Why 15 minutes?
Industry best practice. Long enough for user to check email, short enough to minimize exposure if token intercepted.

### Why SHA-256 for tokens?
Tokens have 256 bits of cryptographic entropy, making collision attacks infeasible. SHA-256 is sufficient (unlike passwords which need bcrypt/Argon2).

### Why constant-time comparison?
Prevents timing attacks that could reveal valid token hashes through response time differences.

### Why invalidate all sessions?
If account was compromised, attacker may have active sessions. Forcing re-login ensures attacker is locked out.

### Why single-use tokens?
Prevents token reuse if token is intercepted after legitimate use.

## Future Enhancements

Potential improvements:
- [ ] Multi-factor authentication for password reset
- [ ] Password reset via SMS (backup option)
- [ ] Password history (prevent reusing recent passwords)
- [ ] Configurable token expiration per user risk level
- [ ] Account lockout after multiple failed reset attempts
- [ ] Passwordless authentication options

## Security Incident Response

If a password reset token is compromised:

1. **Immediate Actions:**
   - Token expires automatically in 15 minutes
   - User can request new token (invalidates old one)
   - Single-use prevents reuse

2. **Detection:**
   - Monitor audit logs for unusual patterns
   - Alert on multiple failed token attempts
   - Track password reset volume anomalies

3. **Response:**
   - Investigate user account for unauthorized access
   - Review recent session activity
   - Contact user if suspicious activity detected
   - Consider temporary account suspension if needed

## Support

For issues or questions:
- Review audit logs: `apps/desktop-companion/logs/`
- Check application logs for detailed error messages
- Verify environment configuration
- Review test suite for expected behavior

## References

- OWASP Authentication Cheat Sheet
- NIST SP 800-63B Digital Identity Guidelines
- Have I Been Pwned API Documentation
- Nodemailer Documentation
