# Authentication & Authorization System Architecture

## Livestream SaaS Platform - Comprehensive Auth Design

**Version:** 1.0.0
**Last Updated:** 2026-01-03
**Status:** Design Document

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [Security Implementation](#security-implementation)
6. [Authorization Model](#authorization-model)
7. [Subscription Integration](#subscription-integration)
8. [Rate Limiting](#rate-limiting)
9. [Audit Logging](#audit-logging)

---

## Overview

### Design Goals

1. **Multi-tenant Security**: Strict isolation between organizations and users
2. **Flexible Authentication**: Support email/password, OAuth providers, and API keys
3. **Granular Authorization**: Resource-level permissions with RBAC foundation
4. **Subscription-aware**: Feature gating based on subscription tier
5. **Audit Compliance**: Complete audit trail for admin actions
6. **Scalable**: Designed for horizontal scaling with stateless JWT tokens

### User Types/Roles Hierarchy

```
Platform Level:
  - SUPER_ADMIN (platform operators)
  - ADMIN (platform moderators)

Organization Level:
  - OWNER (organization creator, full control)
  - ADMIN (organization admin, most permissions)
  - MEMBER (team member, limited permissions)
  - VIEWER (read-only access)

User Level:
  - FREE_USER (free tier individual)
  - PAID_USER (paid tier individual)
```

---

## Architecture Diagram

```
                                    +------------------+
                                    |   API Gateway    |
                                    |  (Rate Limiting) |
                                    +--------+---------+
                                             |
                    +------------------------+------------------------+
                    |                        |                        |
           +--------v--------+      +--------v--------+      +--------v--------+
           |  Auth Service   |      |  Session Service|      |  API Service    |
           |  (Stateless)    |      |  (Stateless)    |      |  (Stateless)    |
           +--------+--------+      +--------+--------+      +--------+--------+
                    |                        |                        |
                    +------------------------+------------------------+
                                             |
                    +------------------------+------------------------+
                    |                        |                        |
           +--------v--------+      +--------v--------+      +--------v--------+
           |   PostgreSQL    |      |     Redis       |      | Event Store     |
           | (Primary Data)  |      | (Sessions/Cache)|      | (Audit Logs)    |
           +-----------------+      +-----------------+      +-----------------+

```

### Token Flow Architecture

```
+--------+                               +-------------+
|        |  1. Login Request             |             |
| Client +------------------------------>+  Auth API   |
|        |                               |             |
|        |  2. Access Token + Refresh    |             |
|        |<------------------------------+             |
|        |                               +------+------+
|        |                                      |
|        |  3. API Request + Access Token       |
|        +------------------------------------->+ API Gateway
|        |                                      |
|        |  4. Validate JWT (stateless)         |
|        |<-------------------------------------+
|        |                                      |
|        |  5. Token Expired                    |
|        |<-------------------------------------+
|        |                                      |
|        |  6. Refresh Token Request            |
|        +------------------------------------->+ Auth API
|        |                                      |
|        |  7. New Access Token                 |
|        |<-------------------------------------+
+--------+                               +-------------+
```

---

## Database Schema

### Entity Relationship Diagram

```
+------------------+       +------------------+       +------------------+
|      User        |       |   Organization   |       |  Subscription    |
+------------------+       +------------------+       +------------------+
| id (PK)          |       | id (PK)          |       | id (PK)          |
| email            |<----->| name             |<----->| organizationId   |
| passwordHash     |       | slug             |       | planId           |
| emailVerified    |       | ownerId (FK)     |       | status           |
| platformRole     |       | createdAt        |       | currentPeriodEnd |
| status           |       | settings         |       | stripeId         |
| createdAt        |       +------------------+       +------------------+
+------------------+              |
        |                         |
        v                         v
+------------------+       +------------------+
| OAuthConnection  |       | OrganizationMember|
+------------------+       +------------------+
| id (PK)          |       | id (PK)          |
| userId (FK)      |       | organizationId   |
| provider         |       | userId (FK)      |
| providerId       |       | role             |
| accessToken      |       | invitedBy        |
| refreshToken     |       | joinedAt         |
+------------------+       +------------------+

+------------------+       +------------------+       +------------------+
|     APIKey       |       |   RefreshToken   |       |   AuditLog       |
+------------------+       +------------------+       +------------------+
| id (PK)          |       | id (PK)          |       | id (PK)          |
| userId (FK)      |       | userId (FK)      |       | userId (FK)      |
| organizationId   |       | tokenHash        |       | action           |
| name             |       | deviceInfo       |       | resourceType     |
| keyHash          |       | ipAddress        |       | resourceId       |
| permissions      |       | expiresAt        |       | oldValue         |
| rateLimit        |       | revokedAt        |       | newValue         |
| lastUsedAt       |       | createdAt        |       | ipAddress        |
| expiresAt        |       +------------------+       | createdAt        |
+------------------+                                  +------------------+
```

---

## API Design

### Authentication Endpoints

#### POST /api/v1/auth/register
Create new user account with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false
  },
  "message": "Verification email sent"
}
```

#### POST /api/v1/auth/login
Authenticate with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "ref_xyz789...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "platformRole": "USER",
    "organizations": [
      {
        "id": "org_def456",
        "name": "My Team",
        "role": "OWNER"
      }
    ]
  }
}
```

#### POST /api/v1/auth/oauth/:provider
Initiate OAuth flow for provider (google, github, twitch).

**Response (302 Redirect):**
Redirects to OAuth provider authorization URL.

#### GET /api/v1/auth/oauth/:provider/callback
Handle OAuth callback.

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "ref_xyz789...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": { ... },
  "isNewUser": true
}
```

#### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refreshToken": "ref_xyz789..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

#### POST /api/v1/auth/logout
Invalidate refresh token.

**Request:**
```json
{
  "refreshToken": "ref_xyz789..."
}
```

**Response (204 No Content)**

#### POST /api/v1/auth/logout-all
Invalidate all refresh tokens for user.

**Response (204 No Content)**

#### POST /api/v1/auth/verify-email
Verify email with token.

**Request:**
```json
{
  "token": "verification_token_here"
}
```

#### POST /api/v1/auth/forgot-password
Request password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/v1/auth/reset-password
Reset password with token.

**Request:**
```json
{
  "token": "reset_token_here",
  "password": "NewSecurePassword123!"
}
```

### API Key Endpoints

#### GET /api/v1/api-keys
List user's API keys.

**Response (200 OK):**
```json
{
  "apiKeys": [
    {
      "id": "key_abc123",
      "name": "Production API",
      "prefix": "lsc_live_abc1",
      "permissions": ["sessions:read", "sessions:write"],
      "lastUsedAt": "2026-01-02T10:00:00Z",
      "expiresAt": "2027-01-03T00:00:00Z",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/api-keys
Create new API key.

**Request:**
```json
{
  "name": "Production API",
  "permissions": ["sessions:read", "sessions:write"],
  "expiresAt": "2027-01-03T00:00:00Z",
  "organizationId": "org_def456"
}
```

**Response (201 Created):**
```json
{
  "apiKey": {
    "id": "key_abc123",
    "name": "Production API",
    "key": "lsc_live_abc123xyz789...",
    "prefix": "lsc_live_abc1"
  },
  "message": "Store this key securely. It won't be shown again."
}
```

#### DELETE /api/v1/api-keys/:id
Revoke API key.

**Response (204 No Content)**

### Organization Endpoints

#### POST /api/v1/organizations
Create new organization.

**Request:**
```json
{
  "name": "My Production Team",
  "slug": "my-team"
}
```

#### GET /api/v1/organizations/:id/members
List organization members.

#### POST /api/v1/organizations/:id/members/invite
Invite user to organization.

**Request:**
```json
{
  "email": "teammate@example.com",
  "role": "MEMBER"
}
```

#### PATCH /api/v1/organizations/:id/members/:userId
Update member role.

**Request:**
```json
{
  "role": "ADMIN"
}
```

#### DELETE /api/v1/organizations/:id/members/:userId
Remove member from organization.

### Session Resource Authorization

#### GET /api/v1/sessions
List sessions user has access to.

**Query Parameters:**
- `organizationId` (optional): Filter by organization
- `page`, `limit`: Pagination
- `status`: Filter by status

#### POST /api/v1/sessions
Create new session.

**Request:**
```json
{
  "title": "Morning Stream",
  "workflow": "streamer",
  "organizationId": "org_def456"
}
```

---

## Security Implementation

### JWT Token Structure

#### Access Token Claims
```json
{
  "iss": "livestream-copilot",
  "sub": "usr_abc123",
  "aud": "livestream-copilot-api",
  "exp": 1704067200,
  "iat": 1704066300,
  "jti": "tok_unique_id",
  "type": "access",
  "email": "user@example.com",
  "platformRole": "USER",
  "organizations": [
    {
      "id": "org_def456",
      "role": "OWNER"
    }
  ],
  "subscription": {
    "tier": "PRO",
    "features": ["unlimited_sessions", "team_access", "api_access"]
  }
}
```

### Token Security Configuration

| Parameter | Access Token | Refresh Token |
|-----------|--------------|---------------|
| Algorithm | RS256 | RS256 |
| Expiry | 15 minutes | 7 days |
| Storage | Memory only | HttpOnly cookie + DB |
| Rotation | On refresh | On use (rotating) |

### Password Requirements

```typescript
const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfoInPassword: true,
  bcryptRounds: 12
};
```

### OAuth Provider Configuration

```typescript
const OAUTH_PROVIDERS = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    scopes: ['openid', 'email', 'profile'],
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    scopes: ['user:email', 'read:user'],
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user'
  },
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    scopes: ['user:read:email'],
    authorizationUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    userInfoUrl: 'https://api.twitch.tv/helix/users'
  }
};
```

### API Key Format

```
lsc_{environment}_{random_bytes}

Examples:
- lsc_live_a1b2c3d4e5f6g7h8i9j0...  (production)
- lsc_test_x9y8z7w6v5u4t3s2r1q0...  (test/development)
```

API keys are stored as SHA-256 hashes, with only the prefix stored in plaintext for identification.

---

## Authorization Model

### Permission Matrix

```
Resource: Session
+------------------+-------+-------+--------+--------+-------+
| Action           | OWNER | ADMIN | MEMBER | VIEWER | FREE  |
+------------------+-------+-------+--------+--------+-------+
| session:create   |   Y   |   Y   |   Y    |   N    |  Y*   |
| session:read     |   Y   |   Y   |   Y    |   Y    |  Y*   |
| session:update   |   Y   |   Y   |   Y*   |   N    |  Y*   |
| session:delete   |   Y   |   Y   |   N    |   N    |  Y*   |
| session:share    |   Y   |   Y   |   N    |   N    |   N   |
+------------------+-------+-------+--------+--------+-------+
* Only own resources

Resource: Organization
+------------------+-------+-------+--------+--------+
| Action           | OWNER | ADMIN | MEMBER | VIEWER |
+------------------+-------+-------+--------+--------+
| org:read         |   Y   |   Y   |   Y    |   Y    |
| org:update       |   Y   |   Y   |   N    |   N    |
| org:delete       |   Y   |   N   |   N    |   N    |
| org:invite       |   Y   |   Y   |   N    |   N    |
| org:remove       |   Y   |   Y*  |   N    |   N    |
| org:billing      |   Y   |   N   |   N    |   N    |
+------------------+-------+-------+--------+--------+
* Cannot remove OWNER or other ADMINs

Resource: API Keys
+------------------+-------+-------+--------+--------+
| Action           | OWNER | ADMIN | MEMBER | VIEWER |
+------------------+-------+-------+--------+--------+
| apikey:create    |   Y   |   Y   |   Y*   |   N    |
| apikey:read      |   Y   |   Y   |   Y*   |   N    |
| apikey:revoke    |   Y   |   Y   |   Y*   |   N    |
+------------------+-------+-------+--------+--------+
* Only own API keys
```

### Subscription Feature Flags

```typescript
const SUBSCRIPTION_FEATURES = {
  FREE: {
    maxSessions: 5,
    maxSessionDuration: 30, // minutes
    maxStorageMB: 500,
    maxTeamMembers: 0,
    features: ['basic_transcription', 'basic_outputs'],
    apiAccess: false,
    prioritySupport: false,
    customBranding: false
  },
  STARTER: {
    maxSessions: 50,
    maxSessionDuration: 120,
    maxStorageMB: 5000,
    maxTeamMembers: 0,
    features: ['basic_transcription', 'basic_outputs', 'export'],
    apiAccess: false,
    prioritySupport: false,
    customBranding: false
  },
  PRO: {
    maxSessions: -1, // unlimited
    maxSessionDuration: -1,
    maxStorageMB: 50000,
    maxTeamMembers: 5,
    features: ['*'],
    apiAccess: true,
    prioritySupport: true,
    customBranding: false
  },
  ENTERPRISE: {
    maxSessions: -1,
    maxSessionDuration: -1,
    maxStorageMB: -1,
    maxTeamMembers: -1,
    features: ['*'],
    apiAccess: true,
    prioritySupport: true,
    customBranding: true,
    sso: true,
    auditLogs: true
  }
};
```

---

## Subscription Integration

### Stripe Integration Flow

```
User selects plan
        |
        v
POST /api/v1/billing/checkout-session
        |
        v
Stripe Checkout (hosted page)
        |
        v
Stripe webhook: checkout.session.completed
        |
        v
Create/Update Subscription record
        |
        v
Update user's subscription tier
        |
        v
Webhook: invoice.payment_succeeded (recurring)
```

### Billing Endpoints

#### POST /api/v1/billing/checkout-session
Create Stripe checkout session.

**Request:**
```json
{
  "priceId": "price_xxx",
  "organizationId": "org_def456"
}
```

#### GET /api/v1/billing/portal
Get Stripe customer portal URL.

#### POST /api/v1/billing/usage
Report usage for billing (internal).

---

## Rate Limiting

### Rate Limit Configuration by Tier

```typescript
const RATE_LIMITS = {
  FREE: {
    api: {
      windowMs: 60000,      // 1 minute
      maxRequests: 60,      // 60 req/min
      maxBurst: 10
    },
    auth: {
      windowMs: 900000,     // 15 minutes
      maxAttempts: 5,       // 5 login attempts
      blockDuration: 900000 // 15 min block
    }
  },
  STARTER: {
    api: {
      windowMs: 60000,
      maxRequests: 300,
      maxBurst: 50
    },
    auth: {
      windowMs: 900000,
      maxAttempts: 10,
      blockDuration: 600000
    }
  },
  PRO: {
    api: {
      windowMs: 60000,
      maxRequests: 1000,
      maxBurst: 100
    },
    auth: {
      windowMs: 900000,
      maxAttempts: 20,
      blockDuration: 300000
    }
  },
  ENTERPRISE: {
    api: {
      windowMs: 60000,
      maxRequests: 5000,
      maxBurst: 500
    },
    auth: {
      windowMs: 900000,
      maxAttempts: 50,
      blockDuration: 180000
    }
  }
};
```

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067260
Retry-After: 60 (when rate limited)
```

---

## Audit Logging

### Audited Actions

```typescript
const AUDITED_ACTIONS = [
  // Authentication
  'auth.login.success',
  'auth.login.failed',
  'auth.logout',
  'auth.password.changed',
  'auth.password.reset',
  'auth.mfa.enabled',
  'auth.mfa.disabled',

  // Organization
  'org.created',
  'org.updated',
  'org.deleted',
  'org.member.invited',
  'org.member.joined',
  'org.member.role_changed',
  'org.member.removed',

  // API Keys
  'apikey.created',
  'apikey.revoked',

  // Billing
  'billing.subscription.created',
  'billing.subscription.updated',
  'billing.subscription.cancelled',
  'billing.payment.succeeded',
  'billing.payment.failed',

  // Admin Actions
  'admin.user.suspended',
  'admin.user.unsuspended',
  'admin.user.deleted',
  'admin.org.suspended'
];
```

### Audit Log Entry Structure

```json
{
  "id": "audit_abc123",
  "timestamp": "2026-01-03T10:00:00.000Z",
  "action": "org.member.role_changed",
  "actorId": "usr_abc123",
  "actorEmail": "admin@example.com",
  "actorIp": "192.168.1.1",
  "actorUserAgent": "Mozilla/5.0...",
  "resourceType": "OrganizationMember",
  "resourceId": "mem_xyz789",
  "organizationId": "org_def456",
  "metadata": {
    "targetUserId": "usr_xyz789",
    "previousRole": "MEMBER",
    "newRole": "ADMIN"
  },
  "requestId": "req_unique_id"
}
```

---

## Implementation Checklist

### Phase 1: Core Authentication
- [ ] User registration with email verification
- [ ] Email/password login
- [ ] JWT access/refresh token system
- [ ] Password reset flow
- [ ] Basic session management

### Phase 2: OAuth Integration
- [ ] Google OAuth
- [ ] GitHub OAuth
- [ ] Twitch OAuth
- [ ] OAuth account linking

### Phase 3: Organization & Teams
- [ ] Organization CRUD
- [ ] Member invitation system
- [ ] Role management
- [ ] Organization-scoped resources

### Phase 4: API Keys
- [ ] API key generation
- [ ] Permission scoping
- [ ] Rate limiting per key
- [ ] Key rotation

### Phase 5: Subscription Integration
- [ ] Stripe checkout integration
- [ ] Webhook handlers
- [ ] Feature flag enforcement
- [ ] Usage tracking

### Phase 6: Security Hardening
- [ ] Rate limiting implementation
- [ ] Audit logging system
- [ ] Security headers
- [ ] CORS configuration
- [ ] Input validation

---

## Security Best Practices Summary

1. **Never store plaintext passwords** - Use bcrypt with cost factor 12+
2. **Never store plaintext API keys** - Store SHA-256 hashes only
3. **Use short-lived access tokens** - 15 minutes maximum
4. **Implement refresh token rotation** - Invalidate old token on use
5. **Store refresh tokens as HttpOnly cookies** - Prevent XSS access
6. **Validate all inputs** - Use Zod schemas for all endpoints
7. **Use parameterized queries** - Prisma handles this automatically
8. **Implement rate limiting** - Protect against brute force
9. **Log security events** - Maintain audit trail
10. **Use secure headers** - HSTS, CSP, X-Frame-Options
11. **Validate OAuth state** - Prevent CSRF in OAuth flows
12. **Encrypt sensitive data at rest** - OAuth tokens, PII
13. **Use secure session configuration** - SameSite, Secure flags
14. **Implement account lockout** - After failed login attempts
15. **Require email verification** - Before granting full access
