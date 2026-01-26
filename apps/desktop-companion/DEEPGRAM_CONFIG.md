# Deepgram STT Configuration Reference

This document provides detailed configuration options for the Deepgram Speech-to-Text integration.

## Quick Start

1. Get API key from [Deepgram Console](https://console.deepgram.com/signup)
2. Add to `.env`:
   ```bash
   STT_PROVIDER=deepgram
   DEEPGRAM_API_KEY=your_api_key_here
   ```
3. See [STT_SETUP.md](./STT_SETUP.md) for full usage guide

## Environment Variables

### STT_PROVIDER
- **Type**: `string`
- **Default**: `deepgram`
- **Options**: `deepgram`, `assemblyai`, `whisper`
- **Description**: Which STT provider to use

```bash
STT_PROVIDER=deepgram
```

### DEEPGRAM_API_KEY
- **Type**: `string`
- **Required**: Yes (when `STT_PROVIDER=deepgram`)
- **Format**: Alphanumeric string
- **Description**: Your Deepgram API key from the console

```bash
DEEPGRAM_API_KEY=abc123xyz789...
```

## Start Configuration Options

When calling `POST /stt/start`, you can customize the following options:

### audioSource
- **Type**: `"microphone" | "obs"`
- **Default**: `"microphone"`
- **Description**: Audio input source

```json
{
  "audioSource": "microphone"
}
```

### audioDeviceName
- **Type**: `string`
- **Optional**: Yes
- **Description**: Specific audio device name

```json
{
  "audioDeviceName": "Default Microphone"
}
```

### language
- **Type**: `string` (BCP-47 language code)
- **Default**: `"en-US"`
- **Supported Languages**: 35+ languages

Common options:
- `en-US` - English (US)
- `en-GB` - English (UK)
- `es` - Spanish
- `fr` - French
- `de` - German
- `pt-BR` - Portuguese (Brazil)
- `ja` - Japanese
- `ko` - Korean
- `zh` - Chinese

```json
{
  "language": "en-US"
}
```

### enableDiarization
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable speaker detection

When enabled, transcripts will include speaker IDs:
```json
{
  "speakerId": "speaker_0",  // First speaker
  "text": "Hello everyone!"
}
```

```json
{
  "enableDiarization": true
}
```

### enableInterimResults
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Receive partial transcripts before completion

```json
{
  "enableInterimResults": true
}
```

When enabled, you'll receive:
- **Interim results** (`isFinal: false`): Partial, may change
- **Final results** (`isFinal: true`): Complete, won't change

### enablePunctuation
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Automatic punctuation and capitalization

```json
{
  "enablePunctuation": true
}
```

### keywords
- **Type**: `string[]`
- **Optional**: Yes
- **Max**: 1000 keywords
- **Description**: Boost recognition of specific words

```json
{
  "keywords": [
    "StreamDeck",
    "OBS Studio",
    "Elgato",
    "Twitch Prime"
  ]
}
```

### sampleRate
- **Type**: `number` (Hz)
- **Default**: `16000`
- **Range**: `8000` - `48000`
- **Recommended**: `16000` for optimal balance

```json
{
  "sampleRate": 16000
}
```

Common sample rates:
- `8000` - Phone quality (lowest)
- `16000` - Standard (recommended)
- `44100` - CD quality
- `48000` - Professional audio

### channels
- **Type**: `number`
- **Default**: `1`
- **Options**: `1` (mono) or `2` (stereo)
- **Recommended**: `1` (mono)

```json
{
  "channels": 1
}
```

## Provider-Specific Configuration

These options are set when creating the Deepgram provider (not via API):

### model
- **Type**: `string`
- **Default**: `"nova-2"`
- **Description**: Deepgram model to use

```typescript
{
  model: "nova-2"
}
```

Available models:

| Model | Accuracy | Speed | Cost/min | Best For |
|-------|----------|-------|----------|----------|
| **nova-2** | Highest | Fast | $0.0043 | Production (recommended) |
| **nova** | High | Faster | $0.0036 | Good balance |
| **enhanced** | Very High | Medium | $0.0059 | High-accuracy requirements |
| **base** | Good | Fastest | $0.0025 | Low-latency needs |

### smartFormat
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Intelligent formatting with punctuation

```typescript
{
  smartFormat: true
}
```

### profanityFilter
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Filter profanity from transcripts

```typescript
{
  profanityFilter: false
}
```

### redact
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Redact PII (Personal Identifiable Information)

Redacted types:
- Credit card numbers
- Social security numbers
- Email addresses
- Phone numbers
- etc.

```typescript
{
  redact: false
}
```

### endpointUrl
- **Type**: `string` (URL)
- **Optional**: Yes
- **Description**: Custom endpoint for on-prem deployments

```typescript
{
  endpointUrl: "wss://your-custom-endpoint.com"
}
```

## Complete Example

```json
{
  "audioSource": "microphone",
  "audioDeviceName": "Default Microphone",
  "language": "en-US",
  "enableDiarization": true,
  "enableInterimResults": true,
  "enablePunctuation": true,
  "keywords": [
    "StreamDeck",
    "OBS Studio"
  ],
  "sampleRate": 16000,
  "channels": 1
}
```

## Audio Format Requirements

### Input Format (Client to Server)
- **Encoding**: Base64 string
- **Original Format**: PCM (linear16)
- **Sample Rate**: Match `sampleRate` config
- **Channels**: Match `channels` config
- **Bit Depth**: 16-bit

### WebSocket Format (Server to Deepgram)
- **Encoding**: Raw PCM (linear16)
- **Container**: ArrayBuffer
- **Sample Rate**: As configured
- **Channels**: As configured

## Connection Parameters

### Connection Timeout
- **Default**: 10 seconds
- **Description**: Max time to wait for connection

### Keep-Alive Interval
- **Default**: 10 seconds
- **Description**: Ping interval to keep connection alive

### Reconnection Settings
- **Max Attempts**: 5
- **Base Delay**: 1000ms (1 second)
- **Max Delay**: 30000ms (30 seconds)
- **Strategy**: Exponential backoff (1s, 2s, 4s, 8s, 16s)

## Event Types

### status_change
Emitted when STT status changes:

```typescript
{
  type: "status_change",
  status: "connecting" | "connected" | "transcribing" | "reconnecting" | "error" | "stopped" | "idle",
  message?: string
}
```

### transcript
Emitted when transcript is received:

```typescript
{
  type: "transcript",
  segment: {
    speakerId: string | null,
    text: string,
    t0: number,  // Start time in seconds
    t1: number,  // End time in seconds
    confidence: number,  // 0-1
    isFinal: boolean,
    words?: Array<{
      word: string,
      start: number,
      end: number,
      confidence: number,
      speaker?: number,
      punctuated_word?: string
    }>
  }
}
```

### error
Emitted on error:

```typescript
{
  type: "error",
  error: string,
  code?: string,
  recoverable: boolean
}
```

### connection_opened
Emitted when connection established:

```typescript
{
  type: "connection_opened",
  timestamp: number
}
```

### connection_closed
Emitted when connection closed:

```typescript
{
  type: "connection_closed",
  timestamp: number
}
```

## Best Practices

1. **Audio Quality**
   - Use 16kHz sample rate for balance
   - Mono audio is sufficient
   - Minimize background noise
   - Use quality microphone

2. **Performance**
   - Send audio in 100-200ms chunks
   - Enable interim results only if needed
   - Monitor connection status
   - Implement error handling

3. **Cost Optimization**
   - Only transcribe when needed
   - Stop STT when session ends
   - Use appropriate model (nova-2 recommended)
   - Monitor usage in Deepgram console

4. **Accuracy**
   - Enable smart formatting
   - Add domain-specific keywords
   - Use nova-2 model for best results
   - Ensure clear audio input

5. **Reliability**
   - Monitor connection events
   - Handle reconnection gracefully
   - Check provider status before sending audio
   - Log errors for debugging

## Troubleshooting

See [STT_SETUP.md](./STT_SETUP.md#troubleshooting) for detailed troubleshooting guide.

## Additional Resources

- [Deepgram Documentation](https://developers.deepgram.com/)
- [Deepgram API Reference](https://developers.deepgram.com/reference)
- [Language Support](https://developers.deepgram.com/docs/languages-overview)
- [Model Comparison](https://developers.deepgram.com/docs/model)
