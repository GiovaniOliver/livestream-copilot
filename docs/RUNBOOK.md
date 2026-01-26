# Operations Runbook

This document covers deployment procedures, monitoring, common issues, and rollback procedures for FluxBoard.

## Deployment

### Prerequisites

- Node.js 18+ on production server
- PostgreSQL database (Prisma Postgres recommended)
- SSL certificates for HTTPS
- ffmpeg installed for media processing

### Environment Setup

1. **Configure production environment**

```bash
cp .env.sample .env
# Configure all REQUIRED variables for production
```

2. **Required production variables**

| Variable | Notes |
|----------|-------|
| `NODE_ENV` | Set to `production` |
| `DATABASE_URL` | Production PostgreSQL connection |
| `JWT_SECRET` | Generate with `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Generate with `openssl rand -base64 64` |
| `ANTHROPIC_API_KEY` | Production API key |
| `STRIPE_*` | Production Stripe keys |
| `LOG_FORMAT` | Set to `json` for log aggregation |

### Desktop Companion Deployment

```bash
cd apps/desktop-companion

# Install dependencies
npm install --production

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:deploy

# Build TypeScript
npm run build

# Start production server
npm run start
```

### Web App Deployment

```bash
cd apps/web

# Install dependencies
npm install

# Build production bundle
npm run build

# Start production server
npm run start
```

For Vercel deployment:
```bash
vercel --prod
```

### Mobile App Deployment

```bash
cd apps/mobile

# Build for production
npx expo build:android  # Android APK/AAB
npx expo build:ios      # iOS IPA
```

## Monitoring

### Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic health check |
| `GET /api/status` | Detailed status with dependencies |

### Log Levels

| Level | When to use |
|-------|-------------|
| `error` | Application errors requiring attention |
| `warn` | Potential issues, degraded performance |
| `info` | Normal operations (default) |
| `debug` | Detailed debugging information |
| `trace` | Very detailed tracing |

### Key Metrics

- **API Response Time**: Target < 200ms for most endpoints
- **WebSocket Connections**: Monitor active connections
- **OBS Connection Status**: Ensure stable connection
- **Database Query Time**: Target < 100ms
- **AI Response Time**: Varies by model and prompt length

### Observability (Opik)

Configure Opik for LLM tracing:

```bash
OPIK_WORKSPACE_NAME=your-workspace
OPIK_PROJECT_NAME=fluxboard-production
OPIK_API_KEY=your-api-key
```

View traces at: https://app.comet.com/opik

## Common Issues and Fixes

### Issue: OBS Connection Failed

**Symptoms**: Desktop companion cannot connect to OBS

**Diagnosis**:
```bash
# Check OBS WebSocket status
curl http://localhost:3123/api/obs/status
```

**Resolution**:
1. Verify OBS is running
2. Enable WebSocket server in OBS: Tools > WebSocket Server Settings
3. Check `OBS_WS_URL` and `OBS_WS_PASSWORD` in environment
4. Verify firewall allows port 4455

### Issue: Database Connection Timeout

**Symptoms**: API returns 503, database errors in logs

**Diagnosis**:
```bash
# Check database connectivity
npm run db:studio  # Should open Prisma Studio
```

**Resolution**:
1. Verify `DATABASE_URL` is correct
2. Check database server is running
3. Verify network connectivity to database
4. Check connection pool limits (`connection_limit` in URL)

### Issue: AI Agent Timeout

**Symptoms**: Agent requests timeout after 30s

**Diagnosis**:
- Check `ANTHROPIC_API_KEY` is valid
- Verify API quota is not exceeded

**Resolution**:
1. Verify API key at https://console.anthropic.com/
2. Check usage limits and billing
3. Consider reducing `AI_MAX_TOKENS` for faster responses

### Issue: WebSocket Disconnections

**Symptoms**: Mobile app loses connection frequently

**Diagnosis**:
- Check server logs for connection errors
- Monitor network stability

**Resolution**:
1. Implement reconnection logic in client
2. Check `CORS_ORIGINS` includes mobile app origin
3. Verify proxy/load balancer WebSocket support

### Issue: Replay Buffer Not Saving

**Symptoms**: Clip creation fails, no files in SESSION_DIR

**Diagnosis**:
```bash
# Check OBS replay buffer status
# In OBS: View > Replay Buffer
```

**Resolution**:
1. Enable Replay Buffer in OBS settings
2. Verify `REPLAY_BUFFER_SECONDS` matches OBS config
3. Check disk space on OBS machine
4. Verify `SESSION_DIR` is writable

### Issue: STT Transcription Failing

**Symptoms**: No transcript segments appearing

**Resolution**:
1. Verify `STT_PROVIDER` API key is set
2. Check audio input is being captured
3. Verify microphone permissions

## Rollback Procedures

### Application Rollback

```bash
# If using git-based deployment
git checkout <previous-version-tag>
npm run build
npm run start

# If using Docker
docker pull fluxboard:previous-version
docker-compose up -d
```

### Database Rollback

**WARNING**: Database rollbacks can cause data loss. Always backup first.

```bash
# Backup current state
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Rollback last migration
cd apps/desktop-companion
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
psql $DATABASE_URL < backup-YYYYMMDD.sql
```

### Configuration Rollback

```bash
# Restore previous environment
cp .env.backup .env

# Restart services
npm run start
```

## Emergency Procedures

### Complete Service Outage

1. Check infrastructure (servers, network, DNS)
2. Review recent deployments for changes
3. Check external dependencies (database, APIs)
4. Roll back to last known working version
5. Notify stakeholders

### Security Incident

1. Immediately revoke compromised API keys
2. Rotate secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`)
3. Review access logs
4. Force logout all users (invalidate refresh tokens)
5. Generate new keys at respective provider dashboards

### Data Recovery

```bash
# List available backups
ls -la backups/

# Restore from backup
psql $DATABASE_URL < backups/backup-YYYYMMDD.sql

# Verify data integrity
npm run db:studio
```

## Maintenance Windows

### Recommended Maintenance Schedule

- **Database maintenance**: Weekly during low-traffic hours
- **Dependency updates**: Bi-weekly in staging, monthly in production
- **Log rotation**: Daily, retain 30 days
- **Backup verification**: Monthly restore test

### Pre-Maintenance Checklist

- [ ] Notify users of maintenance window
- [ ] Create database backup
- [ ] Export current configuration
- [ ] Prepare rollback plan
- [ ] Test in staging environment

### Post-Maintenance Checklist

- [ ] Verify all services are running
- [ ] Run health checks
- [ ] Test critical user flows
- [ ] Monitor error rates for 30 minutes
- [ ] Update maintenance log
