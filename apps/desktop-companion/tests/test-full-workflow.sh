#!/bin/bash

# =============================================================================
# Full Workflow Integration Test
# =============================================================================
# End-to-end test simulating a complete livestream capture workflow
#
# Test Coverage:
# - Complete session lifecycle
# - OBS integration with real capture
# - STT transcription flow
# - AI agent processing
# - Real-time WebSocket updates
# - Content export functionality
# - Database persistence
# - File system operations
#
# This test simulates a real livestream workflow:
# 1. Start session
# 2. Connect OBS
# 3. Start STT
# 4. Capture clips
# 5. Generate AI outputs
# 6. Monitor real-time events
# 7. Export content
# 8. End session
#
# Prerequisites:
# - Server running on http://localhost:3123
# - OBS Studio running with WebSocket enabled
# - Replay buffer configured
# - DEEPGRAM_API_KEY for STT
# - ANTHROPIC_API_KEY for agents
# - FFmpeg installed
# - websocat installed
# - jq installed
#
# Usage:
#   chmod +x tests/test-full-workflow.sh
#   ./tests/test-full-workflow.sh
# =============================================================================

set -e

# Load test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/test-utils.sh"

# Test-specific configuration
SESSION_ID=""
DB_SESSION_ID=""
WS_PID=""
WS_OUTPUT_FILE=""
CLIP_COUNT=0
OUTPUT_COUNT=0
TRANSCRIPT_COUNT=0

# =============================================================================
# Test Setup
# =============================================================================

setup() {
  print_header "Full Workflow Integration Test"
  log_init

  check_server_health || exit 1

  # Setup WebSocket listener
  WS_OUTPUT_FILE=$(mktemp)
  log_info "WebSocket output file: $WS_OUTPUT_FILE"
}

# =============================================================================
# Helper Functions
# =============================================================================

start_ws_listener() {
  if check_websocat; then
    print_step "Starting WebSocket listener..."
    websocat "$WS_URL" > "$WS_OUTPUT_FILE" 2>&1 &
    WS_PID=$!
    sleep 2

    if kill -0 $WS_PID 2>/dev/null; then
      print_success "WebSocket listener active"
    else
      print_warning "WebSocket listener failed to start"
      WS_PID=""
    fi
  fi
}

stop_ws_listener() {
  if [ -n "$WS_PID" ]; then
    kill $WS_PID 2>/dev/null || true
    wait $WS_PID 2>/dev/null || true
    WS_PID=""
  fi
}

collect_metrics() {
  local events_file="./sessions/$SESSION_ID/events.jsonl"

  if [ -f "$events_file" ]; then
    CLIP_COUNT=$(grep -c "ARTIFACT_CLIP_CREATED" "$events_file" 2>/dev/null || echo "0")
    OUTPUT_COUNT=$(grep -c "OUTPUT_CREATED" "$events_file" 2>/dev/null || echo "0")
    TRANSCRIPT_COUNT=$(grep -c "TRANSCRIPT_SEGMENT" "$events_file" 2>/dev/null || echo "0")
  fi
}

# =============================================================================
# Workflow Phases
# =============================================================================

phase_1_initialization() {
  print_header "Phase 1: System Initialization"

  print_step "Checking system prerequisites..."

  # Check OBS
  local obs_status=$(http_get "/obs/status")
  local obs_connected=$(json_field "$obs_status" "connected")

  if [ "$obs_connected" = "true" ]; then
    print_success "OBS connected"
  else
    print_error "OBS not connected"
    print_info "Start OBS Studio with WebSocket server enabled"
    return 1
  fi

  # Check STT
  local stt_status=$(http_get "/stt/status")
  local stt_available=$(echo "$stt_status" | jq -r '.availableProviders[] | select(.available==true) | .name' | head -n 1)

  if [ -n "$stt_available" ]; then
    print_success "STT provider available: $stt_available"
  else
    print_warning "No STT providers available"
  fi

  # Check agents
  local agent_status=$(http_get "/agents/status")
  local agents_enabled=$(json_field "$agent_status" "enabled")

  if [ "$agents_enabled" = "true" ]; then
    print_success "AI agents enabled"
  else
    print_warning "AI agents not enabled"
  fi

  # Check FFmpeg
  local ffmpeg_status=$(http_get "/ffmpeg/status")
  local ffmpeg_ready=$(json_field "$ffmpeg_status" "ready")

  if [ "$ffmpeg_ready" = "true" ]; then
    print_success "FFmpeg ready"
  else
    print_warning "FFmpeg not available"
  fi

  return 0
}

