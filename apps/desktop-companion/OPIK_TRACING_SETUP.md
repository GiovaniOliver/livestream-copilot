# Opik Observability Tracing Setup

## Overview

The desktop-companion app now has comprehensive Opik observability tracing integrated throughout the AI agent system and API endpoints.

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Opik Configuration
OPIK_API_KEY=your_api_key_here
OPIK_WORKSPACE_NAME=your_workspace_name
OPIK_PROJECT_NAME=livestream-copilot

# Optional: For self-hosted Opik
# OPIK_URL_OVERRIDE=https://your-opik-instance.com
```

**Note**: For self-hosted Opik, you don't need an API key - just set the workspace and project names plus the URL override.

## What's Being Traced

### 1. AI Client Completions (`src/agents/client.ts`)

Every AI completion request is automatically traced with:
- Provider and model information
- Input token count and max tokens
- Output tokens and finish reason
- Completion duration
- Any errors that occur

**Trace Name**: `ai.completion`

### 2. Agent Processing (`src/agents/base.ts`)

Each agent execution is traced with:
- Agent name and workflow type
- Event type and ID
- Session context
- Number of outputs generated
- Output categories
- Processing duration
- Any errors

**Trace Name**: `agent.{workflow}.{agentName}`

Examples:
- `agent.streamer.StreamerAgent`
- `agent.podcast.PodcastAgent`
- `agent.debate.DebateAgent`

### 3. Agent Router (`src/agents/router.ts`)

Event routing to agents is traced with:
- Event type and workflow
- Number of agents processing
- Number of successful outputs
- Routing duration

**Trace Name**: `agent.router.routeEvent`

### 4. API Endpoints (`src/index.ts`)

Key API endpoints are traced:
- `/session/start` - Session initialization
- `/session/stop` - Session termination
- `/clip` - Clip creation with FFmpeg processing
- `/screenshot` - Screenshot capture

**Trace Names**:
- `session.start`
- `session.stop`
- `clip.create`
- `screenshot.create`

## How Tracing Works

### Automatic Tracing

Tracing is automatically enabled when you configure Opik environment variables. If Opik is not configured, the system gracefully degrades with no impact on functionality.

### Trace Hierarchy

```
agent.router.routeEvent (main trace)
  ├─ agent.streamer.StreamerAgent (child trace)
  │   └─ ai.completion (child trace)
  ├─ agent.podcast.PodcastAgent (child trace)
  │   └─ ai.completion (child trace)
  └─ ... more agents
```

### Auto-Flush for Visibility

All traces are automatically flushed after completion to ensure immediate visibility in the Opik dashboard. This is especially useful for demos and debugging.

## Viewing Traces

1. **Start the desktop-companion server**:
   ```bash
   npm run dev
   ```

2. **Trigger some activity** (start a session, send transcripts, create clips)

3. **View traces in Opik dashboard**:
   - Visit https://www.comet.com/opik (for cloud Opik)
   - Or your self-hosted Opik URL
   - Navigate to your workspace and project
   - View traces in real-time

## Trace Metadata

Each trace includes relevant metadata:

**AI Completions**:
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "inputTokens": 1234,
  "outputTokens": 567,
  "durationMs": 2500
}
```

**Agent Processing**:
```json
{
  "agent": "StreamerAgent",
  "workflow": "streamer",
  "eventType": "TRANSCRIPT_SEGMENT",
  "outputCount": 3,
  "categories": ["SOCIAL_POST", "MOMENT_MARKER", "CLIP_TITLE"]
}
```

**Router Events**:
```json
{
  "workflow": "podcast",
  "eventType": "TRANSCRIPT_SEGMENT",
  "agentCount": 1,
  "successfulAgents": 1,
  "totalOutputs": 5
}
```

## Benefits

### Development
- Debug AI agent behavior in real-time
- See token usage and costs
- Identify slow completions
- Track error rates

### Production
- Monitor AI performance
- Track usage patterns
- Identify bottlenecks
- Measure response times

### Debugging
- Full trace history
- Input/output inspection
- Error stack traces
- Performance metrics

## Troubleshooting

### Traces Not Appearing

1. **Check environment variables**:
   ```bash
   echo $OPIK_WORKSPACE_NAME
   echo $OPIK_PROJECT_NAME
   echo $OPIK_API_KEY
   ```

2. **Check logs** for Opik initialization:
   ```
   [observability] Opik client initialized
   ```

3. **Verify network** connectivity to Opik servers

### Performance Impact

Opik tracing has minimal performance impact:
- Traces are created asynchronously
- Flushing happens after operation completes
- No blocking on trace operations
- Graceful degradation if Opik is unavailable

### Disabling Tracing

To disable Opik tracing, simply remove or comment out the environment variables:
```bash
# OPIK_WORKSPACE_NAME=your_workspace
# OPIK_PROJECT_NAME=livestream-copilot
# OPIK_API_KEY=your_api_key
```

The system will automatically detect the missing configuration and skip tracing.

## Best Practices

1. **Use descriptive trace names** - Already implemented throughout the codebase
2. **Include relevant metadata** - All traces include context-specific metadata
3. **Flush after operations** - All traces auto-flush for visibility
4. **Handle errors gracefully** - Traces include error information when failures occur
5. **Keep traces focused** - Each trace covers a specific operation

## Next Steps

1. **Upload your Opik API key** to your hosting provider's environment variables
2. **Restart the desktop-companion service** with the new configuration
3. **Trigger some AI operations** to generate traces
4. **View traces in Opik dashboard** to verify setup

## Additional Resources

- Opik Documentation: https://www.comet.com/docs/opik/tracing/log_traces
- Opik + Node.js Guide: https://www.comet.com/docs/opik/quickstart
- Report Issues: https://github.com/comet-ml/opik/issues

## Implementation Details

### Files Modified

1. **src/observability/opik.ts** - Core Opik client and helper functions
2. **src/agents/client.ts** - AI completion tracing
3. **src/agents/base.ts** - Base agent processing tracing
4. **src/agents/router.ts** - Event routing tracing
5. **src/index.ts** - API endpoint tracing

### Code Pattern

All traces follow this pattern:

```typescript
const opikClient = getOpikClient();
const trace = opikClient?.trace({
  name: "operation.name",
  input: { /* operation inputs */ },
  metadata: { /* additional context */ },
});

try {
  // Perform operation
  const result = await doSomething();

  // Update trace with output
  if (trace && (trace as any).update) {
    (trace as any).update({
      output: { /* operation results */ },
    });
  }
  trace?.end();
  await (opikClient as any)?.flush?.();

  return result;
} catch (error) {
  // Update trace with error
  if (trace && (trace as any).update) {
    (trace as any).update({
      output: { error: error.message },
    });
  }
  trace?.end();
  await (opikClient as any)?.flush?.();

  throw error;
}
```

This ensures consistent tracing across the entire application.
