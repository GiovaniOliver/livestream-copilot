# Authentication Quick Start Guide

## Getting Started in 5 Minutes

### 1. Environment Setup

Copy the sample environment file:
```bash
cd apps/web
cp .env.sample .env.local
```

The default configuration should work with the backend running on `http://localhost:3123`.

### 2. Start the Backend

Ensure the desktop companion backend is running:
```bash
cd apps/desktop-companion
npm run dev
```

The backend should be available at `http://localhost:3123`.

### 3. Start the Web App

```bash
cd apps/web
npm run dev
```

The web app should be available at `http://localhost:3000`.

### 4. Test Authentication

#### Create an Account

1. Navigate to `http://localhost:3000/auth/register`
2. Fill in the registration form:
   - Name (optional)
   - Email address
   - Password (must meet requirements)
   - Confirm password
   - Agree to terms
3. Click "Create account"
4. You'll be redirected to the login page

#### Log In

1. Navigate to `http://localhost:3000/auth/login`
2. Enter your email and password
3. Check "Remember me" to persist your session
4. Click "Sign in"
5. You'll be redirected to `/dashboard`

#### Try OAuth (Optional)

1. Click "Continue with Google", "Continue with GitHub", or "Continue with Twitch"
2. Authorize the application
3. You'll be redirected back and logged in

#### Test Password Reset

1. Navigate to `http://localhost:3000/auth/forgot-password`
2. Enter your email
3. Check the backend console for the reset token (since email is not implemented)
4. Navigate to `http://localhost:3000/auth/reset-password?token=YOUR_TOKEN`
5. Enter a new password
6. You'll be redirected to login with your new password

### 5. Access Protected Routes

Once logged in, you can access:
- `/dashboard` - Main dashboard
- `/dashboard/session/:id` - Session pages
- `/dashboard/settings` - Settings
- All other dashboard routes

Trying to access these routes without authentication will redirect you to `/auth/login`.

## Key Features

### Auto-Login
If "Remember me" is checked, you'll stay logged in even after closing the browser.

### Auto-Refresh
Your session will automatically refresh tokens in the background, keeping you logged in.

### Logout
Click the logout button in the dashboard sidebar to end your session.

## Common Routes

```
/auth/login              - Login page
/auth/register           - Registration page
/auth/forgot-password    - Password reset request
/auth/reset-password     - Password reset form (with token)
/auth/callback           - OAuth callback handler
/dashboard               - Protected dashboard
```

## Using Auth in Components

```tsx
import { useAuth } from '@/lib/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <p>Please log in</p>;
  }

  return (
    <div>
      <p>Welcome, {user?.name || user?.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Protecting Routes

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function MyPage() {
  return (
    <ProtectedRoute>
      <div>Protected content here</div>
    </ProtectedRoute>
  );
}
```

## Making Authenticated Requests

```tsx
import { useAuth } from '@/lib/contexts/AuthContext';
import { apiClient } from '@/lib/api/client';

function MyComponent() {
  const { accessToken } = useAuth();

  const fetchData = async () => {
    const data = await apiClient.get('/api/v1/some-endpoint', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return data;
  };
}
```

## Troubleshooting

### Can't Log In
- Verify backend is running on port 3123
- Check browser console for errors
- Verify credentials are correct
- Try clearing browser storage

### OAuth Not Working
- Ensure OAuth providers are configured in backend
- Check redirect URIs match backend configuration
- Verify backend `.env` has OAuth credentials

### Token Expired
- Tokens refresh automatically
- If refresh fails, you'll be logged out
- Simply log in again

### CORS Errors
- Ensure backend CORS configuration allows `http://localhost:3000`
- Check backend logs for CORS-related errors

## Next Steps

1. Configure OAuth providers (see backend `.env` configuration)
2. Implement email service for verification and password reset
3. Customize auth page designs
4. Add additional security features (2FA, etc.)
5. Set up production environment variables

## Support

- Check `AUTH_README.md` for detailed documentation
- Review error messages in browser console
- Check backend logs for API errors
- Verify API connectivity with browser DevTools

## Security Notes

- Never commit `.env.local` to version control
- Use HTTPS in production
- Rotate secrets regularly
- Monitor for suspicious activity
- Enable rate limiting in production
- Implement email verification before allowing login
