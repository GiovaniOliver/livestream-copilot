# Mobile App Authentication Testing Guide

## Quick Start

### Prerequisites
1. Desktop companion server running at `http://localhost:3123`
2. OAuth providers configured (optional)
3. iOS/Android device or simulator

### Run the App
```bash
cd apps/mobile
pnpm install
pnpm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code for physical device

## Test Scenarios

### 1. Login Flow

#### Email/Password Login
1. Launch app
2. Enter email: `test@example.com`
3. Enter password: `SecurePass123!`
4. Toggle "Remember me" ON
5. Tap "Sign In"
6. **Expected**: Success, navigates to main app

#### Email Validation
1. Enter invalid email: `notanemail`
2. **Expected**: Red border, error message "Please enter a valid email address"
3. Enter valid email
4. **Expected**: Border returns to normal

#### Password Visibility
1. Enter password
2. Tap "Show" button
3. **Expected**: Password becomes visible
4. Tap "Hide" button
5. **Expected**: Password becomes hidden

#### Remember Me
1. Login with "Remember me" ON
2. Force close app
3. Relaunch app
4. **Expected**: Auto-login, goes to main app

#### Forgot Password
1. Enter email
2. Tap "Forgot password?"
3. Tap "Send"
4. **Expected**: Success message, check email

### 2. Registration Flow

#### Valid Registration
1. Tap "Sign up"
2. Enter name: `John Doe`
3. Enter email: `john@example.com`
4. Enter password: `SuperSecure123!@#`
5. Confirm password: `SuperSecure123!@#`
6. **Expected**: All validation passes, shows checkmarks
7. Tap "Create Account"
8. **Expected**: Success, prompts to check email

#### Password Strength
1. Enter password: `short`
2. **Expected**: Red bars, "Very weak"
3. Enter password: `LongerPassword1`
4. **Expected**: Yellow/orange bars, "Fair"
5. Enter password: `LongerPassword1!`
6. **Expected**: Green/teal bars, "Strong", all requirements met

#### Password Requirements
Monitor the checkmarks:
- `○` = Not met (gray)
- `✓` = Met (green)

Requirements:
- At least 12 characters
- One uppercase letter
- One lowercase letter
- One number
- One special character

#### Password Mismatch
1. Enter password: `SecurePass123!`
2. Enter confirm: `DifferentPass123!`
3. **Expected**: Red border on confirm field, error message

### 3. Biometric Authentication

#### Enable Biometric (First Time)
1. Login successfully with email/password
2. Go to Settings (if available)
3. Toggle "Enable Face ID/Touch ID"
4. **Expected**: Biometric prompt appears
5. Authenticate with biometric
6. **Expected**: "Biometric Enabled" message

#### Biometric Login
1. Force close app
2. Relaunch app
3. **Expected**: Biometric prompt appears automatically
4. Authenticate with biometric
5. **Expected**: Logs in, goes to main app

#### Biometric Fallback
1. On biometric prompt, tap "Cancel"
2. **Expected**: Stays on login screen, can login with password

### 4. OAuth Integration

#### Google OAuth
1. Tap "Google" button
2. **Expected**: Browser opens with Google login
3. Sign in with Google
4. **Expected**: Redirects back to app, auto-login

#### GitHub OAuth
1. Tap "GitHub" button
2. **Expected**: Browser opens with GitHub login
3. Sign in with GitHub
4. **Expected**: Redirects back to app, auto-login

#### OAuth Cancellation
1. Tap "Twitch" button
2. Tap "Cancel" in browser
3. **Expected**: Returns to login screen, no error

### 5. Session Management

#### Session Timeout
1. Login successfully
2. Wait 30 minutes (or change timeout in settings)
3. Try to interact with app
4. **Expected**: Session expired, returns to login

#### Token Refresh
1. Login successfully
2. Wait 55 minutes (access token expires in 1 hour)
3. Make an API call
4. **Expected**: Token refreshes automatically, call succeeds

#### Activity Tracking
1. Login successfully
2. Use the app (tap buttons, navigate)
3. **Expected**: Session timeout resets with each interaction

### 6. Error Handling

#### Network Error
1. Disable WiFi and mobile data
2. Try to login
3. **Expected**: Error "No internet connection. Please check your network."

#### Invalid Credentials
1. Enter wrong email/password
2. Tap "Sign In"
3. **Expected**: Error "Invalid email or password"

#### Rate Limiting
1. Try to login 5 times with wrong password
2. **Expected**: Error "Too many login attempts. Please try again later."

#### Account Suspended
1. Login with suspended account
2. **Expected**: Error "Your account has been suspended. Please contact support."

