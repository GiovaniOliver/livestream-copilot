# Visual Triggers Implementation Guide

Complete guide for implementing and using the visual trigger frame extraction system (SOC-402).

## Overview

The visual trigger system detects visual cues (gestures, poses, objects) in video frames from your RTSP stream and automatically triggers workflows when detected. It supports multiple vision AI providers for flexibility and cost optimization.

## Architecture

```
RTSP Stream (MediaMTX)
    ↓
FrameExtractor (FFmpeg)
    ↓
Vision Provider (Gemini/OpenAI/Claude)
    ↓
VisualTriggerService
    ↓
Workflow Execution
```

## Setup

### 1. Environment Configuration

Add vision API keys to your `.env` file:

```env
# Required: Choose at least one provider
GEMINI_API_KEY=your-gemini-api-key          # Recommended for cost-effective real-time
OPENAI_API_KEY=sk-your-openai-key           # For high accuracy
ANTHROPIC_API_KEY=sk-ant-your-claude-key    # For complex reasoning

# Optional: Tune performance
VISUAL_TRIGGER_FRAME_INTERVAL=2000  # Minimum ms between frame checks (default: 2000)
VISUAL_TRIGGER_TIMEOUT=10000        # Detection timeout in ms (default: 10000)
```

### 2. RTSP Stream Setup

Ensure MediaMTX is running and streaming to `rtsp://localhost:8554/live/stream`:

```bash
# Check if MediaMTX is running
curl http://localhost:9997/v1/config/get

# Start streaming (example with OBS)
# Settings → Stream → Custom
# Server: rtsp://localhost:8554/live/stream
```

### 3. Configure Visual Triggers

Define triggers in your workflow configuration:

```typescript
import * as TriggerConfigService from './db/services/trigger-config.service';

// Create or update trigger configuration
await TriggerConfigService.upsertTriggerConfig({
  workflow: "debate-room",
  visualEnabled: true,
  frameSampleRate: 5,        // Check every 5 seconds
  triggerCooldown: 30,        // 30 seconds between triggers
  visualTriggers: [
    {
      id: "thumbs-up",
      label: "thumbs_up",
      enabled: true,
      threshold: 0.7,
      visionProvider: "gemini",  // or "openai", "claude"
      confidenceThreshold: 0.7,
      visualQuery: "person giving thumbs up gesture with hand clearly visible",
      checkInterval: 2000,
    },
    {
      id: "peace-sign",
      label: "peace_sign",
      enabled: true,
      threshold: 0.8,
      visionProvider: "gemini",
      confidenceThreshold: 0.8,
      visualQuery: "person making peace sign or V sign with fingers",
      checkInterval: 2000,
    },
    {
      id: "waving",
      label: "waving",
      enabled: true,
      threshold: 0.75,
      visionProvider: "openai",  // Use OpenAI for better gesture recognition
      confidenceThreshold: 0.75,
      visualQuery: "person waving hand in greeting motion",
      checkInterval: 2000,
    },
  ],
});
```

## Usage

### Starting Visual Trigger Monitoring

```typescript
import { getVisualTriggerService } from './triggers/visual-trigger.service';
import type { WebSocketServer } from 'ws';

// Initialize service (typically in your main server)
const wss: WebSocketServer = new WebSocket.Server({ port: 3124 });
const visualTriggerService = getVisualTriggerService(wss);

// Start monitoring for a session
await visualTriggerService.start(
  sessionId,
  workflow,
  "gemini"  // or "openai", "claude", "mediapipe"
);

// Register trigger callback
visualTriggerService.onTrigger((event) => {
  console.log("Visual trigger detected:", {
    label: event.detection.label,
    confidence: event.detection.confidence,
    timestamp: event.t,
  });

  // Execute workflow action
  executeWorkflowAction(event);
});

// Stop monitoring when session ends
visualTriggerService.stop();
```

### Handling Trigger Events

