# FluxBoard Agentic System - Complete Reference

**Last Updated**: 2026-02-08

This document is the single source of truth for how the AI agent system works in FluxBoard Livestream Copilot. It covers every agent, every file, and how the two layers (runtime backend + Claude Code automation) fit together.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Two-Layer Design](#two-layer-design)
3. [Layer 1: Backend Runtime Agents](#layer-1-backend-runtime-agents)
   - [Core Infrastructure](#core-infrastructure)
   - [Workflow Agents](#workflow-agents)
   - [Validation Subsystem](#validation-subsystem)
4. [Layer 2: Claude Code Automation](#layer-2-claude-code-automation)
   - [Subagents](#subagents)
   - [Skills](#skills)
   - [Commands](#commands)
   - [Hooks](#hooks)
5. [How Events Flow Through the System](#how-events-flow-through-the-system)
6. [Anthropic SDK vs Claude Code vs Agent SDK](#anthropic-sdk-vs-claude-code-vs-agent-sdk)
7. [Deployment Considerations](#deployment-considerations)
8. [File Index](#file-index)

---

## Architecture Overview

FluxBoard's agentic system is designed around **5 workflow types**, each with a specialized AI agent that listens to live session events and generates structured outputs in real time.

```
Live Session (OBS + Microphone)
      |
      v
  Events: TRANSCRIPT_SEGMENT, MOMENT_MARKER, ARTIFACT_CLIP_CREATED
      |
      v
  AgentRouter (dispatches to the correct workflow agent)
      |
      +---> StreamerAgent    (social posts, clip titles, chapter markers, quotes)
      +---> PodcastAgent     (episode metadata, chapters, quotes, action items)
      +---> DebateAgent      (claims, evidence cards, quotes, moderator prompts)
      +---> BrainstormAgent  (idea nodes, action items, eureka moments)
      +---> WritersRoomAgent (story beats, script inserts, dialogue ideas)
      |
      v
  OutputValidator (brand voice, content policy, platform limits)
      |
      v
  Database (persisted as drafts) --> WebSocket Broadcast --> Dashboards
```

### The 5 Workflows

| Workflow | Agent | Output Categories | Use Case |
|----------|-------|-------------------|----------|
| `streamer` | StreamerAgent | `SOCIAL_POST`, `CLIP_TITLE`, `CHAPTER_MARKER`, `QUOTE` | Live streaming on Twitch/YouTube |
| `podcast` | PodcastAgent | `EPISODE_META`, `CHAPTER_MARKER`, `QUOTE`, `ACTION_ITEM`, `CLIP_TITLE` | Podcast recording sessions |
| `debate` | DebateAgent | `CLAIM`, `EVIDENCE_CARD`, `QUOTE`, `MODERATOR_PROMPT` | Live debates and discussions |
| `brainstorm` | BrainstormAgent | `IDEA_NODE`, `ACTION_ITEM`, `QUOTE` | Creative brainstorming sessions |
| `writers_room` | WritersRoomAgent | `BEAT`, `SCRIPT_INSERT`, `QUOTE`, `ACTION_ITEM` | Screenwriting and story planning |

---

## Two-Layer Design

The agentic system operates at **two distinct layers** that serve different purposes:

### Layer 1: Backend Runtime Agents (Production)

**Location**: [`apps/desktop-companion/src/agents/`](../../apps/desktop-companion/src/agents/)

These are **TypeScript classes** that run inside the Node.js desktop-companion server at runtime. They use the **Anthropic SDK** (`@anthropic-ai/sdk`) to call Claude's API directly. When a user starts a livestream session, these agents process events in real time and generate content.

**This layer is what runs in production when the app is deployed.**

### Layer 2: Claude Code Automation (Development/Operations)

**Location**: [`.claude/`](../../.claude/)

These are **markdown definition files** that tell Claude Code (the CLI tool) how to behave during development and operator sessions. They define subagent roles, reusable skills, slash commands, and lifecycle hooks.

**This layer is for the developer/operator using Claude Code locally.** It does NOT run in production.

### Key Distinction

| Aspect | Layer 1 (Runtime) | Layer 2 (Claude Code) |
|--------|-------------------|----------------------|
| **Runs when** | App is deployed and users are live | Developer is using Claude Code CLI |
| **Technology** | TypeScript + Anthropic SDK | Markdown definitions for Claude Code |
| **Where** | Server (localhost:3123 or cloud) | Local developer machine |
| **Purpose** | Generate AI content from live events | Assist development and operations |
| **Users** | End users via dashboards | Developers and operators |

---

## Layer 1: Backend Runtime Agents

### Core Infrastructure

These 6 files form the backbone that all workflow agents depend on.

---

#### [`types.ts`](../../apps/desktop-companion/src/agents/types.ts)

**The type foundation for the entire agent system.**

Defines all TypeScript interfaces and types:

- **`WorkflowType`** - Union of the 5 workflow strings: `"streamer" | "writers_room" | "brainstorm" | "debate" | "podcast"`
- **`OutputCategory`** - The 11 possible output types agents can produce: `SOCIAL_POST`, `CLIP_TITLE`, `BEAT`, `SCRIPT_INSERT`, `CLAIM`, `EVIDENCE_CARD`, `CHAPTER_MARKER`, `QUOTE`, `ACTION_ITEM`, `EPISODE_META`, `MODERATOR_PROMPT`, `IDEA_NODE`
- **`Agent` interface** - The contract all agents must implement:
  - `name`: string identifier for logging
  - `workflow`: which workflow this agent handles
  - `triggerEvents`: which event types this agent responds to
  - `process(event, context)`: main processing method
  - `shouldProcess(event, context)`: gate to check before processing
- **`AgentContext`** - Session info passed to agents: `sessionId`, `dbSessionId`, `workflow`, `title`, `participants`, `startedAt`, `recentTranscript`, `recentEvents`
- **`AgentOutput`** - Structured output: `category`, `title`, `text`, `refs`, `meta`
- **`AgentResult`** - Processing result: `success`, `outputs[]`, `error`, `durationMs`, `usage`
- **`AgentConfig`** - Config options: `model`, `maxTokens`, `temperature`, `systemPrompt`
- **`CompletionRequest` / `CompletionResponse`** - AI API abstraction types
- **`AIProvider`** - `"anthropic" | "openai"` (only Anthropic is implemented)

---

#### [`client.ts`](../../apps/desktop-companion/src/agents/client.ts)

**The AI provider abstraction layer. This is where the Anthropic SDK is used.**

- Creates a singleton `Anthropic` client using `@anthropic-ai/sdk` (version ^0.30.0)
- Requires `ANTHROPIC_API_KEY` environment variable
- **`complete(request)`** - The function all agents call to get AI responses. Takes messages, model, maxTokens, temperature, systemPrompt. Returns content text + token usage.
- **`isAIConfigured()`** - Checks if API keys are present
- **`getDefaultModel()` / `getDefaultMaxTokens()`** - Returns config defaults
- Integrates Comet Opik tracing on every AI call for observability
- Has a provider switch (`anthropic` active, `openai` stubbed for future)

**This is NOT the Anthropic Agent SDK.** It uses the standard Anthropic SDK (`@anthropic-ai/sdk`) which provides chat completions. See the [SDK explanation section](#anthropic-sdk-vs-claude-code-vs-agent-sdk) for details.

---

#### [`base.ts`](../../apps/desktop-companion/src/agents/base.ts)

**The abstract base class all workflow agents extend.**

`BaseAgent` implements the `Agent` interface with shared logic:

- **`shouldProcess(event, context)`** - Default gate: checks if the event type is in `triggerEvents` AND the context workflow matches the agent's workflow
- **`process(event, context)`** - Wraps `generateOutputs()` with:
  - Timing measurement (`durationMs`)
  - Structured logging via pino
  - Opik tracing (creates a trace span per agent invocation)
  - Error handling (catches and returns `AgentResult` with error)
- **`generateOutputs(event, context)`** - Virtual method subclasses override. Default implementation handles `TRANSCRIPT_SEGMENT` events.
- **`processTranscript(event, context)`** - Default transcript handler:
  1. Builds context from rolling transcript + current event
  2. Skips segments < 50 characters
  3. Gets workflow-specific system prompt and valid categories
  4. Calls `complete()` for AI generation
  5. Parses JSON response into `AgentOutput[]`
- **`buildTranscriptContext(currentEvent, context)`** - Merges `context.recentTranscript` with current event payload
- **`parseOutputs(content, validCategories)`** - Extracts JSON from AI responses (handles markdown code blocks), validates categories, returns structured outputs
- **`createSimpleAgent(workflow, config)`** - Factory function to create a basic agent without custom logic

---

#### [`router.ts`](../../apps/desktop-companion/src/agents/router.ts)

**The event dispatcher that connects events to agents.**

`AgentRouter` is the orchestrator:

- Maintains a `Map<WorkflowType, Agent[]>` registry of all agents
- Maintains per-session **transcript buffers** (last 10 segments) and **event buffers**
- **`initialize()`** - Checks if AI is configured, enables/disables routing
- **`registerAgent(agent)`** - Adds an agent to the registry for its workflow
- **`routeEvent(event, context)`** - The main dispatch method:
  1. Updates transcript and event buffers
  2. Checks minimum content threshold (100 characters)
  3. Iterates through matching agents, calls `agent.shouldProcess()` then `agent.process()`
  4. Validates outputs via `OutputValidator`
  5. Persists valid outputs to database via `OutputService.createOutput()`
  6. Tags outputs with validation status: `passed`, `failed`, `fixed`, or `skipped`
  7. Clears transcript buffer after successful generation
- **`clearSession(sessionId)`** - Cleans up buffers when session ends
- **`getStats()`** - Returns router metrics (enabled, workflow count, agent count, active sessions)
- Exports a global singleton: `agentRouter`

---

#### [`prompts.ts`](../../apps/desktop-companion/src/agents/prompts.ts)

**All system prompts and user prompt templates.**

- **`getBaseSystemPrompt(context)`** - Shared context: session title, participants, start time
- **5 workflow-specific system prompts**, each with tailored tone and output category guidance:
  - `getStreamerSystemPrompt()` - Engaging, shareable, streaming culture
  - `getPodcastSystemPrompt()` - Professional, episode metadata, show notes
  - `getWritersRoomSystemPrompt()` - Creative, story-focused, screenplay format
  - `getDebateSystemPrompt()` - Claims, evidence, balanced moderation
  - `getBrainstormSystemPrompt()` - All ideas welcome, connections, next steps
- **`getSystemPrompt(context)`** - Dispatcher that picks the right prompt based on `context.workflow`
- **`getWorkflowOutputCategories(workflow)`** - Returns the valid output categories per workflow
- **`getTranscriptAnalysisPrompt(transcript, categories)`** - User-side prompt with JSON output format specification
- **`getMomentDetectionPrompt(transcript)`** - User-side prompt for clip-worthiness scoring (0.0-1.0 scale)

---

#### [`index.ts`](../../apps/desktop-companion/src/agents/index.ts)

**Barrel export file.** Re-exports everything so consumers can do:
```typescript
import { StreamerAgent, agentRouter, complete } from "./agents";
```

---

### Workflow Agents

Each agent extends `BaseAgent` and adds specialized logic for its workflow type.

---

#### [`workflows/streamer.agent.ts`](../../apps/desktop-companion/src/agents/workflows/streamer.agent.ts) - StreamerAgent

**Purpose**: Live streaming content generation for Twitch/YouTube streamers.

| Property | Value |
|----------|-------|
| Name | `streamer-agent` |
| Workflow | `streamer` |
| Trigger Events | `TRANSCRIPT_SEGMENT`, `MOMENT_MARKER`, `ARTIFACT_CLIP_CREATED` |
| Output Categories | `SOCIAL_POST`, `CLIP_TITLE`, `CHAPTER_MARKER`, `QUOTE` |

**How it works**:

1. **Transcript segments** are scored for clip-worthiness via `detectMoments()` (0-1 scale)
2. When `clipWorthiness >= 0.6`, generates:
   - Social posts (280 char max, Twitter-style, streaming culture tone)
   - Chapter markers for VOD timestamps
3. Always runs `extractQuotes()` to pull funny/memorable quotes
4. **Moment markers** (manually tagged by operator) get immediate social posts + chapter markers
5. **Clip created events** trigger clip title generation (100 char max, clickable) + promotional social posts

**Key methods**:
- `detectMoments(transcript)` - AI call to score clip-worthiness
- `generateSocialPost(transcript, moments)` - Creates viral social posts
- `generateClipTitle(context)` - Creates clickable clip titles
- `extractQuotes(transcript, context)` - Pulls memorable quotes

---

#### [`workflows/podcast.agent.ts`](../../apps/desktop-companion/src/agents/workflows/podcast.agent.ts) - PodcastAgent

**Purpose**: Podcast recording assistant for chapters, quotes, and episode packaging.

| Property | Value |
|----------|-------|
| Name | `podcast-agent` |
| Workflow | `podcast` |
| Trigger Events | `TRANSCRIPT_SEGMENT`, `MOMENT_MARKER`, `ARTIFACT_CLIP_CREATED` |
| Output Categories | `EPISODE_META`, `CHAPTER_MARKER`, `QUOTE`, `ACTION_ITEM`, `CLIP_TITLE` |

**Stateful**: Maintains `topicsDiscussed[]` and `keyPoints[]` across the session.

**How it works**:

1. **Transcript segments** are analyzed via `analyzeContent()` which detects:
   - Topic shifts (become chapter markers)
   - Action items/follow-ups mentioned
   - Notable quotes with speaker attribution
   - Key insights for episode summary
2. **Moment markers** become manual chapter markers
3. **Clip events** get professional podcast clip titles
4. **Session end** triggers `generateEpisodeMeta()` - creates title, description, and tags

**Key methods**:
- `analyzeContent(transcript, context)` - Single AI call that extracts topics, actions, quotes, key points
- `generateEpisodeMeta(context)` - End-of-session metadata generation
- `resetSession()` - Clears accumulated state

---

#### [`workflows/debate.agent.ts`](../../apps/desktop-companion/src/agents/workflows/debate.agent.ts) - DebateAgent

**Purpose**: Live debate structuring with claims, evidence, and moderation.

| Property | Value |
|----------|-------|
| Name | `debate-agent` |
| Workflow | `debate` |
| Trigger Events | `TRANSCRIPT_SEGMENT`, `MOMENT_MARKER` |
| Output Categories | `CLAIM`, `EVIDENCE_CARD`, `QUOTE`, `MODERATOR_PROMPT` |

**Stateful**: Maintains `claims` Map (with IDs), `topics` Set, `speakerPositions` Map.

**How it works**:

1. **Transcript segments** are analyzed in parallel for:
   - **Claims** via `analyzeForClaims()` - classifies as assertion/counterclaim/rebuttal/concession with confidence scores (threshold: 0.5)
   - **Evidence** via `analyzeForEvidence()` - detects statistics, sources, examples, expert opinions, anecdotes with credibility scores (threshold: 0.4)
   - **Quotes** via `extractDebateQuotes()` - strong rhetorical statements, memorable one-liners
   - **Moderator prompts** via `generateModeratorPrompts()` - every 5th claim, generates suggested questions
2. **Moment markers** are treated as significant claims + generate follow-up moderator questions

**Key methods**:
- `analyzeForClaims()` - Classifies debate statements
- `analyzeForEvidence()` - Evaluates evidence quality
- `generateModeratorPrompts()` - Creates moderation questions (every 5 claims)
- `getDebateStats()` - Returns claim counts, topics, speaker breakdown

---

#### [`workflows/brainstorm.agent.ts`](../../apps/desktop-companion/src/agents/workflows/brainstorm.agent.ts) - BrainstormAgent

**Purpose**: Idea capture, connection detection, and action item generation.

| Property | Value |
|----------|-------|
| Name | `brainstorm-agent` |
| Workflow | `brainstorm` |
| Trigger Events | `TRANSCRIPT_SEGMENT`, `MOMENT_MARKER` |
| Output Categories | `IDEA_NODE`, `ACTION_ITEM`, `QUOTE` |

**Stateful**: Maintains `ideas` Map (with categories), `categories` Set, `ideaConnections` array.

**How it works**:

1. **Transcript segments** trigger:
   - `extractIdeas()` - Pulls new ideas with concept, description, author, category, and "builds on" references (threshold: 0.4)
   - `detectConnections()` - When 2+ ideas exist, finds complementary/contradictory/thematic links
   - `generateActionItems()` - Every 4th idea, synthesizes next steps with priority/effort ratings
   - `captureInsights()` - Extracts "eureka moments" and breakthrough quotes
2. **Moment markers** become highlighted ideas with immediate action item generation

**Key methods**:
- `extractIdeas()` - Identifies new concepts from discussion
- `detectConnections()` - Finds links between ideas
- `getIdeaMap()` - Returns nodes + edges for mind-map visualization
- `getBrainstormStats()` - Total ideas, categories, connections, top contributors

---

#### [`workflows/writersroom.agent.ts`](../../apps/desktop-companion/src/agents/workflows/writersroom.agent.ts) - WritersRoomAgent

**Purpose**: Screenwriting assistant for story beats, dialogue, and script content.

| Property | Value |
|----------|-------|
| Name | `writers-room-agent` |
| Workflow | `writers_room` |
| Trigger Events | `TRANSCRIPT_SEGMENT`, `MOMENT_MARKER` |
| Output Categories | `BEAT`, `SCRIPT_INSERT`, `QUOTE`, `ACTION_ITEM` |

**Stateful**: Maintains `storyBeats[]`, `characterNotes` Map, `currentScene`.

**How it works**:

1. **Transcript segments** trigger:
   - `analyzeForBeats()` - Detects plot points, character moments, scene transitions, conflicts, resolutions (threshold: 0.5)
   - `generateScriptSuggestions()` - Creates screenplay-formatted content (dialogue in CAPS, action in present tense)
   - `extractDialogueIdeas()` - Pulls memorable lines being workshopped
2. **Moment markers** become story beats + trigger `expandBeatToScript()` which writes 3-5 line script excerpts

**Key methods**:
- `analyzeForBeats()` - Detects story structure elements
- `generateScriptSuggestions()` - Creates proper screenplay format
- `expandBeatToScript()` - Turns beats into script excerpts
- `getStoryContext()` - Returns current beats and scene

---

#### [`workflows/index.ts`](../../apps/desktop-companion/src/agents/workflows/index.ts)

Barrel export for all 5 workflow agents.

---

### Validation Subsystem

Located at [`apps/desktop-companion/src/agents/validation/`](../../apps/desktop-companion/src/agents/validation/)

The validation subsystem runs a quality gate on every AI-generated output before it's persisted to the database.

---

#### [`validation/types.ts`](../../apps/desktop-companion/src/agents/validation/types.ts)

**Types for the brand/compliance validation gate.**

- **`ValidationIssue`** - An issue found during review: `code`, `message`, `severity` (error/warning/info), `category` (brand_voice/content_policy/platform_limits/legal_compliance/quality), `suggestion`, `field`
- **`ValidationResult`** - Result of validation: `valid`, `issues[]`, `output`, `fixedOutput`, `autoFixed`
- **`BrandVoiceConfig`** - Brand settings: `tone`, `avoidWords`, `preferredPhrases`, `allowEmojis`, `maxEmojis`, `hashtagStyle`
- **`ContentPolicyConfig`** - Policy rules: `blockProfanity`, `sensitiveTopics`, `blockedMentions`, `blockExternalLinks`, `requireQuoteAttribution`
- **`PlatformLimits`** - Per-platform character/hashtag/emoji limits:
  - Twitter: 280 chars, 5 hashtags, 5 emojis
  - LinkedIn: 3000 chars, 5 hashtags
  - Instagram: 2200 chars, 30 hashtags
  - YouTube: 5000 chars, 15 hashtags
  - TikTok: 2200 chars, 10 hashtags
- **`ValidationConfig`** - Combined config with `autoFix` toggle

---

#### [`validation/validator.ts`](../../apps/desktop-companion/src/agents/validation/validator.ts)

**The actual validation engine.**

`OutputValidator` runs 4 check pipelines on every output:

1. **`checkPlatformLimits()`** - Text length, hashtag count, emoji count vs platform limits
2. **`checkContentPolicy()`** - Profanity regex scan, sensitive topics, blocked mentions, external links, quote attribution
3. **`checkBrandVoice()`** - Avoided words, emoji policy compliance
4. **`checkQuality()`** - Empty content, too-short content, all-caps, excessive punctuation

**Auto-fix**: For fixable issues (length exceeded, all-caps, excessive punctuation), calls Claude again with a "fix this" prompt to auto-correct the content.

Exports a global singleton: `outputValidator`

---

#### [`validation/index.ts`](../../apps/desktop-companion/src/agents/validation/index.ts)

Barrel export for the validation module.

---

## Layer 2: Claude Code Automation

Located at [`.claude/`](../../.claude/)

These markdown files configure Claude Code (the CLI tool) for development and operator workflows. They do NOT run in production.

### Subagents

Located at [`.claude/subagents/`](../../.claude/subagents/)

Subagent definitions tell Claude Code what role to adopt when spawned as a Task agent.

| Subagent | File | Purpose |
|----------|------|---------|
| **Live Social Producer** | [`live-social-producer.md`](../../.claude/subagents/live-social-producer.md) | Generate platform-specific social post drafts from transcript + moments. Outputs for X, LinkedIn, IG, YouTube. Marks `NEEDS_VERIFY` for unverified claims. |
| **Debate Moderator** | [`debate-moderator.md`](../../.claude/subagents/debate-moderator.md) | Extract claims, map rebuttals, generate moderator prompts. Uses status labels: unverified/partial/supported/disputed. |
| **Brainstorm Scribe** | [`brainstorm-scribe.md`](../../.claude/subagents/brainstorm-scribe.md) | Maintain attributed idea ledger. Track idea ownership, attribution confidence, convert discussion to action items. |
| **Clip & Hook Strategist** | [`clip-hook-strategist.md`](../../.claude/subagents/clip-hook-strategist.md) | Turn moments and clips into titles/hooks. 3-5 title variants per clip, duration recommendations (15s/30s/60s), curiosity gap hooks. |
| **Podcast Packager** | [`podcast-packager.md`](../../.claude/subagents/podcast-packager.md) | Produce publish-ready podcast packaging: chapters, show notes, titles/descriptions, promo copy, clip suggestions. |

### Skills

Located at [`.claude/skills/`](../../.claude/skills/)

Skills are reusable procedures that define step-by-step how Claude Code should execute specific tasks.

| Skill | File | Purpose |
|-------|------|---------|
| **Social From Live** | [`social-from-live/SKILL.md`](../../.claude/skills/social-from-live/SKILL.md) | Convert rolling transcript + moment markers into per-platform social drafts (X posts/threads, LinkedIn, IG caption, YouTube Community). |
| **Brainstorm Ledger** | [`brainstorm-ledger/SKILL.md`](../../.claude/skills/brainstorm-ledger/SKILL.md) | Maintain attributed idea ledger with de-duplication, semantic clustering (at 5+ ideas), action items with owners. |
| **Debate Fact-Check** | [`debate-factcheck/SKILL.md`](../../.claude/skills/debate-factcheck/SKILL.md) | Extract checkable claims, classify (factual/prediction/value judgement/rhetorical), create neutral evidence cards with verification status. |
| **Podcast Packaging** | [`podcast-packaging/SKILL.md`](../../.claude/skills/podcast-packaging/SKILL.md) | Create publish-ready assets: 3 title variants, long+short descriptions, timestamped chapters, quote bank, promo pack. |
| **Opik Observability** | [`opik-observability.md`](../../.claude/skills/opik-observability.md) | Instrument live workflow for Comet Opik tracing. Map operations to trace names, attach metadata, surface traceIds. |

### Commands

Located at [`.claude/commands/`](../../.claude/commands/)

Slash commands you can invoke in Claude Code (e.g., `/live-start`).

| Command | File | What it does |
|---------|------|-------------|
| `/live-start` | [`live-start.md`](../../.claude/commands/live-start.md) | Start a new session: read config, confirm workflow + captureMode, check pipelines, report status. |
| `/live-clip-queue` | [`live-clip-queue.md`](../../.claude/commands/live-clip-queue.md) | Build/update clip queue: top 10 candidates with 3 title variants, hooks, platform tags, durations. |
| `/live-post-now` | [`live-post-now.md`](../../.claude/commands/live-post-now.md) | Generate social posts on-demand: 2 X drafts, 1 LinkedIn, 1 IG caption, 1 YT Community post. |
| `/live-wrap` | [`live-wrap.md`](../../.claude/commands/live-wrap.md) | End-of-session packaging: recap summary, top 10 moments/clips, social drafts, action items. |
| `/live-set-capture-mode` | [`live-set-capture-mode.md`](../../.claude/commands/live-set-capture-mode.md) | Update captureMode (audio/video/av) with pipeline adjustments. |
| `/set-capture-mode` | [`set-capture-mode.md`](../../.claude/commands/set-capture-mode.md) | Alternative capture mode setter with detailed pipeline rules. |
| `/opik-status` | [`opik-status.md`](../../.claude/commands/opik-status.md) | Show Comet Opik observability status: env vars, latest traceId, event counts. |

### Hooks

Located at [`.claude/hooks/`](../../.claude/hooks/)

Shell scripts triggered at session lifecycle events. **Currently all placeholders** (template stubs to be implemented).

| Hook | File | Purpose |
|------|------|---------|
| Session Start | [`session_start.sh`](../../.claude/hooks/session_start.sh) | Start capture pipelines, notify companion services |
| Session End | [`session_end.sh`](../../.claude/hooks/session_end.sh) | Package deliverables, export summaries |
| Start Capture | [`start_capture.sh`](../../.claude/hooks/start_capture.sh) | Start OBS replay buffer, screenshot sampler, STT connector |
| Attach Live Context | [`attach_live_context.sh`](../../.claude/hooks/attach_live_context.sh) | Assemble compact context bundle from recent events |
| Validate Outputs | [`validate_outputs.sh`](../../.claude/hooks/validate_outputs.sh) | Deterministic checks on drafts (length, banned words, tags) |
| Package Deliverables | [`package_deliverables.sh`](../../.claude/hooks/package_deliverables.sh) | Final packaging (recaps, exports) |

---

## How Events Flow Through the System

Here's the complete path of a single transcript event:

```
1. USER SPEAKS into microphone during livestream

2. DEEPGRAM STT receives audio, returns transcript text
   POST /stt/audio --> Deepgram WebSocket --> TRANSCRIPT_SEGMENT event

3. AGENT ROUTER receives the event
   AgentRouter.routeEvent(event, context)
     |-- Updates transcript buffer (keeps last 10 segments)
     |-- Updates event buffer
     |-- Checks minimum 100 chars before processing

4. WORKFLOW AGENT processes the event
   e.g. StreamerAgent.process(event, context)
     |-- BaseAgent wraps with timing + Opik tracing
     |-- StreamerAgent.generateOutputs() is called
     |-- Calls detectMoments() --> AI call to score clip-worthiness
     |-- If score >= 0.6, calls generateSocialPost() --> AI call
     |-- Calls extractQuotes() --> AI call
     |-- Returns AgentOutput[] array

5. OUTPUT VALIDATOR checks each output
   OutputValidator.validate(output)
     |-- checkPlatformLimits() (e.g., 280 chars for Twitter)
     |-- checkContentPolicy() (profanity, blocked mentions)
     |-- checkBrandVoice() (avoided words, emoji policy)
     |-- checkQuality() (not empty, not all-caps)
     |-- If issues found + autoFix enabled, calls Claude to fix

6. DATABASE PERSISTENCE
   OutputService.createOutput({
     sessionId, category, title, text, refs, meta, status: "draft"
   })

7. WEBSOCKET BROADCAST
   Event is broadcast to all connected web/mobile clients

8. DASHBOARD DISPLAY
   StreamerDashboard / PodcastDashboard / etc. renders the output
```

---

## Anthropic SDK vs Claude Code vs Agent SDK

This is an important distinction. There are **three different Anthropic technologies** at play:

### 1. Anthropic SDK (`@anthropic-ai/sdk`) - USED IN THIS PROJECT

**What it is**: The official TypeScript/Python SDK for calling Claude's API (chat completions, message creation).

**How it's used in FluxBoard**: The file [`client.ts`](../../apps/desktop-companion/src/agents/client.ts) imports `Anthropic` from `@anthropic-ai/sdk` and calls `client.messages.create()` to get AI responses. Every agent's AI call goes through this SDK.

```typescript
// From client.ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
const response = await client.messages.create({ model, max_tokens, messages });
```

**This is what powers the production agents.** When the app is deployed, the Anthropic SDK handles all AI calls.

### 2. Claude Code (.claude/) - USED IN THIS PROJECT

**What it is**: Claude Code is Anthropic's CLI tool for developers. The `.claude/` folder contains configuration files (subagents, skills, commands, hooks) that tell Claude Code how to behave.

**How it's used in FluxBoard**: The `.claude/` folder defines operator workflows (slash commands like `/live-start`), subagent roles (debate moderator, social producer), and reusable skills (social-from-live, podcast-packaging).

**This runs only during development/operations on your local machine.** It does NOT run in production.

### 3. Anthropic Agent SDK - NOT CURRENTLY USED

**What it is**: Anthropic's Agent SDK (separate from the standard SDK) is a framework for building autonomous agents that can use tools, maintain state, and orchestrate multi-step workflows. It provides agent loops, tool definitions, handoffs between agents, and guardrails.

**Current status in FluxBoard**: The project does **NOT** use the Anthropic Agent SDK. Instead, it has a **custom agent framework** built from scratch:

| Feature | Anthropic Agent SDK | FluxBoard Custom Framework |
|---------|---------------------|---------------------------|
| Agent loop | Built-in agent loop with tool use | Custom `BaseAgent.process()` + `AgentRouter.routeEvent()` |
| Tool calling | Native tool use via API | Manual prompt engineering with JSON parsing |
| State management | Built-in conversation state | Custom per-agent state (claims Map, ideas Map, etc.) |
| Multi-agent orchestration | Agent handoffs | `AgentRouter` dispatches to workflow-specific agents |
| Guardrails | Built-in guardrail system | Custom `OutputValidator` with 4 check pipelines |
| Observability | Configurable | Custom Opik integration |

### Should You Migrate to the Agent SDK?

**For production deployment, the current custom framework works fine.** It's purpose-built for the livestream use case and gives you full control over:
- Event-driven processing (not conversational)
- Transcript buffering and debouncing
- Workflow-specific state tracking
- Output validation and auto-fixing

The Anthropic Agent SDK would be beneficial if you want to:
- Add tool-use capabilities (web search, code execution)
- Build conversational agents that maintain multi-turn context
- Use agent-to-agent handoffs
- Leverage built-in guardrails instead of custom validation

**The current system will work in production as-is.** The Anthropic SDK (`@anthropic-ai/sdk`) handles all API calls, and the custom agent framework handles orchestration.

---

## Deployment Considerations

### What Runs in Production

Only **Layer 1** runs in production:

```
Production Server (Node.js)
  |
  +-- apps/desktop-companion/src/agents/
  |     +-- router.ts (AgentRouter singleton)
  |     +-- client.ts (Anthropic SDK calls)
  |     +-- base.ts (BaseAgent class)
  |     +-- workflows/*.agent.ts (5 workflow agents)
  |     +-- validation/*.ts (OutputValidator)
  |
  +-- Required env vars:
        ANTHROPIC_API_KEY=sk-ant-...
        AI_PROVIDER=anthropic
        AI_MODEL=claude-sonnet-4-20250514
        AI_MAX_TOKENS=1024
```

### What Does NOT Run in Production

**Layer 2** (`.claude/`) is developer tooling only:
- Subagent definitions
- Skill procedures
- Slash commands
- Hook scripts

These files stay on the developer's machine and are used via Claude Code CLI.

### Environment Variables for Agents

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Yes | - | Authentication with Anthropic API |
| `AI_PROVIDER` | No | `anthropic` | AI provider selection |
| `AI_MODEL` | No | Set in config | Default model for agent calls |
| `AI_MAX_TOKENS` | No | Set in config | Default max tokens per call |
| `OPIK_API_KEY` | No | - | Comet Opik observability (optional) |
| `OPIK_WORKSPACE_NAME` | No | - | Opik workspace |
| `OPIK_PROJECT_NAME` | No | - | Opik project |

---

## File Index

### Runtime Agent Files (Layer 1)

| File | Path | Purpose |
|------|------|---------|
| types.ts | [`apps/desktop-companion/src/agents/types.ts`](../../apps/desktop-companion/src/agents/types.ts) | All agent type definitions |
| client.ts | [`apps/desktop-companion/src/agents/client.ts`](../../apps/desktop-companion/src/agents/client.ts) | Anthropic SDK wrapper |
| base.ts | [`apps/desktop-companion/src/agents/base.ts`](../../apps/desktop-companion/src/agents/base.ts) | Abstract base agent class |
| router.ts | [`apps/desktop-companion/src/agents/router.ts`](../../apps/desktop-companion/src/agents/router.ts) | Event dispatcher |
| prompts.ts | [`apps/desktop-companion/src/agents/prompts.ts`](../../apps/desktop-companion/src/agents/prompts.ts) | System and user prompts |
| index.ts | [`apps/desktop-companion/src/agents/index.ts`](../../apps/desktop-companion/src/agents/index.ts) | Barrel exports |
| streamer.agent.ts | [`apps/desktop-companion/src/agents/workflows/streamer.agent.ts`](../../apps/desktop-companion/src/agents/workflows/streamer.agent.ts) | Streamer workflow agent |
| podcast.agent.ts | [`apps/desktop-companion/src/agents/workflows/podcast.agent.ts`](../../apps/desktop-companion/src/agents/workflows/podcast.agent.ts) | Podcast workflow agent |
| debate.agent.ts | [`apps/desktop-companion/src/agents/workflows/debate.agent.ts`](../../apps/desktop-companion/src/agents/workflows/debate.agent.ts) | Debate workflow agent |
| brainstorm.agent.ts | [`apps/desktop-companion/src/agents/workflows/brainstorm.agent.ts`](../../apps/desktop-companion/src/agents/workflows/brainstorm.agent.ts) | Brainstorm workflow agent |
| writersroom.agent.ts | [`apps/desktop-companion/src/agents/workflows/writersroom.agent.ts`](../../apps/desktop-companion/src/agents/workflows/writersroom.agent.ts) | Writers Room workflow agent |
| workflows/index.ts | [`apps/desktop-companion/src/agents/workflows/index.ts`](../../apps/desktop-companion/src/agents/workflows/index.ts) | Workflow barrel exports |
| validation/types.ts | [`apps/desktop-companion/src/agents/validation/types.ts`](../../apps/desktop-companion/src/agents/validation/types.ts) | Validation type definitions |
| validation/validator.ts | [`apps/desktop-companion/src/agents/validation/validator.ts`](../../apps/desktop-companion/src/agents/validation/validator.ts) | Validation engine |
| validation/index.ts | [`apps/desktop-companion/src/agents/validation/index.ts`](../../apps/desktop-companion/src/agents/validation/index.ts) | Validation barrel exports |

### Claude Code Automation Files (Layer 2)

| File | Path | Purpose |
|------|------|---------|
| README.md | [`.claude/README.md`](../../.claude/README.md) | Claude Code system pack overview |
| live-social-producer.md | [`.claude/subagents/live-social-producer.md`](../../.claude/subagents/live-social-producer.md) | Social post generation subagent |
| debate-moderator.md | [`.claude/subagents/debate-moderator.md`](../../.claude/subagents/debate-moderator.md) | Debate moderation subagent |
| brainstorm-scribe.md | [`.claude/subagents/brainstorm-scribe.md`](../../.claude/subagents/brainstorm-scribe.md) | Idea ledger subagent |
| clip-hook-strategist.md | [`.claude/subagents/clip-hook-strategist.md`](../../.claude/subagents/clip-hook-strategist.md) | Clip title/hook subagent |
| podcast-packager.md | [`.claude/subagents/podcast-packager.md`](../../.claude/subagents/podcast-packager.md) | Podcast packaging subagent |
| social-from-live SKILL.md | [`.claude/skills/social-from-live/SKILL.md`](../../.claude/skills/social-from-live/SKILL.md) | Social drafts skill |
| brainstorm-ledger SKILL.md | [`.claude/skills/brainstorm-ledger/SKILL.md`](../../.claude/skills/brainstorm-ledger/SKILL.md) | Idea ledger skill |
| debate-factcheck SKILL.md | [`.claude/skills/debate-factcheck/SKILL.md`](../../.claude/skills/debate-factcheck/SKILL.md) | Fact-check skill |
| podcast-packaging SKILL.md | [`.claude/skills/podcast-packaging/SKILL.md`](../../.claude/skills/podcast-packaging/SKILL.md) | Podcast assets skill |
| opik-observability.md | [`.claude/skills/opik-observability.md`](../../.claude/skills/opik-observability.md) | Observability skill |
| live-start.md | [`.claude/commands/live-start.md`](../../.claude/commands/live-start.md) | Start session command |
| live-clip-queue.md | [`.claude/commands/live-clip-queue.md`](../../.claude/commands/live-clip-queue.md) | Clip queue command |
| live-post-now.md | [`.claude/commands/live-post-now.md`](../../.claude/commands/live-post-now.md) | Generate posts command |
| live-wrap.md | [`.claude/commands/live-wrap.md`](../../.claude/commands/live-wrap.md) | End session command |
| live-set-capture-mode.md | [`.claude/commands/live-set-capture-mode.md`](../../.claude/commands/live-set-capture-mode.md) | Set capture mode command |
| set-capture-mode.md | [`.claude/commands/set-capture-mode.md`](../../.claude/commands/set-capture-mode.md) | Capture mode setter command |
| opik-status.md | [`.claude/commands/opik-status.md`](../../.claude/commands/opik-status.md) | Opik status command |
| session_start.sh | [`.claude/hooks/session_start.sh`](../../.claude/hooks/session_start.sh) | Session start hook (placeholder) |
| session_end.sh | [`.claude/hooks/session_end.sh`](../../.claude/hooks/session_end.sh) | Session end hook (placeholder) |
| start_capture.sh | [`.claude/hooks/start_capture.sh`](../../.claude/hooks/start_capture.sh) | Capture start hook (placeholder) |
| attach_live_context.sh | [`.claude/hooks/attach_live_context.sh`](../../.claude/hooks/attach_live_context.sh) | Context attachment hook (placeholder) |
| validate_outputs.sh | [`.claude/hooks/validate_outputs.sh`](../../.claude/hooks/validate_outputs.sh) | Output validation hook (placeholder) |
| package_deliverables.sh | [`.claude/hooks/package_deliverables.sh`](../../.claude/hooks/package_deliverables.sh) | Deliverables packaging hook (placeholder) |