### 7. Edge Cases

#### Rapid Login Attempts
1. Tap "Sign In" multiple times quickly
2. **Expected**: Button disabled during loading, only one request sent

#### Empty Fields
1. Leave email and password empty
2. Tap "Sign In"
3. **Expected**: Alert "Please enter your email address"

#### Whitespace in Email
1. Enter email with spaces: ` test@example.com `
2. Tap "Sign In"
3. **Expected**: Spaces trimmed, login proceeds

#### Special Characters in Password
1. Register with password: `P@ssw0rd!#$%^&*()`
2. **Expected**: Accepted, all special chars allowed

### 8. Visual & UX

#### Loading States
1. Tap "Sign In"
2. **Expected**: Button shows spinner, is disabled
3. **Expected**: Input fields disabled during login

#### Animations
1. Launch app
2. **Expected**: Login screen fades in smoothly
3. Navigate between Login/Register
4. **Expected**: Smooth transitions

#### Haptic Feedback
1. Tap "Sign In" successfully
2. **Expected**: Success vibration (medium impact)
3. Tap with invalid input
4. **Expected**: Error vibration (error notification)

### 9. Persistence

#### Remember Me ON
1. Login with "Remember me" ON
2. Close app completely
3. Reopen app
4. **Expected**: Auto-login, no login screen

#### Remember Me OFF
1. Login with "Remember me" OFF
2. Close app completely
3. Reopen app
4. **Expected**: Shows login screen

#### Logout
1. Login successfully
2. Tap "Logout" (in settings)
3. **Expected**: Returns to login screen
4. Reopen app
5. **Expected**: Shows login screen

### 10. Security

#### Secure Storage
1. Login successfully
2. Close app
3. Check device keychain/keystore
4. **Expected**: Tokens stored securely, not in plain text

#### Token Expiry
1. Login successfully
2. Manually expire access token (wait 1 hour or modify token)
3. Make API call
4. **Expected**: Token refreshes automatically

#### Invalid Refresh Token
1. Login successfully
2. Manually invalidate refresh token on server
3. Make API call
4. **Expected**: Logs out, returns to login screen

## Performance Benchmarks

### Target Metrics
- Cold start with auto-login: < 2 seconds
- Login API response: < 1 second
- Token refresh: < 500ms
- Biometric prompt: < 200ms
- Input validation: Instant (< 50ms)

### Memory Usage
- Auth screens: < 50MB
- After login: < 150MB
- Peak memory: < 200MB

## Debugging

### Enable Debug Logs
Check console for:
- `[authStore]` - Authentication operations
- `[SecureStorage]` - Secure storage operations
- `[BiometricAuth]` - Biometric operations
- `[LoginScreen]` - Login screen events
- `[App]` - App lifecycle events

### Common Issues

#### Biometric Not Working
- Check device has biometrics enrolled
- Check app permissions
- Try resetting biometric settings

#### OAuth Redirect Fails
- Check deep link configuration in `app.json`
- Verify OAuth callback URL matches
- Check browser cookie settings

#### Session Timeout Too Soon
- Check session timeout setting (default 30 minutes)
- Verify activity tracking is working
- Check system time is correct

## Platform-Specific Notes

### iOS
- Face ID requires camera permission
- Test on both Face ID and Touch ID devices
- Check iOS Keychain for stored tokens

### Android
- Fingerprint requires permission
- Test on different Android versions (10, 11, 12, 13)
- Check Android Keystore for stored tokens

## Regression Testing Checklist

Before each release, test:
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Registration with strong password
- [ ] Registration with weak password
- [ ] Remember me functionality
- [ ] Biometric authentication (if available)
- [ ] OAuth providers (all 3)
- [ ] Forgot password flow
- [ ] Email validation
- [ ] Password strength indicator
- [ ] Session timeout
- [ ] Token refresh
- [ ] Logout
- [ ] Network error handling
- [ ] App state transitions (background/foreground)
- [ ] Cold start with auto-login
- [ ] Memory usage and leaks

## Bug Report Template

When reporting auth-related bugs, include:
1. Device: iOS/Android, version, model
2. App version
3. Steps to reproduce
4. Expected behavior
5. Actual behavior
6. Console logs (filter by `[auth` or `[Login`)
7. Screenshots/video
8. Network conditions (WiFi/mobile/offline)

## Success Criteria

Authentication is production-ready when:
- All test scenarios pass
- No memory leaks detected
- Performance benchmarks met
- Security audit passed
- Cross-platform consistency verified
- Accessibility requirements met
- Error messages are clear and actionable
