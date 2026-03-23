# Livestream Copilot Documentation

Welcome to the Livestream Copilot (FluxBoard) documentation. This directory contains all project documentation organized by category.

## Documentation Structure

### [Setup](./setup/)
Getting started - installation, configuration, and first-time setup.

- **[START_HERE.md](./setup/START_HERE.md)** - Begin here if you're new to the project
- **[QUICK_START_GUIDE.md](./setup/QUICK_START_GUIDE.md)** - Quick setup for experienced developers
- **[STARTUP_GUIDE.md](./setup/STARTUP_GUIDE.md)** - Comprehensive startup procedures
- **[STARTUP_INSTRUCTIONS.md](./setup/STARTUP_INSTRUCTIONS.md)** - Detailed startup instructions
- **[ENV_FIX_INSTRUCTIONS.md](./setup/ENV_FIX_INSTRUCTIONS.md)** - Environment configuration troubleshooting

### [Architecture](./architecture/)
System architecture, design decisions, and technical specifications.

- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - Overall system architecture
- **[AGENTIC_SYSTEM.md](./architecture/AGENTIC_SYSTEM.md)** - Complete AI agent system reference (agents, workflows, SDK, deployment)
- **[auth-system-design.md](./architecture/auth-system-design.md)** - Authentication system design
- **[WEB_DASHBOARD_INTEGRATION_PLAN.md](./architecture/WEB_DASHBOARD_INTEGRATION_PLAN.md)** - Dashboard integration plan

### [Workflows](./workflows/)
Workflow definitions, agent actions, and automation processes.

- **[WORKFLOWS.md](./workflows/WORKFLOWS.md)** - System workflows overview
- **[FIRST_SUPPORTED_WORKFLOW.md](./workflows/FIRST_SUPPORTED_WORKFLOW.md)** - MVP-first workflow, capture mode, and output contract
- **[FIRST_SUPPORTED_WORKFLOW_RUNBOOK.md](./workflows/FIRST_SUPPORTED_WORKFLOW_RUNBOOK.md)** - Canonical local demo runbook and checklist for the first supported `streamer` + `av` path
- **[ai-agent-actions.md](./workflows/ai-agent-actions.md)** - AI agent action definitions (70+ actions spec)

### [API](./api/)
API specifications, schemas, and observability documentation.

- **[EVENT_SCHEMAS.md](./api/EVENT_SCHEMAS.md)** - Event schema definitions
- **[OBSERVABILITY.md](./api/OBSERVABILITY.md)** - Observability and monitoring (Comet Opik)
- **[UI_DASHBOARDS.md](./api/UI_DASHBOARDS.md)** - Dashboard API documentation

### [Features](./features/)
Detailed documentation for major features and system components.

- **[REGENERATE_API_IMPLEMENTATION.md](./features/REGENERATE_API_IMPLEMENTATION.md)** - Content regeneration API (SOC-405)
- **[EXPORT_SYSTEM_SUMMARY.md](./features/EXPORT_SYSTEM_SUMMARY.md)** - Recording export system overview
- **[EXPORT_INTEGRATION_GUIDE.md](./features/EXPORT_INTEGRATION_GUIDE.md)** - Export system integration guide
- **[visual-triggers/IMPLEMENTATION.md](./features/visual-triggers/IMPLEMENTATION.md)** - Visual triggers implementation

### [Guides](./guides/)
How-to guides, runbooks, and contribution guidelines.

- **[RUNBOOK.md](./guides/RUNBOOK.md)** - Operational runbook for production
- **[EXPORT_QUICKSTART.md](./guides/EXPORT_QUICKSTART.md)** - Quick guide to export functionality
- **[STREAMING_PIPELINE.md](./guides/STREAMING_PIPELINE.md)** - Live preview + clip pipeline (Content Creator)
- **[CONTRIB.md](./guides/CONTRIB.md)** - Contribution guidelines for developers

### [Apps](./apps/)
App-specific documentation for each application in the monorepo.

#### [Desktop Companion](./apps/desktop-companion/)
Backend API and desktop application documentation.

