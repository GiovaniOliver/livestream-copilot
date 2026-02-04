# Have I Been Pwned (HIBP) Integration

## Overview

This document describes the integration of Have I Been Pwned (HIBP) password breach checking into the authentication system. This feature enhances security by preventing users from choosing passwords that have been exposed in known data breaches.

## Implementation

### Location

- **Main Function**: `apps/desktop-companion/src/auth/utils.ts:validatePasswordStrength()`
- **Tests**: `apps/desktop-companion/src/__tests__/auth/utils.test.ts`
- **Package**: `hibp@^14.3.0`

### How It Works

The HIBP integration uses the Pwned Passwords API v3 with k-anonymity to check if a password has appeared in known data breaches:

1. **Password Validation Flow**:
   - User submits password during registration
   - Password is validated for complexity requirements
   - Password is checked against HIBP API
   - If breached, user is notified and must choose a different password

2. **k-Anonymity Privacy Protection**:
   - Only the first 5 characters of the SHA-1 hash are sent to HIBP
   - The full password hash never leaves the server
   - HIBP returns all matching hash suffixes
   - Local comparison determines if password is breached
   - This ensures user passwords remain private

3. **API Call Example**:
   ```typescript
   import { pwnedPassword } from 'hibp';

   const count = await pwnedPassword('Password123!');
   // Returns: 3861493 (times this password appears in breaches)
   ```

## Security Features

### 1. Privacy Protection

- **k-Anonymity**: Only 5 characters of SHA-1 hash sent to API
- **No Password Leakage**: Full password never transmitted
- **Local Verification**: Breach detection happens server-side
- **No Tracking**: HIBP does not track which passwords are checked

### 2. Graceful Degradation

The system continues to function even if HIBP is unavailable:

```typescript
try {
  const pwnedCount = await pwnedPassword(password);
  if (pwnedCount > 0) {
    errors.push(`Password appears in ${pwnedCount} breaches`);
  }
} catch (error) {
  // Log error but don't block user
  console.warn('[auth] HIBP API check failed:', error);
  // Other password requirements still enforced
}
```

### 3. Defense in Depth

HIBP is one layer of many security controls:
- Minimum 12 character length
- Complexity requirements (uppercase, lowercase, number, special)
- Email similarity check
- bcrypt password hashing with cost factor 12
- JWT-based authentication
- Rate limiting on auth endpoints

### 4. Error Handling

Comprehensive error handling ensures system reliability:

- **Network Errors**: Logged but don't block registration
- **API Timeouts**: Password validation continues
- **Rate Limiting**: Gracefully handled
- **Service Unavailable**: Falls back to other checks
- **All Failures Logged**: For monitoring and alerting

## Usage Examples

### Registration with HIBP Check

```typescript
// In auth service
const passwordValidation = await validatePasswordStrength(
  password,
  normalizedEmail
);

if (!passwordValidation.valid) {
  throw AuthError.weakPassword(passwordValidation.errors);
}
```

### User Experience

**Scenario 1: Password Found in Breach**
```
User enters: "Password123!"
System response: "This password has appeared in 3,861,493 data breaches
                 and should not be used. Please choose a different password."
```

**Scenario 2: Secure Password**
```
User enters: "Tr0ub4dor&3Plaid"
HIBP check: 0 breaches found
System response: "Registration successful"
```

**Scenario 3: HIBP API Down**
```
User enters: "SecureP@ssw0rd123"
HIBP check: API unavailable
System response: Continues with other validations
Logged: "[auth] HIBP API check failed: Network error"
```

## Testing

### Test Coverage

The test suite includes comprehensive coverage:

1. **Basic Requirements**: Length, complexity, special characters
2. **Email Similarity**: Prevents using email as password
3. **HIBP Integration**:
   - Breached passwords rejected
   - Clean passwords accepted
   - API failures handled gracefully
4. **Real-world Examples**: Common breached passwords tested

### Running Tests

```bash
# Run all auth tests
cd apps/desktop-companion
pnpm test src/__tests__/auth/utils.test.ts

# Run specific test
pnpm test -t "HIBP Breach Detection"
```

### Test Examples

```typescript
it("should reject password found in data breaches", async () => {
  vi.mocked(hibp.pwnedPassword).mockResolvedValue(3861493);

  const result = await validatePasswordStrength("Password123!");

  expect(result.valid).toBe(false);
  expect(result.errors).toContainEqual(
    expect.stringContaining("3,861,493 data breaches")
  );
});

it("should gracefully handle HIBP API failures", async () => {
  vi.mocked(hibp.pwnedPassword).mockRejectedValue(
    new Error("Network error")
  );

  const result = await validatePasswordStrength("SecureP@ssw0rd123");

  expect(result.valid).toBe(true); // Other checks pass
  expect(console.warn).toHaveBeenCalled();
});
```

## Monitoring

### Metrics to Track

1. **HIBP API Availability**:
   - Success rate
   - Response times
   - Error rates

2. **Password Rejection Metrics**:
   - Number of passwords rejected due to breaches
   - Most common rejected passwords (hashed)
   - Breach count distribution

3. **API Errors**:
   - Network failures
   - Timeouts
   - Rate limit hits

### Logging

All HIBP-related events are logged:

```typescript
console.warn('[auth] HIBP API check failed:', {
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

## Performance Considerations

### API Response Time

- **Typical Response**: 200-500ms
- **Timeout Recommendation**: 5 seconds
- **Impact**: Adds <1s to registration flow
- **Caching**: Not recommended (passwords change frequently)

### Rate Limiting

HIBP API rate limits:
- **Anonymous**: ~1500 requests/minute
- **With User-Agent**: Higher limits
- **Recommended**: Implement request throttling if needed

## Future Enhancements

### Potential Improvements

1. **Metrics Dashboard**:
   - Track HIBP API health
   - Monitor password rejection rates
   - Alert on API failures

2. **Password Strength Meter**:
   - Show real-time feedback to users
   - Display breach count before submission
   - Suggest stronger alternatives

3. **Async Validation**:
   - Check password in background
   - Show loading indicator
   - Improve perceived performance

4. **User Education**:
   - Explain why password was rejected
   - Link to breach database
   - Provide security best practices

## References

- [Have I Been Pwned API](https://haveibeenpwned.com/API/v3)
- [k-Anonymity Model](https://en.wikipedia.org/wiki/K-anonymity)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

## Support

For issues or questions:
1. Check HIBP API status: https://haveibeenpwned.com/API/v3
2. Review error logs for API failures
3. Verify network connectivity
4. Check rate limiting metrics

## Security Disclosure

If you discover a security issue with this implementation, please report it through our security disclosure process rather than creating a public issue.
