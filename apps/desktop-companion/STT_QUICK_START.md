# Speech-to-Text Quick Start Guide

Get up and running with Deepgram STT in 5 minutes.

## Prerequisites

- Desktop Companion server running
- Node.js and npm/pnpm installed
- Deepgram account (free tier available)

## Step 1: Get Deepgram API Key (2 minutes)

1. Go to [https://console.deepgram.com/signup](https://console.deepgram.com/signup)
2. Sign up for a free account
3. Navigate to "API Keys" in the sidebar
4. Click "Create a New API Key"
5. Name it "Desktop Companion - Dev"
6. Copy the generated key

## Step 2: Configure Environment (1 minute)

Add to your `.env` file:

```bash
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=paste_your_api_key_here
```

## Step 3: Start the Server (1 minute)

```bash
cd apps/desktop-companion
pnpm dev
```

You should see:
```
[stt] STT Manager initialized
[api] Server started on port 3123
```

## Step 4: Test the Integration (1 minute)

### Option A: Automated Test Script

```bash
chmod +x test-stt.sh
./test-stt.sh
```

### Option B: Manual Testing

```bash
# 1. Start a session
curl -X POST http://localhost:3123/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "streamer",
    "captureMode": "av",
    "title": "Test Session"
  }'

# 2. Start STT
curl -X POST http://localhost:3123/stt/start \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en-US",
    "enableDiarization": true
  }'

# 3. Check status
curl http://localhost:3123/stt/status

# 4. Stop STT
curl -X POST http://localhost:3123/stt/stop
```

## Step 5: Listen for Transcripts

Connect a WebSocket client to receive real-time transcripts:

```javascript
const ws = new WebSocket('ws://127.0.0.1:3124');

ws.on('message', (data) => {
  const event = JSON.parse(data);

  if (event.type === 'TRANSCRIPT_SEGMENT') {
    console.log(`[${event.payload.speakerId}] ${event.payload.text}`);
  }
});
```

## What's Next?

- **Full Documentation**: See [STT_SETUP.md](./STT_SETUP.md)
- **Configuration Options**: See [DEEPGRAM_CONFIG.md](./DEEPGRAM_CONFIG.md)
- **Architecture Details**: See [STT_IMPLEMENTATION_SUMMARY.md](./STT_IMPLEMENTATION_SUMMARY.md)

## Common Issues

### "Deepgram API key is required"
Add `DEEPGRAM_API_KEY` to your `.env` file.

### "Connection timeout"
Check your internet connection and verify the API key is valid.

### No transcripts received
Ensure you're sending audio in the correct format (16kHz mono PCM, base64 encoded).

## Getting Help

- Check [STT_SETUP.md](./STT_SETUP.md#troubleshooting) for detailed troubleshooting
- Review logs with `LOG_LEVEL=debug`
- Open an issue on GitHub
