# Authentication System Documentation

## Overview

This document provides comprehensive information about the FluxBoard authentication system implementation for the web application.

## Features

### Core Authentication
- **Email/Password Authentication**: Traditional registration and login
- **OAuth Integration**: Google, GitHub, and Twitch sign-in
- **Password Reset Flow**: Secure forgot password and reset functionality
- **Email Verification**: Account verification via email (backend implementation required)
- **Session Management**: Persistent sessions with auto-refresh
- **Remember Me**: Optional persistent login across browser sessions

### Security Features
- **Token-based Authentication**: JWT access/refresh token pair
- **Automatic Token Refresh**: Tokens refresh 5 minutes before expiry
- **Secure Storage**: localStorage for persistent, sessionStorage for temporary
- **Protected Routes**: Client-side route protection
- **Password Validation**: Strong password requirements enforced
- **Form Validation**: Client-side validation with error messages

## File Structure

```
apps/web/src/
├── lib/
│   ├── api/
│   │   └── auth.ts                 # Auth API client
│   └── contexts/
│       ├── AuthContext.tsx         # Auth state management
│       └── index.ts
├── components/
│   ├── auth/
│   │   ├── AuthLayout.tsx          # Auth page wrapper
│   │   ├── OAuthButtons.tsx        # OAuth provider buttons
│   │   ├── ProtectedRoute.tsx      # Route protection
│   │   └── index.ts
│   └── ui/
│       └── Input.tsx               # Form input component
└── app/
    └── auth/
        ├── login/
        │   └── page.tsx            # Login page
        ├── register/
        │   └── page.tsx            # Registration page
        ├── forgot-password/
        │   └── page.tsx            # Password reset request
        ├── reset-password/
        │   └── page.tsx            # Password reset form
        └── callback/
            └── page.tsx            # OAuth callback handler
```

## API Endpoints

### Base URL
Default: `http://localhost:3123/api/v1/auth`

Configure via environment variable:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3123
```

### Endpoints

#### POST /register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": false,
      "status": "PENDING_VERIFICATION"
    },
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

#### POST /login
Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "emailVerified": true,
      "organizations": []
    }
  }
}
```

#### POST /refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_token",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

#### POST /logout
Logout and revoke refresh token.

**Request:**
```json
{
  "refreshToken": "refresh_token"
}
```

#### POST /logout-all
Logout from all sessions (requires authentication).

**Headers:**
```
Authorization: Bearer {accessToken}
```

#### GET /me
Get current authenticated user (requires authentication).

**Headers:**
```
Authorization: Bearer {accessToken}
```

#### POST /forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

#### POST /reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset_token",
  "password": "NewSecurePass123!"
}
```

#### GET /oauth/providers
Get available OAuth providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      { "name": "google", "enabled": true },
      { "name": "github", "enabled": true },
      { "name": "twitch", "enabled": true }
    ]
  }
}
```

#### GET /oauth/:provider
Initiate OAuth flow (Google, GitHub, Twitch).

Redirects to OAuth provider's authorization page.

#### GET /oauth/:provider/callback
Handle OAuth callback (backend sets this up).

Redirects to `/auth/callback?accessToken=...&refreshToken=...`

## Usage

### Using Auth Context

```tsx
import { useAuth } from '@/lib/contexts/AuthContext';

function MyComponent() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
  } = useAuth();

  // Login
  const handleLogin = async () => {
    try {
      await login({ email, password }, rememberMe);
      // Automatically redirects to /dashboard
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Logout
  const handleLogout = async () => {
    await logout();
    // Automatically redirects to /auth/login
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.name}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

### Protecting Routes

#### Option 1: Using ProtectedRoute Component

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <div>This content requires authentication</div>
    </ProtectedRoute>
  );
}
```

#### Option 2: Using withAuth HOC

```tsx
import { withAuth } from '@/components/auth/ProtectedRoute';

function ProtectedPage() {
  return <div>This content requires authentication</div>;
}

export default withAuth(ProtectedPage);
```

#### Option 3: Layout-level Protection

The dashboard layout already includes authentication protection:

```tsx
// apps/web/src/app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div>{children}</div>
    </ProtectedRoute>
  );
}
```

### Making Authenticated API Calls

```tsx
import { useAuth } from '@/lib/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';

function MyComponent() {
  const { accessToken } = useAuth();

  const fetchData = async () => {
    const response = await apiClient.get('/api/v1/some-endpoint', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response;
  };
}
```

