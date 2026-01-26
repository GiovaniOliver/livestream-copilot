# Speech-to-Text (STT) Setup Guide

This guide covers the configuration and usage of the Speech-to-Text integration in the Desktop Companion app, with a focus on the Deepgram provider.

## Table of Contents

1. [Overview](#overview)
2. [Provider Support](#provider-support)
3. [Deepgram Setup](#deepgram-setup)
4. [Configuration](#configuration)
5. [API Usage](#api-usage)
6. [Audio Requirements](#audio-requirements)
7. [Features](#features)
8. [Troubleshooting](#troubleshooting)
9. [Testing](#testing)

---

## Overview

The Desktop Companion app provides real-time speech-to-text transcription for livestream sessions. Transcripts are automatically segmented with speaker diarization (speaker detection) and timestamped relative to the session start.

**Key Features:**
- Real-time streaming transcription via WebSocket
- Speaker diarization (identifies different speakers)
- Interim results (partial transcripts as speech is detected)
- Automatic punctuation and smart formatting
- Custom vocabulary boosting
- Automatic reconnection with exponential backoff
- Session-based transcript persistence

---

## Provider Support

The STT module is designed to support multiple providers:

| Provider | Status | Notes |
|----------|--------|-------|
| **Deepgram** | ✅ Fully Implemented | Recommended, best performance |
| AssemblyAI | 🚧 Planned | Coming soon |
| Whisper | 🚧 Planned | Local/self-hosted option |

---

## Deepgram Setup

### 1. Create a Deepgram Account

1. Visit [Deepgram Console](https://console.deepgram.com/)
2. Sign up for a free account (includes $200 in free credits)
3. Verify your email address

### 2. Generate an API Key

1. Log in to the [Deepgram Console](https://console.deepgram.com/)
2. Navigate to **API Keys** in the sidebar
3. Click **Create a New API Key**
4. Give it a name (e.g., "Desktop Companion - Development")
5. Select permissions:
   - ✅ **Usage** - Read (required)
   - ✅ **Member** - Read (optional)
6. Copy the generated API key (you'll only see it once!)

### 3. Configure Environment Variable

Add the API key to your `.env` file:

```bash
# Speech-to-Text Configuration
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=your_api_key_here
```

---

## Configuration

### Environment Variables

```bash
# ===================
# STT Configuration
# ===================

# Provider selection
STT_PROVIDER=deepgram  # Options: deepgram, assemblyai, whisper

# Deepgram API Key (required when STT_PROVIDER=deepgram)
# Get your key at: https://console.deepgram.com/
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Advanced Deepgram Options

The Deepgram provider supports additional configuration options that can be passed when creating the provider:

```typescript
import { createDeepgramProvider } from './stt/deepgram.js';

const provider = createDeepgramProvider(wss, {
  apiKey: 'your_api_key',
  model: 'nova-2',           // Model selection (default: nova-2)
  tier: 'nova',              // Tier selection
  smartFormat: true,         // Enable smart formatting (default: true)
  profanityFilter: false,    // Enable profanity filtering (default: false)
  redact: false,            // Enable PII redaction (default: false)
  endpointUrl: undefined,   // Custom endpoint for on-prem deployments
});
```

### Deepgram Models

| Model | Description | Use Case |
|-------|-------------|----------|
| **nova-2** | Latest, most accurate model | Recommended for production |
| **nova** | Fast, accurate model | Good balance of speed/accuracy |
| **enhanced** | Enhanced accuracy | High-accuracy requirements |
| **base** | Fast, basic transcription | Low-latency requirements |

---

## API Usage

### Starting a Session

Before starting STT, you must have an active session:

```bash
POST http://localhost:3123/session/start
Content-Type: application/json

{
  "workflow": "streamer",
  "captureMode": "av",
  "title": "My Livestream",
  "participants": [
    { "id": "1", "name": "Host" },
    { "id": "2", "name": "Guest" }
  ]
}
```

Response:
```json
{
  "ok": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "ws": "ws://127.0.0.1:3124"
}
```

### Starting STT

```bash
POST http://localhost:3123/stt/start
Content-Type: application/json

{
  "audioSource": "microphone",      // or "obs"
  "audioDeviceName": "Default",     // specific device name (optional)
  "language": "en-US",              // language code
  "enableDiarization": true,        // speaker detection
  "enableInterimResults": true,     // partial results
  "enablePunctuation": true,        // auto punctuation
  "keywords": ["StreamDeck", "OBS"], // boost specific words
  "sampleRate": 16000,              // Hz (16000 recommended)
  "channels": 1                     // 1=mono, 2=stereo
}
```

Response:
```json
{
  "ok": true,
  "provider": "deepgram",
  "status": "connected",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "config": {
    "language": "en-US",
    "enableDiarization": true,
    "enableInterimResults": true,
    "audioSource": "microphone"
  }
}
```

### Sending Audio Data

Audio must be sent as base64-encoded PCM data:

```bash
POST http://localhost:3123/stt/audio
Content-Type: application/json

{
  "audio": "base64_encoded_pcm_audio_data_here"
}
```

Response:
```json
{
  "ok": true,
  "bytesReceived": 3200
}
```

### Receiving Transcripts

Transcripts are emitted via WebSocket as `TRANSCRIPT_SEGMENT` events:

```javascript
const ws = new WebSocket('ws://127.0.0.1:3124');

ws.on('message', (data) => {
  const event = JSON.parse(data);

  if (event.type === 'TRANSCRIPT_SEGMENT') {
    console.log(`[${event.payload.speakerId}] ${event.payload.text}`);
    console.log(`Time: ${event.payload.t0}s - ${event.payload.t1}s`);
  }
});
```

Example `TRANSCRIPT_SEGMENT` event:
```json
{
  "id": "uuid-here",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "ts": 1704067200000,
  "type": "TRANSCRIPT_SEGMENT",
  "payload": {
    "speakerId": "speaker_0",
    "text": "Hello everyone, welcome to the stream!",
    "t0": 12.5,
    "t1": 15.2
  }
}
```

### Checking STT Status

```bash
GET http://localhost:3123/stt/status
```

Response:
```json
{
  "ok": true,
  "active": true,
  "provider": "deepgram",
  "status": "transcribing",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "availableProviders": [
    {
      "name": "deepgram",
      "available": true
    },
    {
      "name": "assemblyai",
      "available": false
    },
    {
      "name": "whisper",
      "available": false
    }
  ]
}
```

### Stopping STT

```bash
POST http://localhost:3123/stt/stop
```

Response:
```json
{
  "ok": true
}
```

---

## Audio Requirements

### Format Specifications

The Deepgram provider expects audio in the following format:

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Encoding** | `linear16` (PCM) | Raw uncompressed audio |
| **Sample Rate** | `16000 Hz` | Recommended (8000-48000 supported) |
| **Channels** | `1` (mono) | Mono recommended (stereo supported) |
| **Bit Depth** | `16-bit` | Standard PCM format |
| **Byte Order** | Little-endian | Standard for PCM |

### Audio Chunk Size

- **Recommended**: 100-200ms chunks (1600-3200 bytes at 16kHz mono)
- **Minimum**: 20ms (320 bytes at 16kHz mono)
- **Maximum**: No hard limit, but smaller chunks improve latency

### Audio Source Configuration

The system supports two audio sources:

1. **Microphone**: Direct audio input from system microphone
   ```json
   {
     "audioSource": "microphone",
     "audioDeviceName": "Default Microphone"
   }
   ```

2. **OBS Virtual Audio**: Audio from OBS virtual audio device
   ```json
   {
     "audioSource": "obs",
     "audioDeviceName": "OBS Virtual Audio Device"
   }
   ```

---

## Features

### Speaker Diarization

Speaker diarization automatically identifies and labels different speakers in the audio:

```typescript
// Enable diarization when starting STT
{
  "enableDiarization": true
}

// Transcripts will include speaker IDs
{
  "speakerId": "speaker_0",  // First speaker
  "text": "Hello!"
}
{
  "speakerId": "speaker_1",  // Second speaker
  "text": "Hi there!"
}
```

**Notes:**
- Speaker IDs are assigned sequentially (speaker_0, speaker_1, etc.)
- Diarization works best with clear, distinct voices
- Requires minimum 2 seconds of speech per speaker for identification

### Interim Results

Interim results provide partial transcripts before utterances are complete:

```typescript
// Enable interim results
{
  "enableInterimResults": true
}

// You'll receive both interim and final transcripts
// Interim (isFinal: false) - Partial, may change
{
  "speakerId": "speaker_0",
  "text": "Hello every",
  "isFinal": false
}

// Final (isFinal: true) - Complete, won't change
{
  "speakerId": "speaker_0",
  "text": "Hello everyone!",
  "isFinal": true
}
```

**Best Practices:**
- Only persist/display final transcripts to users
- Use interim results for real-time UI feedback
- Interim results update rapidly (100-200ms)

### Smart Formatting

Smart formatting automatically adds punctuation and proper capitalization:

```typescript
{
  "smartFormat": true,
  "enablePunctuation": true
}

// Input audio: "hello everyone welcome to the stream"
// Output: "Hello everyone, welcome to the stream!"
```

### Custom Vocabulary

Boost recognition of specific words or phrases:

```typescript
{
  "keywords": [
    "StreamDeck",
    "OBS Studio",
    "Elgato",
    "Twitch Prime"
  ]
}
```

**Format:**
- Keywords are automatically weighted (boost factor: 2)
- Case-insensitive matching
- Improves recognition of brand names, technical terms
- Maximum 1000 keywords per request

### Automatic Reconnection

The provider automatically handles connection issues:

```typescript
// Configuration
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 30000;

// Exponential backoff: 1s, 2s, 4s, 8s, 16s
```

**Behavior:**
- Automatic reconnection on connection loss
- Exponential backoff to prevent server overload
- Maximum 5 retry attempts
- Status updates emitted during reconnection

### Keep-Alive

The provider sends keep-alive pings to maintain the WebSocket connection:

```typescript
// Keep-alive ping every 10 seconds
setInterval(() => {
  liveClient.keepAlive();
}, 10000);
```

---

## Troubleshooting

### Common Issues

#### 1. "Deepgram API key is required"

**Problem**: No API key configured

**Solution**:
```bash
# Add to .env file
DEEPGRAM_API_KEY=your_api_key_here
```

#### 2. "STT provider not configured"

**Problem**: Provider not available

**Solution**: Check STT status endpoint
```bash
GET http://localhost:3123/stt/status
```

Verify that Deepgram is listed as available:
```json
{
  "availableProviders": [
    {
      "name": "deepgram",
      "available": true  // ✅ Should be true
    }
  ]
}
```

#### 3. "Connection timeout"

**Problem**: Cannot connect to Deepgram servers

**Solutions**:
- Check internet connectivity
- Verify API key is valid
- Check firewall settings (WebSocket on port 443)
- Review logs for detailed error messages

#### 4. No transcripts received

**Checklist**:
- ✅ STT started successfully (status: "connected" or "transcribing")
- ✅ Audio data being sent to `/stt/audio` endpoint
- ✅ Audio format is correct (16kHz, mono, linear16)
- ✅ WebSocket client connected and listening
- ✅ Audio contains speech (not silence)

#### 5. Poor transcription quality

**Solutions**:
- Use higher sample rate (44100 Hz or 48000 Hz)
- Reduce background noise
- Use better microphone
- Enable smart formatting
- Add custom keywords for domain-specific terms
- Try `nova-2` model for best accuracy

#### 6. Speaker diarization not working

**Requirements**:
- Enable diarization in start config
- Minimum 2 speakers required
- Each speaker needs 2+ seconds of speech
- Clear, distinct voices work best
- Speakers should not overlap significantly

### Debugging

#### Enable Debug Logging

```bash
# In .env file
LOG_LEVEL=debug
```

#### Check STT Logs

```javascript
// STT logs are prefixed with [stt:deepgram]
[stt:deepgram] Status: connecting
[stt:deepgram] Connection opened
[stt:deepgram] Status: connected
[stt:deepgram] Status: transcribing
[stt:deepgram] Emitted TRANSCRIPT_SEGMENT: "Hello everyone..."
```

#### Monitor WebSocket Connection

```javascript
// In browser console or Node.js
const ws = new WebSocket('ws://127.0.0.1:3124');

ws.on('open', () => console.log('WebSocket connected'));
ws.on('message', (data) => console.log('Received:', data));
ws.on('error', (err) => console.error('WebSocket error:', err));
ws.on('close', () => console.log('WebSocket disconnected'));
```

---

## Testing

### Manual Testing with cURL

#### 1. Start a session
```bash
curl -X POST http://localhost:3123/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "streamer",
    "captureMode": "av",
    "title": "Test Session"
  }'
```

#### 2. Start STT
```bash
curl -X POST http://localhost:3123/stt/start \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en-US",
    "enableDiarization": true,
    "enableInterimResults": true
  }'
```

#### 3. Check status
```bash
curl http://localhost:3123/stt/status
```

#### 4. Send test audio (requires base64-encoded PCM audio)
```bash
# Generate test audio with ffmpeg
ffmpeg -f lavfi -i "sine=frequency=1000:duration=1" \
  -ar 16000 -ac 1 -f s16le test_audio.pcm

# Encode to base64
BASE64_AUDIO=$(base64 -w 0 test_audio.pcm)

# Send to STT
curl -X POST http://localhost:3123/stt/audio \
  -H "Content-Type: application/json" \
  -d "{\"audio\": \"$BASE64_AUDIO\"}"
```

#### 5. Stop STT
```bash
curl -X POST http://localhost:3123/stt/stop
```

### Testing with WebSocket Client

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://127.0.0.1:3124');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
});

ws.on('message', (data) => {
  const event = JSON.parse(data);

  if (event.type === 'TRANSCRIPT_SEGMENT') {
    console.log('\n=== TRANSCRIPT ===');
    console.log(`Speaker: ${event.payload.speakerId}`);
    console.log(`Text: ${event.payload.text}`);
    console.log(`Time: ${event.payload.t0.toFixed(2)}s - ${event.payload.t1.toFixed(2)}s`);
    console.log('==================\n');
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});
```

### Integration Testing

```typescript
import { createDeepgramProvider } from './stt/deepgram.js';
import { WebSocketServer } from 'ws';
import fs from 'fs';

// Create WebSocket server
const wss = new WebSocketServer({ port: 3124 });

// Create STT provider
const provider = createDeepgramProvider(wss);

// Listen for events
provider.on((event) => {
  switch (event.type) {
    case 'status_change':
      console.log(`Status: ${event.status}`);
      break;
    case 'transcript':
      if (event.segment.isFinal) {
        console.log(`[${event.segment.speakerId}] ${event.segment.text}`);
      }
      break;
    case 'error':
      console.error(`Error: ${event.error}`);
      break;
  }
});

// Start STT
await provider.start({
  sessionId: 'test-session',
  sessionStartedAt: Date.now(),
  language: 'en-US',
  enableDiarization: true,
  enableInterimResults: true,
});

// Load test audio file (16kHz mono PCM)
const audioBuffer = fs.readFileSync('./test_audio.pcm');

// Send audio in chunks (100ms chunks = 3200 bytes at 16kHz)
const chunkSize = 3200;
for (let i = 0; i < audioBuffer.length; i += chunkSize) {
  const chunk = audioBuffer.slice(i, i + chunkSize);
  provider.sendAudio(chunk);

  // Wait 100ms between chunks to simulate real-time
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Stop STT
await provider.stop();
```

---

## Architecture Overview

### Component Structure

```
stt/
├── types.ts         # TypeScript interfaces and types
├── index.ts         # STT Manager and factory functions
└── deepgram.ts      # Deepgram provider implementation
```

### STT Manager

The `STTManager` is a singleton that manages the active STT provider:

```typescript
import { getSTTManager } from './stt/index.js';

// Initialize with WebSocket server
const sttManager = getSTTManager();
sttManager.initialize(wss);

// Create provider
const provider = sttManager.createProvider('deepgram');

// Get current provider
const activeProvider = sttManager.getProvider();

// Stop provider
await sttManager.stopProvider();

// Get status
const status = sttManager.getStatus();
```

### Event Flow

```
1. Client calls /stt/start
   ↓
2. STTManager creates DeepgramSTTProvider
   ↓
3. Provider connects to Deepgram WebSocket API
   ↓
4. Client sends audio via /stt/audio
   ↓
5. Provider forwards audio to Deepgram
   ↓
6. Deepgram sends transcript data
   ↓
7. Provider emits TRANSCRIPT_SEGMENT event
   ↓
8. WebSocket broadcasts to all clients
   ↓
9. Transcript persisted to database (events table)
```

### Data Models

#### TranscriptionSegment
```typescript
interface TranscriptionSegment {
  speakerId: string | null;    // "speaker_0", "speaker_1", etc.
  text: string;                // Transcribed text
  t0: number;                  // Start time (seconds from session start)
  t1: number;                  // End time (seconds from session start)
  confidence: number;          // Confidence score (0-1)
  isFinal: boolean;           // Whether this is final or interim
  words?: TranscriptionWord[]; // Individual word timing
}
```

#### TranscriptionWord
```typescript
interface TranscriptionWord {
  word: string;              // Word text
  start: number;             // Start time in seconds
  end: number;               // End time in seconds
  confidence: number;        // Confidence score (0-1)
  speaker?: number;          // Speaker ID
  punctuated_word?: string; // Word with punctuation
}
```

---

## Best Practices

### 1. Audio Quality
- Use 16kHz sample rate for optimal balance (44.1kHz for high quality)
- Mono audio is sufficient and reduces bandwidth
- Minimize background noise
- Use hardware with good audio input

### 2. Performance
- Send audio in 100-200ms chunks
- Enable interim results only if needed (reduces events)
- Use WebSocket connection efficiently
- Monitor connection health with keep-alive

### 3. Error Handling
- Always check `ok` field in API responses
- Subscribe to error events via WebSocket
- Implement retry logic for audio sending
- Log errors for debugging

### 4. Cost Optimization
- Deepgram charges per minute of audio
- Only transcribe when needed
- Stop STT when session ends
- Use appropriate model (nova-2 is accurate but costs more)
- Monitor usage in Deepgram console

### 5. Security
- Never commit API keys to version control
- Use environment variables for configuration
- Rotate API keys periodically
- Restrict API key permissions in Deepgram console

---

## Next Steps

- **AssemblyAI Integration**: Alternative provider with additional features
- **Whisper Integration**: Self-hosted option for on-prem deployments
- **Real-time Captions**: Overlay transcripts on video streams
- **Transcript Export**: Export session transcripts as SRT, VTT, or text
- **Multi-language Support**: Automatic language detection
- **Translation**: Real-time translation to other languages

---

## Support Resources

- **Deepgram Documentation**: https://developers.deepgram.com/
- **Deepgram API Reference**: https://developers.deepgram.com/reference
- **Deepgram Community**: https://github.com/deepgram/deepgram-js-sdk
- **Desktop Companion Issues**: [GitHub Issues](https://github.com/your-org/livestream-copilot/issues)

---

## Changelog

### v0.1.0 (2024-01-06)
- Initial Deepgram integration
- Speaker diarization support
- Interim results support
- Automatic reconnection
- WebSocket event streaming
- Database persistence
