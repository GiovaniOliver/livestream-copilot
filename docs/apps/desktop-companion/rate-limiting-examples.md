# Rate Limiting Examples for Authentication Endpoints

This document demonstrates how rate limiting protects authentication endpoints from various attacks.

## Overview

Rate limiting has been implemented on all authentication endpoints to prevent:
- Brute force password attacks
- Credential stuffing
- Account enumeration
- Email bombing
- Token enumeration
- Service abuse

## Implementation Details

### Rate Limit Configuration

| Endpoint | Limit | Window | Key Strategy | Purpose |
|----------|-------|--------|--------------|---------|
| `/login` | 5 | 15 min | IP:email | Prevent brute force attacks |
| `/register` | 3 | 1 hour | IP only | Prevent mass account creation |
| `/forgot-password` | 3 | 1 hour | IP only | Prevent email bombing |
| `/reset-password` | 3 | 1 hour | IP only | Prevent token enumeration |
| `/verify-email` | 10 | 1 hour | IP only | Prevent token brute force |
| `/resend-verification` | 3 | 1 hour | IP only | Prevent email spam |
| `/refresh` | 10 | 1 min | IP only | Prevent token enumeration |
| All endpoints | 20 | 1 min | IP only | Base protection layer |

### Security Features

1. **Dual-layer Protection**: General limiter + endpoint-specific limiters
2. **Smart Key Generation**: IP+email for login (prevents distributed attacks)
3. **Standard Headers**: Uses RateLimit-* headers per IETF draft
4. **Retry-After**: Tells clients when to retry
5. **All Requests Counted**: Counts both successful and failed attempts

## Example Scenarios

### Scenario 1: Brute Force Login Attack

An attacker tries to guess passwords for a specific account:

```bash
# Attempt 1-5: Allowed
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"victim@example.com","password":"wrong1"}'

# Attempt 6: Rate limited (429 response)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"victim@example.com","password":"wrong6"}'

# Response:
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": "900"
  }
}
```

**Protection**: After 5 failed attempts, the IP:email combination is blocked for 15 minutes.

### Scenario 2: Credential Stuffing with Multiple IPs

Attacker uses multiple IPs but targets same email:

```bash
# From IP 1.1.1.1 - attempts 1-5 allowed
# From IP 2.2.2.2 - attempts 1-5 allowed
# From IP 3.3.3.3 - attempts 1-5 allowed
```

**Protection**: Each IP:email combination has separate limit. Attacker can't bypass by IP rotation, and each IP is rate limited independently.

### Scenario 3: Mass Account Registration

Bot attempting to create many accounts:

```bash
# From IP 1.1.1.1
# Attempt 1: Allowed
# Attempt 2: Allowed
# Attempt 3: Allowed
# Attempt 4: Rate limited (429)
```

**Protection**: Only 3 registrations per hour from any single IP, preventing automated bot registration.

### Scenario 4: Email Bombing via Password Reset

Attacker flooding victim's inbox with reset emails:

```bash
# Password reset requests to victim@example.com
# Request 1: Allowed (email sent)
# Request 2: Allowed (email sent)
# Request 3: Allowed (email sent)
# Request 4: Rate limited (no email sent)
```

**Protection**: Maximum 3 password reset emails per hour from any IP.

### Scenario 5: Token Enumeration Attack

Attacker trying to validate stolen refresh tokens:

```bash
# Within 1 minute:
# Attempts 1-10: Allowed
# Attempt 11: Rate limited
```

**Protection**: 10 token refresh attempts per minute limits brute force validation of stolen tokens.

## Testing Rate Limits

### Manual Testing with curl

1. **Test Login Rate Limit**:
```bash
# Run this 6 times quickly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@example.com\",\"password\":\"wrong$i\"}" \
    -w "\nHTTP Status: %{http_code}\n\n"
done
```

Expected: First 5 requests return 401 (invalid credentials), 6th returns 429 (rate limited).

2. **Test Registration Rate Limit**:
```bash
# Run this 4 times
for i in {1..4}; do
  curl -X POST http://localhost:3000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$i@example.com\",\"password\":\"SecurePass123!\"}" \
    -w "\nHTTP Status: %{http_code}\n\n"
done
```

