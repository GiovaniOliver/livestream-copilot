# Rate Limiting Quick Reference

Quick reference for authentication rate limiting implementation (SOC-397).

## At a Glance

| Endpoint | Limit | Timeframe | Protection Against |
|----------|-------|-----------|-------------------|
| `POST /api/v1/auth/login` | 5 | 15 min | Brute force, credential stuffing |
| `POST /api/v1/auth/register` | 3 | 1 hour | Bot signups, account spam |
| `POST /api/v1/auth/forgot-password` | 3 | 1 hour | Email bombing |
| `POST /api/v1/auth/reset-password` | 3 | 1 hour | Token enumeration |
| `POST /api/v1/auth/verify-email` | 10 | 1 hour | Token brute force |
| `POST /api/v1/auth/resend-verification` | 3 | 1 hour | Email spam |
| `POST /api/v1/auth/refresh` | 10 | 1 min | Token enumeration |
| All auth endpoints | 20 | 1 min | General abuse |

## Quick Test

```bash
# Test login rate limit (run 6 times, expect 6th to return 429)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
done
```

## Rate Limit Response

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

## Response Headers

```
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1234567890
Retry-After: 900
```

## Important Configuration

### Express Trust Proxy (REQUIRED in production)
```typescript
// In src/index.ts (already configured)
app.set("trust proxy", 1);
```

Without this, rate limiting uses proxy IP instead of client IP!

## Files Reference

- **Implementation**: `src/auth/rate-limiters.ts`
- **Routes**: `src/auth/routes.ts`
- **Tests**: `src/__tests__/auth/rate-limiters.test.ts`
- **Full Docs**: `docs/rate-limiting-examples.md`
- **Security Review**: `docs/SECURITY_REVIEW_SOC-397.md`

## Modifying Limits

Edit `src/auth/rate-limiters.ts`:

```typescript
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // ← Change this to increase/decrease limit
  // ... other config
});
```

After changes:
1. Rebuild: `pnpm build`
2. Restart server
3. Test new limits

## Production Checklist

- [x] Trust proxy configured
- [ ] Metrics/monitoring in place
- [ ] Alerts configured for violations
- [ ] Redis store (if multi-server)

## Common Issues

| Problem | Solution |
|---------|----------|
| Users blocked unfairly | Increase limits |
| Limits not working | Check trust proxy setting |
| Different IPs, same limit | Using in-memory store across servers → Use Redis |

## Support

For issues or questions:
1. Check `docs/rate-limiting-examples.md` for examples
2. Review `docs/SECURITY_REVIEW_SOC-397.md` for security details
3. Run tests: `pnpm test src/__tests__/auth/rate-limiters.test.ts`