```typescript
import type { VisualTriggerEvent } from './triggers/visual-trigger.service';

function executeWorkflowAction(event: VisualTriggerEvent) {
  switch (event.detection.label) {
    case "thumbs_up":
      // Trigger positive feedback workflow
      sendToAgent({
        type: "POSITIVE_FEEDBACK",
        confidence: event.detection.confidence,
        timestamp: event.t,
      });
      break;

    case "peace_sign":
      // Take screenshot/clip
      createClip(event.sessionId, event.t);
      break;

    case "waving":
      // Start interaction
      startInteractiveMode(event.sessionId);
      break;
  }
}
```

### WebSocket Integration

Clients receive trigger events via WebSocket:

```typescript
// Frontend: Listen for visual trigger events
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'AUTO_TRIGGER_DETECTED' && data.payload.triggerType === 'visual') {
    console.log("Visual cue detected:", {
      source: data.payload.triggerSource,
      confidence: data.payload.confidence,
      timestamp: data.payload.t,
    });

    // Update UI
    showDetectionFeedback(data.payload);
  }
});
```

## Provider Selection Guide

### When to Use Gemini

- **Real-time detection** (< 1 second response)
- **High frequency** (many triggers per minute)
- **Cost-sensitive** applications
- **Simple gestures** (thumbs up, waving, peace sign)

### When to Use OpenAI

- **Complex gestures** requiring detailed understanding
- **High accuracy** requirements (medical, safety-critical)
- **Ambiguous visual queries** needing reasoning
- **Moderate frequency** (few triggers per minute)

### When to Use Claude

- **Complex scene understanding** (multiple people, objects)
- **Detailed analysis** with explanations
- **Research/development** (not production)
- **Low frequency** (occasional triggers)

## Performance Tuning

### Frame Check Interval

Balance between responsiveness and cost:

```typescript
// High responsiveness (expensive)
frameSampleRate: 2,  // Check every 2 seconds
VISUAL_TRIGGER_FRAME_INTERVAL: 1000

// Balanced (recommended)
frameSampleRate: 5,  // Check every 5 seconds
VISUAL_TRIGGER_FRAME_INTERVAL: 2000

// Cost-optimized (slower)
frameSampleRate: 10,  // Check every 10 seconds
VISUAL_TRIGGER_FRAME_INTERVAL: 5000
```

### Confidence Thresholds

Adjust based on accuracy vs. false positive trade-off:

```typescript
confidenceThreshold: 0.9,  // Very precise, may miss some
confidenceThreshold: 0.7,  // Balanced (recommended)
confidenceThreshold: 0.5,  // Sensitive, more false positives
```

### Cooldown Period

Prevent duplicate triggers for same gesture:

```typescript
triggerCooldown: 60,  // 60 seconds (strict)
triggerCooldown: 30,  // 30 seconds (recommended)
triggerCooldown: 10,  // 10 seconds (allow rapid triggers)
```

## Debugging

### Enable Debug Logging

```env
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### Monitor Frame Extraction

```typescript
import { createLogger } from './logger';

const logger = createLogger("visual-trigger-debug");

// Log all frame extractions
visualTriggerService.onFrameExtracted((frame) => {
  logger.debug({
    size: frame.length,
    timestamp: Date.now(),
  }, "Frame extracted");
});
```

### Test Vision Provider Manually

```typescript
import { GeminiVisionProvider } from './triggers/vision-providers/gemini';
import { createFrameExtractor } from './triggers/frame-extractor';
import fs from 'fs';

async function testVisionDetection() {
  // Extract a frame
  const extractor = createFrameExtractor("live/stream");
  const frame = await extractor.extractFrame();

  // Save for inspection
  fs.writeFileSync('./debug-frame.jpg', frame);

  // Test detection
  const provider = new GeminiVisionProvider(process.env.GEMINI_API_KEY!);
  const result = await provider.detect(
    frame,
    "person waving",
    0.7
  );

  console.log("Detection result:", result);
}
```

## Common Issues

### Issue: "Frame extraction timeout"

**Cause:** RTSP stream not available or slow network

**Solution:**
1. Verify MediaMTX is running: `curl http://localhost:9997/v1/config/get`
2. Check stream is active: `ffmpeg -i rtsp://localhost:8554/live/stream -frames:v 1 test.jpg`
3. Increase timeout: `VISUAL_TRIGGER_TIMEOUT=15000`