Expected: First 3 requests processed, 4th returns 429.

3. **Check Rate Limit Headers**:
```bash
curl -v -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  2>&1 | grep -i ratelimit
```

Expected output:
```
< RateLimit-Limit: 5
< RateLimit-Remaining: 4
< RateLimit-Reset: 1234567890
```

### Automated Testing

Run the test suites:

```bash
# Unit tests
pnpm test src/__tests__/auth/rate-limiters.test.ts

# Integration tests
pnpm test src/__tests__/auth/rate-limiters.integration.test.ts
```

## Response Format

### Successful Request (Within Limit)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "tokenType": "Bearer",
    "user": { ... }
  }
}
```

Headers:
```
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 1234567890
```

### Rate Limited Request (Limit Exceeded)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": "900"
  }
}
```

HTTP Status: `429 Too Many Requests`

Headers:
```
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1234567890
Retry-After: 900
```

## Production Considerations

### 1. Redis-Backed Store

For production environments with multiple servers, replace the in-memory store with Redis:

```typescript
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

export const loginLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:login:",
  }),
  // ... other config
});
```

### 2. Trust Proxy Configuration

Configure Express to trust proxy headers:

```typescript
app.set("trust proxy", 1); // Trust first proxy
// Or for specific proxies:
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
```

### 3. Monitoring and Alerting

Set up alerts for rate limit violations:

```typescript
// In rate-limiters.ts handler
function handleRateLimitExceeded(req: Request, res: any): void {
  const ip = getClientIp(req);
  const path = req.path;

  // Log to SIEM
  logger.security({
    event: "rate_limit_exceeded",
    ip,
    path,
    timestamp: new Date().toISOString(),
  });

  // Alert if threshold exceeded
  if (shouldAlert(ip, path)) {
    alertSecurityTeam({
      severity: "medium",
      message: `Rate limit abuse detected from ${ip} on ${path}`,
    });
  }

  // ... existing response logic
}
```

### 4. Whitelist Trusted IPs

For trusted internal services or monitoring tools:

```typescript
export const loginLimiter = rateLimit({
  skip: (req) => {
    const trustedIPs = process.env.TRUSTED_IPS?.split(",") || [];
    const clientIp = getClientIp(req);
    return trustedIPs.includes(clientIp);
  },
  // ... other config
});
```

## Security Best Practices

1. **Never bypass rate limiting** for any user, including admins
2. **Monitor rate limit violations** for security incidents
3. **Use Redis in production** for distributed rate limiting
4. **Configure trust proxy** correctly to get real client IPs
5. **Combine with other defenses**: CAPTCHA, account lockout, MFA
6. **Test regularly** to ensure limits are effective but not too restrictive
7. **Adjust limits based on metrics** and user feedback
8. **Log all violations** for security analysis

## Troubleshooting

### Problem: Legitimate users being rate limited

**Solution**: Review and adjust limits based on actual usage patterns:
```typescript
// Increase limit or window
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Increased from 5
  // ...
});
```

### Problem: Rate limits not working across servers

**Solution**: Implement Redis-backed store (see Production Considerations #1)

### Problem: Rate limits applying to wrong IPs

**Solution**: Configure `trust proxy` setting correctly (see Production Considerations #2)

### Problem: Rate limit store growing unbounded

**Solution**: express-rate-limit automatically cleans up expired entries. For Redis, set TTL:
```typescript
store: new RedisStore({
  client: redisClient,
  prefix: "rl:",
  sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  expiry: 24 * 60 * 60, // 24 hours
}),
```

## Additional Resources

- [express-rate-limit documentation](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html#rate-limiting)
- [IETF RateLimit Headers Draft](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers)

## Implementation Reference

See the following files for complete implementation:
- `src/auth/rate-limiters.ts` - Rate limiter middleware definitions
- `src/auth/routes.ts` - Rate limiter application to routes
- `src/__tests__/auth/rate-limiters.test.ts` - Unit tests
- `src/__tests__/auth/rate-limiters.integration.test.ts` - Integration tests
