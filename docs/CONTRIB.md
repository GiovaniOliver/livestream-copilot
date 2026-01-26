# Contributing Guide

This document describes the development workflow, available scripts, and environment setup for FluxBoard.

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- OBS Studio with WebSocket enabled (for desktop-companion)
- PostgreSQL database (local or cloud)
- Expo CLI (for mobile development)

## Repository Structure

```
livestream-copilot/
├── apps/
│   ├── desktop-companion/   # Node.js backend service
│   ├── web/                 # Next.js web application
│   └── mobile/              # Expo React Native app
├── packages/
│   └── shared/              # Shared types and schemas
└── docs/                    # Documentation
```

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd livestream-copilot
npm run install:all
```

### 2. Configure Environment

Copy the sample environment file and configure:

```bash
cp .env.sample .env
# Edit .env with your values
```

For app-specific configuration, see `apps/desktop-companion/.env.sample`.

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

## Available Scripts

### Root Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all services concurrently (API, Web, Mobile) |
| `npm run dev:api` | Start desktop-companion in watch mode |
| `npm run dev:web` | Start Next.js web app in dev mode |
| `npm run dev:mobile` | Start Expo mobile app |
| `npm run dev:api-only` | Start API in isolation |
| `npm run dev:web-only` | Start web in isolation |
| `npm run install:all` | Install dependencies and generate Prisma client |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |

### Desktop Companion Scripts (`apps/desktop-companion`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start in watch mode with tsx |
| `npm run start` | Start production build |
| `npm run build` | Build TypeScript to dist/ |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Create and run migration |
| `npm run db:migrate:deploy` | Deploy migrations (production) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database with initial data |

### Web Scripts (`apps/web`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

### Mobile Scripts (`apps/mobile`)

| Script | Description |
|--------|-------------|
| `npm run start` | Start Expo (default) |
| `npm run dev` | Start Expo with LAN mode |
| `npm run android` | Start on Android emulator/device |
| `npm run ios` | Start on iOS simulator/device |
| `npm run web` | Start in web browser |

## Development Workflow

### Starting Development

```bash
# Option 1: Start all services
npm run dev

# Option 2: Start services individually
npm run dev:api    # Terminal 1
npm run dev:web    # Terminal 2
npm run dev:mobile # Terminal 3
```

### Default Ports

| Service | Port |
|---------|------|
| Desktop Companion HTTP | 3123 |
| Desktop Companion WebSocket | 3124 |
| Web App | 3000 |
| OBS WebSocket | 4455 |

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional components in React

### Testing

```bash
# Run type checking
cd apps/web && npm run type-check

# Run linting
cd apps/web && npm run lint
```

## Environment Variables Reference

See `.env.sample` at the project root for a complete list of environment variables with descriptions.

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `ANTHROPIC_API_KEY` | API key for Claude AI |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `HTTP_PORT` | 3123 | Desktop companion HTTP port |
| `WS_PORT` | 3124 | Desktop companion WebSocket port |
| `OBS_WS_URL` | ws://127.0.0.1:4455 | OBS WebSocket URL |
| `AI_PROVIDER` | anthropic | AI provider (anthropic/openai) |
| `STT_PROVIDER` | deepgram | Speech-to-text provider |
| `LOG_LEVEL` | info | Logging verbosity |

## Troubleshooting

### OBS Connection Issues

1. Ensure OBS is running with WebSocket server enabled
2. Check `OBS_WS_URL` matches your OBS settings
3. Verify `OBS_WS_PASSWORD` if authentication is enabled

### Database Issues

```bash
# Reset and regenerate Prisma client
npm run db:generate

# Force push schema (development only)
cd apps/desktop-companion && npm run db:push
```

### Mobile App Issues

```bash
# Clear Expo cache
cd apps/mobile && npx expo start --clear
```

## Pull Request Guidelines

1. Create feature branch from `main`
2. Follow conventional commits format
3. Include tests for new features
4. Update documentation as needed
5. Request review from maintainers