- **[HIBP_INTEGRATION.md](./apps/desktop-companion/HIBP_INTEGRATION.md)** - Have I Been Pwned integration
- **[PASSWORD_RESET.md](./apps/desktop-companion/PASSWORD_RESET.md)** - Password reset functionality
- **[PASSWORD_RESET_CHECKLIST.md](./apps/desktop-companion/PASSWORD_RESET_CHECKLIST.md)** - Password reset checklist
- **[RATE_LIMITING_QUICK_REFERENCE.md](./apps/desktop-companion/RATE_LIMITING_QUICK_REFERENCE.md)** - Rate limiting guide
- **[rate-limiting-examples.md](./apps/desktop-companion/rate-limiting-examples.md)** - Rate limiting code examples
- **[SECURITY_REVIEW_SOC-397.md](./apps/desktop-companion/SECURITY_REVIEW_SOC-397.md)** - Security review for SOC-397
- **[IMPLEMENTATION_SUMMARY_SOC-397.md](./apps/desktop-companion/IMPLEMENTATION_SUMMARY_SOC-397.md)** - SOC-397 implementation
- **[SOC-398_IMPLEMENTATION.md](./apps/desktop-companion/SOC-398_IMPLEMENTATION.md)** - SOC-398 implementation
- **[SOC-401_IMPLEMENTATION_SUMMARY.md](./apps/desktop-companion/SOC-401_IMPLEMENTATION_SUMMARY.md)** - SOC-401 implementation

#### [Web App](./apps/web/)
Next.js web dashboard documentation.

- **[AUTH_README.md](./apps/web/AUTH_README.md)** - Authentication overview
- **[AUTH_QUICKSTART.md](./apps/web/AUTH_QUICKSTART.md)** - Auth quick start guide
- **[AUTH_IMPLEMENTATION_SUMMARY.md](./apps/web/AUTH_IMPLEMENTATION_SUMMARY.md)** - Authentication implementation
- **[CENTRALIZED_CONFIG_SUMMARY.md](./apps/web/CENTRALIZED_CONFIG_SUMMARY.md)** - Centralized configuration system
- **[CONFIG_USAGE.md](./apps/web/CONFIG_USAGE.md)** - Configuration usage guide
- **[MIGRATION_STATUS.md](./apps/web/MIGRATION_STATUS.md)** - Migration status and progress

## Quick Navigation

### I want to...

- **Get started with the project** -> [Setup / START_HERE.md](./setup/START_HERE.md)
- **Understand the system architecture** -> [Architecture / ARCHITECTURE.md](./architecture/ARCHITECTURE.md)
- **Understand the AI agent system** -> [Architecture / AGENTIC_SYSTEM.md](./architecture/AGENTIC_SYSTEM.md)
- **See the current MVP workflow contract** -> [Workflows / FIRST_SUPPORTED_WORKFLOW.md](./workflows/FIRST_SUPPORTED_WORKFLOW.md)
- **Run the current MVP demo path** -> [Workflows / FIRST_SUPPORTED_WORKFLOW_RUNBOOK.md](./workflows/FIRST_SUPPORTED_WORKFLOW_RUNBOOK.md)
- **Learn about a specific feature** -> [Features](./features/)
- **Contribute to the project** -> [Guides / CONTRIB.md](./guides/CONTRIB.md)
- **Deploy to production** -> [Guides / RUNBOOK.md](./guides/RUNBOOK.md)
- **Understand API schemas** -> [API / EVENT_SCHEMAS.md](./api/EVENT_SCHEMAS.md)
- **Configure AI workflows** -> [Workflows / ai-agent-actions.md](./workflows/ai-agent-actions.md)

## Cleanup Log (2026-02-08)

Removed stale development session reports that were point-in-time snapshots from January 2026:

- `development/SESSION_SUMMARY.md` (2026-01-13 session report)
- `development/FINAL_SESSION_REPORT.md` (2026-01-13 session report)
- `development/CURRENT_STATUS_REPORT.md` (2026-01-14 status snapshot)
- `development/DEVELOPMENT_STATUS_SUMMARY.md` (2026-01-21 status snapshot)
- `development/TASK_CHECKLIST.md` (2026-01-21 task list)
- `DELETION_LOG.md` (2026-02-06 cleanup log, actions completed)

These were one-time session artifacts, not living documentation. Their useful content (architecture diagrams, agent system overview) has been consolidated into [AGENTIC_SYSTEM.md](./architecture/AGENTIC_SYSTEM.md).

---

**Last Updated**: 2026-03-19