### Issue: "Vision detection timeout"

**Cause:** API is slow or unresponsive

**Solution:**
1. Check API key is valid
2. Verify internet connection
3. Increase timeout: `VISUAL_TRIGGER_TIMEOUT=20000`
4. Switch to faster provider (Gemini)

### Issue: Too many false positives

**Cause:** Confidence threshold too low

**Solution:**
1. Increase threshold: `confidenceThreshold: 0.8` or `0.9`
2. Make visual query more specific: `"person clearly showing thumbs up gesture with hand raised"`
3. Switch to higher accuracy provider (OpenAI)

### Issue: Missing detections

**Cause:** Threshold too high or poor lighting

**Solution:**
1. Lower threshold: `confidenceThreshold: 0.6` or `0.5`
2. Improve lighting in stream
3. Make gesture more exaggerated
4. Increase frame check frequency: `frameSampleRate: 3`

## Cost Estimation

### Example: Real-time Detection

- **Frequency:** Check every 5 seconds
- **Duration:** 1 hour stream
- **Checks:** 720 frames
- **Provider:** Gemini

**Cost:** 720 × $0.00002 = **$0.014 per hour**

### Example: Moderate Detection

- **Frequency:** Check every 10 seconds
- **Duration:** 2 hour stream
- **Checks:** 720 frames
- **Provider:** OpenAI

**Cost:** 720 × $0.001275 = **$0.92 per stream**

### Cost Optimization Tips

1. Use **Gemini** for most triggers
2. Reserve **OpenAI** for critical triggers only
3. Increase `frameSampleRate` to reduce checks
4. Use batch detection when checking multiple triggers
5. Implement smart frame skipping (skip if no motion detected)

## Advanced Features

### Batch Detection

Check multiple triggers in one API call:

```typescript
// Instead of multiple API calls
const queries = triggers.map(t => t.visualQuery);
const detections = await provider.detectBatch(frameBuffer, queries, 0.7);

// Process results
for (const detection of detections) {
  const trigger = triggers.find(t => t.visualQuery === detection.label);
  if (trigger) {
    handleTrigger(trigger, detection);
  }
}
```

### Dynamic Threshold Adjustment

Adjust threshold based on context:

```typescript
let threshold = 0.7;

// Lower threshold during active segments
if (isUserSpeaking) {
  threshold = 0.6;  // More sensitive
}

// Raise threshold during idle
if (isIdle) {
  threshold = 0.9;  // Very precise
}

const result = await provider.detect(frame, query, threshold);
```

### Frame Quality Optimization

Reduce costs by lowering frame quality:

```typescript
const extractor = createFrameExtractor("live/stream", {
  maxWidth: 512,   // Lower resolution (faster, cheaper)
  quality: 70,     // Lower quality (smaller buffer)
});
```

## Best Practices

1. **Start with Gemini** - Best balance of cost and performance
2. **Use specific queries** - "person giving clear thumbs up with right hand" vs "thumbs up"
3. **Set reasonable cooldowns** - 30 seconds prevents spam
4. **Monitor costs** - Log API usage and set budget alerts
5. **Test thoroughly** - Verify triggers work in various lighting conditions
6. **Implement fallbacks** - Handle API failures gracefully
7. **Cache results** - Don't re-check same frame multiple times
8. **Log everything** - Structured logging helps debug issues

## Security Considerations

1. **Protect API keys** - Never commit keys to version control
2. **Validate inputs** - Sanitize visual queries from user input
3. **Rate limit** - Prevent abuse with per-user limits
4. **Monitor usage** - Alert on unusual API consumption
5. **Encrypt frames** - If storing frames, encrypt at rest
6. **Audit access** - Log who configures triggers

## Next Steps

1. Implement trigger configuration UI
2. Add visual feedback overlays
3. Create analytics dashboard for trigger performance
4. Implement A/B testing for threshold optimization
5. Add custom model fine-tuning for brand-specific cues