phase_2_session_start() {
  print_header "Phase 2: Session Creation"

  print_step "Starting livestream session..."

  local config=$(cat <<EOF
{
  "workflow": "streamer",
  "captureMode": "av",
  "title": "Full Workflow Test - $(date +%Y%m%d-%H%M%S)",
  "description": "Complete end-to-end workflow test",
  "participants": [
    {"id": "streamer_1", "name": "Test Streamer"},
    {"id": "guest_1", "name": "Test Guest"}
  ]
}
EOF
)

  local response=$(http_post "/session/start" "$config")

  if ! check_json_ok "$response"; then
    print_error "Failed to start session"
    return 1
  fi

  SESSION_ID=$(json_field "$response" "sessionId")
  DB_SESSION_ID=$(json_field "$response" "dbSessionId")
  local ws_url=$(json_field "$response" "ws")

  print_success "Session started"
  print_info "Session ID: $SESSION_ID"
  print_info "Database ID: $DB_SESSION_ID"
  print_info "WebSocket URL: $ws_url"

  # Verify session directory
  if [ -d "./sessions/$SESSION_ID" ]; then
    print_success "Session directory created"
  else
    print_error "Session directory not found"
    return 1
  fi

  # Start WebSocket monitoring
  start_ws_listener

  return 0
}

phase_3_obs_initialization() {
  print_header "Phase 3: OBS Integration"

  print_step "Initializing OBS replay buffer..."

  local replay_status=$(http_get "/obs/replay-buffer/status")
  local active=$(json_field "$replay_status" "active")

  if [ "$active" != "true" ]; then
    print_info "Starting replay buffer..."
    local start_response=$(http_post "/obs/replay-buffer/start" "{}")

    if check_json_ok "$start_response"; then
      print_success "Replay buffer started"
    else
      print_error "Failed to start replay buffer"
      return 1
    fi
  else
    print_success "Replay buffer already active"
  fi

  sleep 2
  return 0
}

phase_4_stt_capture() {
  print_header "Phase 4: Speech-to-Text Capture"

  print_step "Starting STT transcription..."

  local stt_config=$(cat <<EOF
{
  "audioSource": "microphone",
  "language": "en-US",
  "enableDiarization": true,
  "enableInterimResults": true,
  "enablePunctuation": true,
  "keywords": ["gaming", "stream", "chat"],
  "sampleRate": 16000,
  "channels": 1
}
EOF
)

  local response=$(http_post "/stt/start" "$stt_config")

  if ! check_json_ok "$response"; then
    print_warning "STT not available, continuing without transcription"
    return 0
  fi

  print_success "STT started"

  # Simulate audio streaming by sending test transcript segments
  print_step "Simulating transcript capture..."

  local test_transcripts=(
    '{"speakerId": "streamer_1", "text": "Hey everyone, welcome to the stream! Today we have something really special planned.", "t0": 1.0, "t1": 8.0}'
    '{"speakerId": "streamer_1", "text": "We are going to build an amazing AI-powered system live on stream. This is going to be epic!", "t0": 9.0, "t1": 16.0}'
    '{"speakerId": "guest_1", "text": "Yeah, I am super excited about this. The technology we are using is cutting edge.", "t0": 17.0, "t1": 24.0}'
    '{"speakerId": "streamer_1", "text": "Let me show you what we have built so far. Chat, you are going to love this.", "t0": 25.0, "t1": 31.0}'
  )

  for transcript in "${test_transcripts[@]}"; do
    http_post "/event/transcript" "$transcript" > /dev/null
    sleep 2
  done

  print_success "Transcript segments captured (${#test_transcripts[@]} segments)"

  # Give agents time to process
  sleep 5

  return 0
}

