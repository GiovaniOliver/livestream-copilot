# Speech-to-Text Implementation Summary

This document provides a comprehensive overview of the Deepgram Speech-to-Text integration in the Desktop Companion app.

## Implementation Status

### Completed Features

- **Deepgram Provider**: Fully implemented with WebSocket streaming
- **STT Manager**: Singleton pattern for managing provider lifecycle
- **Event System**: Complete event-driven architecture
- **Audio Ingestion**: HTTP endpoint for base64-encoded PCM audio
- **Speaker Diarization**: Automatic speaker detection and labeling
- **Interim Results**: Real-time partial transcripts
- **WebSocket Broadcasting**: TRANSCRIPT_SEGMENT events to all clients
- **Database Persistence**: Events stored in PostgreSQL
- **Automatic Reconnection**: Exponential backoff with 5 retry attempts
- **Keep-Alive**: WebSocket ping every 10 seconds
- **Error Handling**: Comprehensive error handling and recovery
- **Configuration Validation**: Zod schema validation for environment variables
- **Logging**: Structured logging with Pino

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Client Applications                        │
│  (Web App, Mobile App, External Services)                       │
└───────────────────┬─────────────────────────────────────────────┘
                    │
                    ├─── HTTP API (Port 3123)
                    │    ├── POST /stt/start
                    │    ├── POST /stt/stop
                    │    ├── POST /stt/audio
                    │    └── GET  /stt/status
                    │
                    └─── WebSocket (Port 3124)
                         └── TRANSCRIPT_SEGMENT events

┌─────────────────────────────────────────────────────────────────┐
│                    Desktop Companion Server                      │
├─────────────────────────────────────────────────────────────────┤
│  STT Manager (Singleton)                                        │
│  ├── Provider Management                                        │
│  ├── Lifecycle Control                                          │
│  └── Status Tracking                                            │
├─────────────────────────────────────────────────────────────────┤
│  Deepgram STT Provider                                          │
│  ├── WebSocket Connection (to Deepgram)                         │
│  ├── Event Handlers                                             │
│  ├── Audio Forwarding                                           │
│  ├── Transcript Processing                                      │
│  └── Reconnection Logic                                         │
├─────────────────────────────────────────────────────────────────┤
│  Event Broadcasting                                             │
│  ├── WebSocket Server (to clients)                              │
│  └── Database Persistence (PostgreSQL)                          │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Deepgram API                                │
│  wss://api.deepgram.com/v1/listen                               │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
apps/desktop-companion/
├── src/
│   ├── stt/
│   │   ├── types.ts          # TypeScript interfaces and types
│   │   ├── index.ts          # STT Manager and factory functions
│   │   └── deepgram.ts       # Deepgram provider implementation
│   ├── config/
│   │   ├── env.ts            # Environment variable schema
│   │   └── index.ts          # Configuration module
│   └── index.ts              # Main server (STT routes defined here)
├── .env.sample               # Environment template (updated)
├── STT_SETUP.md              # Complete setup and usage guide
├── DEEPGRAM_CONFIG.md        # Configuration reference
├── test-stt.sh               # Integration test script
└── package.json              # Dependencies (@deepgram/sdk: ^3.9.0)
```

## Key Components

### 1. STTProvider Interface (`src/stt/types.ts`)

Defines the contract that all STT providers must implement:

```typescript
interface STTProvider {
  readonly name: string;
  readonly status: STTStatus;

  start(config: STTStartConfig): Promise<void>;
  stop(): Promise<void>;
  sendAudio(audioData: Buffer): void;
  on(callback: STTEventCallback): void;
  off(callback: STTEventCallback): void;
  isReady(): boolean;
}
```

### 2. DeepgramSTTProvider (`src/stt/deepgram.ts`)

Implements the STTProvider interface using Deepgram's WebSocket API:

**Key Features:**
- Connects to Deepgram's live transcription endpoint
- Handles audio streaming (PCM linear16 format)
- Processes transcript events with speaker diarization
- Emits TRANSCRIPT_SEGMENT events to WebSocket clients
- Automatic reconnection with exponential backoff
- Keep-alive pings to maintain connection
- Comprehensive error handling

**Configuration:**
```typescript
const provider = new DeepgramSTTProvider(wss, {
  apiKey: 'your_api_key',
  model: 'nova-2',           // Latest model (recommended)
  smartFormat: true,         // Auto punctuation
  profanityFilter: false,    // Filter profanity
  redact: false,            // Redact PII
});
```

### 3. STTManager (`src/stt/index.ts`)

Singleton that manages the active STT provider:

```typescript
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

### 4. HTTP API Routes (`src/index.ts`)

