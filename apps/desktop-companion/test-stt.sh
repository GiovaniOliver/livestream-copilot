#!/bin/bash

# ============================================================================
# Deepgram STT Integration Test Script
# ============================================================================
# This script tests the Speech-to-Text integration with the desktop companion.
#
# Prerequisites:
# - Server running on http://localhost:3123
# - DEEPGRAM_API_KEY configured in .env
# - curl and jq installed
#
# Usage:
#   chmod +x test-stt.sh
#   ./test-stt.sh
# ============================================================================

set -e  # Exit on error

BASE_URL="http://localhost:3123"
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}"
echo "============================================"
echo "  Deepgram STT Integration Test"
echo "============================================"
echo -e "${COLOR_RESET}"

# Step 1: Check server health
echo -e "\n${COLOR_YELLOW}[1/6] Checking server health...${COLOR_RESET}"
HEALTH=$(curl -s "$BASE_URL/health")
echo "$HEALTH" | jq '.'

if [ "$(echo "$HEALTH" | jq -r '.ok')" != "true" ]; then
  echo -e "${COLOR_RED}ERROR: Server health check failed${COLOR_RESET}"
  exit 1
fi
echo -e "${COLOR_GREEN}✓ Server is healthy${COLOR_RESET}"

# Step 2: Check STT status
echo -e "\n${COLOR_YELLOW}[2/6] Checking STT provider availability...${COLOR_RESET}"
STT_STATUS=$(curl -s "$BASE_URL/stt/status")
echo "$STT_STATUS" | jq '.'

DEEPGRAM_AVAILABLE=$(echo "$STT_STATUS" | jq -r '.availableProviders[] | select(.name=="deepgram") | .available')
if [ "$DEEPGRAM_AVAILABLE" != "true" ]; then
  echo -e "${COLOR_RED}ERROR: Deepgram provider not available. Check DEEPGRAM_API_KEY in .env${COLOR_RESET}"
  exit 1
fi
echo -e "${COLOR_GREEN}✓ Deepgram provider is available${COLOR_RESET}"

# Step 3: Start a session
echo -e "\n${COLOR_YELLOW}[3/6] Starting a test session...${COLOR_RESET}"
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/session/start" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "streamer",
    "captureMode": "av",
    "title": "STT Integration Test",
    "participants": [
      {"id": "1", "name": "Tester"}
    ]
  }')
echo "$SESSION_RESPONSE" | jq '.'

if [ "$(echo "$SESSION_RESPONSE" | jq -r '.ok')" != "true" ]; then
  echo -e "${COLOR_RED}ERROR: Failed to start session${COLOR_RESET}"
  exit 1
fi

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.sessionId')
WS_URL=$(echo "$SESSION_RESPONSE" | jq -r '.ws')
echo -e "${COLOR_GREEN}✓ Session started: $SESSION_ID${COLOR_RESET}"
echo -e "${COLOR_BLUE}  WebSocket URL: $WS_URL${COLOR_RESET}"

# Step 4: Start STT
echo -e "\n${COLOR_YELLOW}[4/6] Starting STT transcription...${COLOR_RESET}"
STT_START_RESPONSE=$(curl -s -X POST "$BASE_URL/stt/start" \
  -H "Content-Type: application/json" \
  -d '{
    "audioSource": "microphone",
    "language": "en-US",
    "enableDiarization": true,
    "enableInterimResults": true,
    "enablePunctuation": true,
    "keywords": ["StreamDeck", "OBS", "Twitch"],
    "sampleRate": 16000,
    "channels": 1
  }')
echo "$STT_START_RESPONSE" | jq '.'

if [ "$(echo "$STT_START_RESPONSE" | jq -r '.ok')" != "true" ]; then
  echo -e "${COLOR_RED}ERROR: Failed to start STT${COLOR_RESET}"
  exit 1
fi

STT_PROVIDER=$(echo "$STT_START_RESPONSE" | jq -r '.provider')
STT_STATUS_VALUE=$(echo "$STT_START_RESPONSE" | jq -r '.status')
echo -e "${COLOR_GREEN}✓ STT started${COLOR_RESET}"
echo -e "${COLOR_BLUE}  Provider: $STT_PROVIDER${COLOR_RESET}"
echo -e "${COLOR_BLUE}  Status: $STT_STATUS_VALUE${COLOR_RESET}"

# Step 5: Check STT status again
echo -e "\n${COLOR_YELLOW}[5/6] Verifying STT is running...${COLOR_RESET}"
sleep 2  # Wait for connection to establish
STT_STATUS_RUNNING=$(curl -s "$BASE_URL/stt/status")
echo "$STT_STATUS_RUNNING" | jq '.'

ACTIVE=$(echo "$STT_STATUS_RUNNING" | jq -r '.active')
if [ "$ACTIVE" != "true" ]; then
  echo -e "${COLOR_RED}ERROR: STT is not active${COLOR_RESET}"
  exit 1
fi
echo -e "${COLOR_GREEN}✓ STT is active and running${COLOR_RESET}"

# Step 6: Stop STT
echo -e "\n${COLOR_YELLOW}[6/6] Stopping STT...${COLOR_RESET}"
STT_STOP_RESPONSE=$(curl -s -X POST "$BASE_URL/stt/stop")
echo "$STT_STOP_RESPONSE" | jq '.'

if [ "$(echo "$STT_STOP_RESPONSE" | jq -r '.ok')" != "true" ]; then
  echo -e "${COLOR_RED}ERROR: Failed to stop STT${COLOR_RESET}"
  exit 1
fi
echo -e "${COLOR_GREEN}✓ STT stopped successfully${COLOR_RESET}"

# Summary
echo -e "\n${COLOR_GREEN}"
echo "============================================"
echo "  All Tests Passed! ✓"
echo "============================================"
echo -e "${COLOR_RESET}"
echo ""
echo "Next steps:"
echo "1. Connect a WebSocket client to: $WS_URL"
echo "2. Start STT again with: curl -X POST $BASE_URL/stt/start"
echo "3. Send audio data via: curl -X POST $BASE_URL/stt/audio"
echo "4. Watch for TRANSCRIPT_SEGMENT events on WebSocket"
echo ""
echo "For detailed usage, see: STT_SETUP.md"
echo ""