## Password Requirements

Passwords must meet the following criteria:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*(),.?":{}|<>)

The registration and reset password forms show real-time validation feedback.

## OAuth Flow

1. User clicks OAuth button (Google, GitHub, or Twitch)
2. Redirects to `/api/v1/auth/oauth/:provider`
3. Backend redirects to OAuth provider's authorization page
4. User authorizes the application
5. Provider redirects to `/api/v1/auth/oauth/:provider/callback`
6. Backend processes OAuth response and creates/links account
7. Backend redirects to `/auth/callback?accessToken=...&refreshToken=...`
8. Frontend stores tokens and redirects to `/dashboard`

## Session Persistence

### Remember Me (Default: Enabled)
- Tokens stored in `localStorage`
- Session persists across browser restarts
- Auto-refresh keeps user logged in

### Session Only
- Tokens stored in `sessionStorage`
- Session ends when browser closes
- More secure for shared devices

### Storage Keys
```
fluxboard_access_token
fluxboard_refresh_token
fluxboard_user
fluxboard_remember_me
fluxboard_token_expiry
```

## Token Refresh

Tokens automatically refresh 5 minutes before expiration:
- Access token lifetime: 15 minutes (configurable in backend)
- Refresh token lifetime: 7 days (configurable in backend)
- Automatic refresh happens in the background
- Failed refresh logs user out and redirects to login

## Error Handling

The auth system provides detailed error messages:

### Login Errors
- Invalid email or password
- Account suspended
- Email not verified
- Rate limit exceeded

### Registration Errors
- Email already exists
- Password too weak
- Invalid email format
- Terms not agreed

### Token Errors
- Invalid or expired token
- Token revoked
- Network error

## Styling

All auth components use Tailwind CSS with the FluxBoard design system:
- Dark theme by default
- Gradient background (`bg-gradient-hero`)
- Consistent spacing and typography
- Responsive design
- Accessible form inputs

## Security Best Practices

### Implemented
- HTTPS required in production
- Secure token storage
- Token expiration
- Password strength validation
- Rate limiting ready (backend)
- CSRF protection ready (backend)
- SQL injection prevention (backend using Prisma)

### Recommendations
- Enable rate limiting on backend endpoints
- Implement email verification before login
- Add 2FA for sensitive operations
- Log security events (audit logs)
- Monitor for suspicious activity
- Regularly rotate secrets
- Use environment variables for sensitive config

## Environment Variables

```bash
# Required
NEXT_PUBLIC_API_URL=http://localhost:3123

# OAuth (if using)
# Backend handles OAuth credentials
```

## Testing

### Manual Testing Checklist

**Registration:**
- [ ] Valid registration creates account
- [ ] Duplicate email shows error
- [ ] Weak password shows validation errors
- [ ] Success redirects to login

**Login:**
- [ ] Valid credentials log in successfully
- [ ] Invalid credentials show error
- [ ] Remember me persists session
- [ ] Success redirects to dashboard

**OAuth:**
- [ ] Google sign-in works
- [ ] GitHub sign-in works
- [ ] Twitch sign-in works
- [ ] OAuth creates or links accounts

**Password Reset:**
- [ ] Forgot password sends email
- [ ] Reset token validates correctly
- [ ] Invalid token shows error
- [ ] Success redirects to login

**Protected Routes:**
- [ ] Dashboard requires authentication
- [ ] Unauthenticated users redirect to login
- [ ] Token refresh keeps user logged in
- [ ] Logout clears session

## Troubleshooting

### Issue: "Network Error" on login
**Solution:** Check API_URL is correct and backend is running

### Issue: Infinite redirect loop
**Solution:** Clear browser storage and cookies

### Issue: OAuth callback fails
**Solution:** Ensure OAuth redirect URIs are configured in provider settings

### Issue: Token refresh fails
**Solution:** Check refresh token hasn't expired (7 days default)

### Issue: CORS errors
**Solution:** Configure CORS in backend to allow frontend origin

## Future Enhancements

- [ ] Email verification implementation
- [ ] Two-factor authentication (2FA)
- [ ] Social account linking/unlinking
- [ ] Session management dashboard
- [ ] Login activity log
- [ ] Biometric authentication (WebAuthn)
- [ ] Magic link authentication
- [ ] Account recovery options

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console
3. Check backend logs
4. Verify API connectivity
5. Contact development team

## License

Copyright FluxBoard Team. All rights reserved.