#### POST /stt/start
Start STT transcription with configuration.

**Request:**
```json
{
  "audioSource": "microphone",
  "language": "en-US",
  "enableDiarization": true,
  "enableInterimResults": true,
  "sampleRate": 16000,
  "channels": 1
}
```

**Response:**
```json
{
  "ok": true,
  "provider": "deepgram",
  "status": "connected",
  "sessionId": "uuid",
  "config": { ... }
}
```

#### POST /stt/stop
Stop STT transcription.

**Response:**
```json
{
  "ok": true
}
```

#### POST /stt/audio
Send audio data for transcription.

**Request:**
```json
{
  "audio": "base64_encoded_pcm_audio"
}
```

**Response:**
```json
{
  "ok": true,
  "bytesReceived": 3200
}
```

#### GET /stt/status
Get STT status and available providers.

**Response:**
```json
{
  "ok": true,
  "active": true,
  "provider": "deepgram",
  "status": "transcribing",
  "sessionId": "uuid",
  "availableProviders": [
    {"name": "deepgram", "available": true},
    {"name": "assemblyai", "available": false},
    {"name": "whisper", "available": false}
  ]
}
```

## Data Flow

### Starting STT

```
1. Client → POST /stt/start
2. Server validates session exists
3. Server checks Deepgram API key configured
4. STTManager creates DeepgramSTTProvider
5. Provider connects to Deepgram WebSocket API
6. Server responds with success + status
```

### Audio Processing

```
1. Client → POST /stt/audio (base64 PCM)
2. Server decodes base64 to Buffer
3. Server forwards to provider.sendAudio()
4. Provider converts Buffer to ArrayBuffer
5. Provider sends to Deepgram via WebSocket
6. Deepgram processes audio
7. Deepgram sends transcript via WebSocket
8. Provider processes transcript
9. Provider emits TRANSCRIPT_SEGMENT event
10. WebSocket broadcasts to all clients
11. Event persisted to database
```

### Transcript Event Flow

```
Deepgram WebSocket
    ↓
DeepgramSTTProvider.handleTranscript()
    ↓
Extract transcript, speaker, timing, confidence
    ↓
Create TranscriptionSegment object
    ↓
Emit local event (for logging/monitoring)
    ↓
If final transcript:
    ↓
Create EventEnvelope (TRANSCRIPT_SEGMENT)
    ↓
Broadcast to WebSocket clients
    ↓
Persist to database (events table)
```

## Configuration

### Required Environment Variables

```bash
# STT Provider Selection
STT_PROVIDER=deepgram

# Deepgram API Key
DEEPGRAM_API_KEY=your_api_key_here
```

### Audio Format Requirements

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Encoding** | linear16 (PCM) | Raw uncompressed audio |
| **Sample Rate** | 16000 Hz | Recommended (8000-48000 supported) |
| **Channels** | 1 (mono) | Mono recommended |
| **Bit Depth** | 16-bit | Standard PCM format |
| **Chunk Size** | 1600-3200 bytes | 100-200ms at 16kHz mono |

### Deepgram Models

| Model | Accuracy | Cost/min | Best For |
|-------|----------|----------|----------|
| **nova-2** | Highest | $0.0043 | Production (default) |
| **nova** | High | $0.0036 | Good balance |
| **enhanced** | Very High | $0.0059 | High accuracy |
| **base** | Good | $0.0025 | Low latency |

## Event Types

### TRANSCRIPT_SEGMENT

Emitted when final transcript is received:

```typescript
{
  id: "uuid",
  sessionId: "session-uuid",
  ts: 1704067200000,
  type: "TRANSCRIPT_SEGMENT",
  payload: {
    speakerId: "speaker_0" | null,
    text: "Hello everyone!",
    t0: 12.5,  // Start time in seconds
    t1: 15.2   // End time in seconds
  }
}
```

### Internal Events

The provider emits these events to registered callbacks:

```typescript
// Status changes
{
  type: "status_change",
  status: "connecting" | "connected" | "transcribing" | "reconnecting" | "error" | "stopped",
  message?: string
}

// Transcripts (interim + final)
{
  type: "transcript",
  segment: TranscriptionSegment
}

// Errors
{
  type: "error",
  error: string,
  code?: string,
  recoverable: boolean
}

// Connection events
{
  type: "connection_opened" | "connection_closed",
  timestamp: number
}
```

## Error Handling

### Connection Errors

**Scenario**: Cannot connect to Deepgram
**Handling**:
- Emit error event with recoverable: true
- Attempt reconnection with exponential backoff
- Max 5 retry attempts
- Delay: 1s, 2s, 4s, 8s, 16s

### API Key Errors