phase_5_clip_capture() {
  print_header "Phase 5: Clip Capture"

  print_step "Capturing highlight clips..."

  # Capture multiple clips
  local clip_markers=(
    '{"start": 5.0, "end": 12.0, "label": "Amazing Intro"}'
    '{"start": 18.0, "end": 28.0, "label": "Technical Discussion"}'
    '{"start": 30.0, "end": 38.0, "label": "Demo Showcase"}'
  )

  for marker_data in "${clip_markers[@]}"; do
    local start_t=$(echo "$marker_data" | jq -r '.start')
    local end_t=$(echo "$marker_data" | jq -r '.end')
    local label=$(echo "$marker_data" | jq -r '.label')

    print_info "Capturing clip: $label (${start_t}s - ${end_t}s)"

    # Mark clip start
    http_post "/clip/start" "{\"t\": $start_t, \"source\": \"api\"}" > /dev/null

    # Mark clip end
    http_post "/clip/end" "{\"t\": $end_t, \"source\": \"api\"}" > /dev/null

    # Capture clip
    local capture_response=$(http_post "/clip/capture" "{}")

    if check_json_ok "$capture_response"; then
      local artifact_id=$(json_field "$capture_response" "artifactId")
      print_success "Clip captured: $artifact_id"
    else
      print_warning "Clip capture failed for: $label"
    fi

    sleep 2
  done

  # Save replay buffer
  print_step "Saving replay buffer..."
  local replay_response=$(http_post "/obs/replay-buffer/save" "{}")

  if check_json_ok "$replay_response"; then
    print_success "Replay buffer saved"
  else
    print_warning "Replay buffer save failed"
  fi

  return 0
}

phase_6_agent_processing() {
  print_header "Phase 6: AI Agent Processing"

  print_step "Waiting for agent processing..."
  print_info "Agents are analyzing content and generating outputs..."

  # Wait for agents to process
  sleep 15

  # Check for outputs
  collect_metrics

  print_info "Generated outputs: $OUTPUT_COUNT"
  print_info "Processed transcripts: $TRANSCRIPT_COUNT"

  if [ "$OUTPUT_COUNT" -gt 0 ]; then
    print_success "Agents generated outputs"

    # Retrieve outputs
    local outputs_response=$(http_get "/outputs?sessionId=$SESSION_ID")

    if check_json_ok "$outputs_response"; then
      echo "$outputs_response" | jq -r '.outputs[] | "  [\(.category)] \(.text | .[0:60])..."' | while read line; do
        print_info "$line"
      done
    fi
  else
    print_warning "No outputs generated (agents may be disabled)"
  fi

  return 0
}

phase_7_realtime_monitoring() {
  print_header "Phase 7: Real-Time Event Monitoring"

  if [ -z "$WS_PID" ]; then
    print_warning "WebSocket listener not active, skipping monitoring"
    return 0
  fi

  print_step "Analyzing real-time event stream..."

  local ws_message_count=$(grep -c '"type":' "$WS_OUTPUT_FILE" 2>/dev/null || echo "0")
  print_info "Total WebSocket messages: $ws_message_count"

  # Count by event type
  local ws_transcript=$(grep -c "TRANSCRIPT_SEGMENT" "$WS_OUTPUT_FILE" 2>/dev/null || echo "0")
  local ws_clips=$(grep -c "ARTIFACT_CLIP_CREATED" "$WS_OUTPUT_FILE" 2>/dev/null || echo "0")
  local ws_outputs=$(grep -c "OUTPUT_CREATED" "$WS_OUTPUT_FILE" 2>/dev/null || echo "0")

  print_info "  TRANSCRIPT_SEGMENT: $ws_transcript"
  print_info "  ARTIFACT_CLIP_CREATED: $ws_clips"
  print_info "  OUTPUT_CREATED: $ws_outputs"

  if [ "$ws_message_count" -gt 0 ]; then
    print_success "Real-time events received via WebSocket"
  else
    print_warning "No WebSocket events captured"
  fi

  return 0
}

phase_8_content_export() {
  print_header "Phase 8: Content Export"

  print_step "Testing export functionality..."

  # Check if export endpoint exists
  local export_formats=$(http_get "/export/formats")

  if check_json_ok "$export_formats"; then
    print_success "Export functionality available"

    # List available formats
    echo "$export_formats" | jq -r '.formats[] | "  - \(.)"' | while read line; do
      print_info "$line"
    done

    # Trigger export
    print_step "Exporting session data..."
    local export_request=$(cat <<EOF
{
  "sessionId": "$SESSION_ID",
  "format": "json",
  "includeClips": true,
  "includeTranscripts": true,
  "includeOutputs": true
}
EOF
)

    local export_response=$(http_post "/export/create" "$export_request")

    if check_json_ok "$export_response"; then
      local export_id=$(json_field "$export_response" "exportId")
      local export_path=$(json_field "$export_response" "path")

      print_success "Export created: $export_id"
      print_info "Export path: $export_path"
    else
      print_warning "Export creation failed"
    fi
  else
    print_warning "Export functionality not available"
  fi

  return 0
}

