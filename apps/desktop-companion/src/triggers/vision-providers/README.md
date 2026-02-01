# Vision Providers

Vision detection providers for the visual trigger system. These providers analyze video frames to detect visual cues like gestures, poses, or objects.

## Available Providers

### 1. GeminiVisionProvider

**Model:** `gemini-1.5-flash`
**Provider:** Google AI
**Cost:** ~$0.00002 per image (as of 2025)
**Speed:** ~500-1000ms per detection
**Best for:** Real-time detection, cost-sensitive applications

#### Setup

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env`:
```env
GEMINI_API_KEY=your-api-key-here
```

#### Usage

```typescript
import { GeminiVisionProvider } from './vision-providers/gemini';

const provider = new GeminiVisionProvider(process.env.GEMINI_API_KEY);

// Single detection
const result = await provider.detect(
  frameBuffer,
  "person waving",
  0.7 // confidence threshold
);

// Batch detection (more efficient)
const results = await provider.detectBatch(
  frameBuffer,
  ["thumbs up", "peace sign", "waving"],
  0.7
);
```

### 2. OpenAIVisionProvider

**Model:** `gpt-4o`
**Provider:** OpenAI
**Cost:** ~$0.001275 per image (low detail mode)
**Speed:** ~1000-2000ms per detection
**Best for:** High accuracy requirements, complex visual reasoning

#### Setup

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env`:
```env
OPENAI_API_KEY=sk-your-api-key-here
```

#### Usage

```typescript
import { OpenAIVisionProvider } from './vision-providers/openai';

const provider = new OpenAIVisionProvider(process.env.OPENAI_API_KEY);

// Single detection
const result = await provider.detect(
  frameBuffer,
  "person giving thumbs up gesture",
  0.8 // higher threshold for more precision
);

// Batch detection
const results = await provider.detectBatch(
  frameBuffer,
  ["happy expression", "sad expression", "surprised expression"],
  0.7
);
```

### 3. ClaudeVisionProvider (Legacy)

**Model:** `claude-sonnet-4`
**Provider:** Anthropic
**Cost:** ~$0.003 per image
**Speed:** ~1500-2500ms per detection
**Best for:** Complex scene understanding, detailed analysis

Uses the legacy provider interface. See `visual-trigger.service.ts` for implementation.

## Configuration

### Environment Variables

```env
# Vision API Keys
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-key

# Frame Extraction Settings
VISUAL_TRIGGER_FRAME_INTERVAL=2000  # Min ms between frame checks
VISUAL_TRIGGER_TIMEOUT=10000        # Detection timeout in ms
```

### Visual Trigger Config

Configure triggers in the database using `TriggerConfigService`:

```typescript
const trigger: VisualTrigger = {
  id: "trigger-1",
  label: "thumbs_up",
  enabled: true,
  threshold: 0.7,

  // New fields for vision providers
  visionProvider: "gemini",        // "gemini" | "openai" | "claude"
  confidenceThreshold: 0.7,        // 0.0 - 1.0
  visualQuery: "person giving thumbs up gesture",
  checkInterval: 2000,             // ms between checks
};
```

## Performance Optimization

### Rate Limiting

The system implements automatic rate limiting to prevent excessive API calls:

```typescript
// Minimum 2 seconds between frame checks (configurable)
private frameCheckInterval: number = 2000;

// Per-trigger cooldown (default: 30 seconds)
private cooldownMs: number = 30000;
```

### Timeouts

All vision API calls have timeouts to prevent hanging:

```typescript
// Frame extraction timeout: 5 seconds
await Promise.race([
  frameExtractor.extractFrame(),
  timeout(5000)
]);

// Vision detection timeout: 10 seconds (configurable)
await Promise.race([
  provider.detect(frame, query, threshold),
  timeout(VISUAL_TRIGGER_TIMEOUT)
]);
```

### Batch Detection

Use batch detection when checking multiple triggers to reduce API calls:

```typescript
// Instead of N API calls
for (const trigger of triggers) {
  await provider.detect(frame, trigger.query);
}

// Make 1 API call
const queries = triggers.map(t => t.query);
const results = await provider.detectBatch(frame, queries);
```

## Error Handling

All providers implement comprehensive error handling:

- **Parse errors**: Returns safe default (`detected: false, confidence: 0`)
- **API errors**: Logged with context, operation continues
- **Timeout errors**: Logged as warnings, next frame check proceeds
- **Network errors**: Logged as errors, retry on next interval

## Cost Comparison

For 1000 detections per day (30 days):

| Provider | Cost/Image | Daily Cost | Monthly Cost |
|----------|-----------|-----------|--------------|
| Gemini   | $0.00002  | $0.02     | $0.60        |
| OpenAI   | $0.001275 | $1.28     | $38.40       |
| Claude   | $0.003    | $3.00     | $90.00       |

**Recommendation:** Use Gemini for real-time triggers, OpenAI for high-accuracy critical detections.

## Logging

All providers use structured logging with Pino:

```typescript
import { createLogger } from '../../logger/index.js';

const logger = createLogger("gemini-vision");

logger.info({ query, confidence }, "Detection successful");
logger.debug({ response }, "Raw API response");
logger.error({ error, query }, "Detection error");
```

## Testing

Test vision providers with sample images:

```typescript
import fs from 'fs';
import { GeminiVisionProvider } from './gemini';

const provider = new GeminiVisionProvider(process.env.GEMINI_API_KEY);
const frameBuffer = fs.readFileSync('./test-images/thumbs-up.jpg');

const result = await provider.detect(frameBuffer, "thumbs up gesture", 0.7);
console.log(result);
// { label: "thumbs up gesture", confidence: 0.92 }
```

## Future Enhancements

- [ ] Add caching for repeated detections on similar frames
- [ ] Implement multi-model consensus (query multiple providers, use voting)
- [ ] Add custom model fine-tuning for brand-specific visual cues
- [ ] Implement progressive confidence thresholds (start high, lower over time)
- [ ] Add visual feedback overlays showing detection regions