**Scenario**: Invalid or missing API key
**Handling**:
- Throw error immediately on start()
- Return 400 error to client
- Log error with details

### Audio Processing Errors

**Scenario**: Error sending audio to Deepgram
**Handling**:
- Log error but don't throw
- Continue accepting audio
- Connection likely recovering

### Transcript Processing Errors

**Scenario**: Malformed transcript data
**Handling**:
- Log error with details
- Skip the problematic transcript
- Continue processing next transcripts

## Performance Considerations

### Memory Usage

- Audio buffers are immediately forwarded to Deepgram
- No buffering or caching of audio data
- Transcripts are emitted immediately
- WebSocket clients receive events in real-time

### Network Usage

- Continuous WebSocket connection to Deepgram
- Audio sent in small chunks (100-200ms)
- Bandwidth: ~32 KB/s for 16kHz mono PCM
- Keep-alive pings: ~10 bytes every 10 seconds

### CPU Usage

- Minimal processing on server
- Audio encoding/decoding handled by client
- Transcript processing is lightweight
- Event broadcasting is efficient

## Testing

### Manual Testing

See [test-stt.sh](./test-stt.sh) for automated integration tests.

### Unit Testing

Test files to create:
- `src/stt/deepgram.test.ts` - Provider tests
- `src/stt/index.test.ts` - Manager tests
- `src/stt/types.test.ts` - Type validation tests

### Integration Testing

1. Start server
2. Run test script: `./test-stt.sh`
3. Connect WebSocket client
4. Send audio samples
5. Verify transcripts received

## Monitoring

### Logs

STT logs are prefixed with `[stt:deepgram]`:

```
[stt:deepgram] Status: connecting
[stt:deepgram] Connection opened
[stt:deepgram] Status: connected
[stt:deepgram] Status: transcribing
[stt:deepgram] Emitted TRANSCRIPT_SEGMENT: "Hello everyone..."
```

### Status Endpoint

Monitor via `GET /stt/status`:

```bash
curl http://localhost:3123/stt/status
```

### Health Checks

Include STT status in health endpoint:

```bash
curl http://localhost:3123/health
```

## Security

### API Key Protection

- API keys stored in environment variables
- Never committed to version control
- Never exposed in API responses
- Validated on startup

### Input Validation

- Audio data validated (base64 format)
- Configuration validated with Zod schemas
- Session ID required before starting STT
- Provider availability checked

### Rate Limiting

Consider implementing:
- Max audio chunks per second
- Max concurrent STT sessions
- Request throttling

## Cost Management

### Deepgram Pricing

- Pay-as-you-go: $0.0043/minute (nova-2)
- Billed by actual audio processed
- Free tier: $200 credits (~45,000 minutes)

### Cost Optimization

1. Only transcribe when needed
2. Stop STT when session ends
3. Use appropriate model (nova-2 recommended)
4. Monitor usage in Deepgram console
5. Set up billing alerts

## Future Enhancements

### Short Term

- [ ] AssemblyAI provider implementation
- [ ] Whisper (local) provider implementation
- [ ] Real-time caption overlay
- [ ] Transcript export (SRT, VTT, TXT)
- [ ] Speaker name mapping (speaker_0 → "John")

### Long Term

- [ ] Multi-language auto-detection
- [ ] Real-time translation
- [ ] Custom vocabulary management UI
- [ ] Transcript editing and correction
- [ ] Voice activity detection (VAD)
- [ ] Audio quality monitoring
- [ ] Usage analytics dashboard

## Troubleshooting

### Common Issues

1. **"Deepgram API key is required"**
   - Solution: Set `DEEPGRAM_API_KEY` in `.env`

2. **Connection timeout**
   - Check internet connectivity
   - Verify API key is valid
   - Check firewall settings

3. **No transcripts received**
   - Verify audio format (16kHz mono PCM)
   - Check audio contains speech
   - Enable debug logging

4. **Poor accuracy**
   - Use higher sample rate (44.1kHz)
   - Enable smart formatting
   - Add custom keywords
   - Try nova-2 model

See [STT_SETUP.md](./STT_SETUP.md#troubleshooting) for detailed troubleshooting.

## Support

- **Documentation**: See [STT_SETUP.md](./STT_SETUP.md)
- **Configuration**: See [DEEPGRAM_CONFIG.md](./DEEPGRAM_CONFIG.md)
- **Deepgram Docs**: https://developers.deepgram.com/
- **Issues**: Report on GitHub

## Changelog

### v0.1.0 (2024-01-06)

- Initial Deepgram integration
- Speaker diarization support
- Interim results support
- Automatic reconnection
- WebSocket event streaming
- Database persistence
- Complete API implementation
- Comprehensive documentation