phase_9_session_end() {
  print_header "Phase 9: Session Finalization"

  print_step "Stopping STT..."
  http_post "/stt/stop" "{}" > /dev/null || true

  print_step "Ending session..."
  local end_response=$(http_post "/session/end" "{}")

  if check_json_ok "$end_response"; then
    print_success "Session ended successfully"
  else
    print_error "Failed to end session properly"
  fi

  # Verify session is inactive
  sleep 1
  local status=$(http_get "/session/status")
  local active=$(json_field "$status" "active")

  if [ "$active" = "false" ]; then
    print_success "Session confirmed inactive"
  else
    print_warning "Session still appears active"
  fi

  return 0
}

phase_10_verification() {
  print_header "Phase 10: Data Verification"

  print_step "Verifying session artifacts..."

  # Check session directory
  if [ -d "./sessions/$SESSION_ID" ]; then
    print_success "Session directory preserved"

    # Count files
    local file_count=$(find "./sessions/$SESSION_ID" -type f | wc -l)
    print_info "Total files: $file_count"

    # Check for specific artifacts
    [ -f "./sessions/$SESSION_ID/events.jsonl" ] && print_info "  ✓ events.jsonl"
    [ -f "./sessions/$SESSION_ID/metadata.json" ] && print_info "  ✓ metadata.json"

    # Count clips
    local clip_files=$(find "./sessions/$SESSION_ID" -name "*.mp4" -o -name "*.mkv" | wc -l)
    print_info "  ✓ $clip_files clip file(s)"

    # Count thumbnails
    local thumb_files=$(find "./sessions/$SESSION_ID" -name "*thumbnail*" | wc -l)
    print_info "  ✓ $thumb_files thumbnail(s)"
  else
    print_warning "Session directory not found"
  fi

  # Final metrics
  collect_metrics

  print_step "Final workflow metrics:"
  print_info "  Transcripts processed: $TRANSCRIPT_COUNT"
  print_info "  Clips captured: $CLIP_COUNT"
  print_info "  AI outputs generated: $OUTPUT_COUNT"

  return 0
}

# =============================================================================
# Test Teardown
# =============================================================================

teardown() {
  print_step "Cleaning up test data..."

  # Stop WebSocket listener
  stop_ws_listener

  # Clean up temp files
  [ -f "$WS_OUTPUT_FILE" ] && rm -f "$WS_OUTPUT_FILE"

  # Clean up session (optional - keep for inspection)
  # if [ -n "$SESSION_ID" ]; then
  #   cleanup_session "$SESSION_ID"
  # fi

  print_success "Cleanup completed"
  print_info "Session data preserved at: ./sessions/$SESSION_ID"
}

# =============================================================================
# Main Test Execution
# =============================================================================

main() {
  setup

  # Execute workflow phases
  phase_1_initialization || exit 1
  phase_2_session_start || exit 1
  phase_3_obs_initialization || exit 1
  phase_4_stt_capture || exit 1
  phase_5_clip_capture || exit 1
  phase_6_agent_processing || exit 1
  phase_7_realtime_monitoring || exit 1
  phase_8_content_export || exit 1
  phase_9_session_end || exit 1
  phase_10_verification || exit 1

  # Cleanup
  teardown

  # Print summary
  print_summary

  # Final message
  echo ""
  echo -e "${COLOR_GREEN}============================================${COLOR_RESET}"
  echo -e "${COLOR_GREEN}  Full Workflow Test Complete!${COLOR_RESET}"
  echo -e "${COLOR_GREEN}============================================${COLOR_RESET}"
  echo ""
  echo "Test Results:"
  echo "  Session ID: $SESSION_ID"
  echo "  Transcripts: $TRANSCRIPT_COUNT"
  echo "  Clips: $CLIP_COUNT"
  echo "  Outputs: $OUTPUT_COUNT"
  echo ""
  echo "Session data saved to: ./sessions/$SESSION_ID"
  echo ""
}

# Run tests
main

# Exit with appropriate code
exit $?
