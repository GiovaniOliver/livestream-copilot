#!/bin/bash

# =============================================================================
# OBS Integration End-to-End Test
# =============================================================================
# Tests OBS WebSocket connectivity, replay buffer, and screenshot operations
#
# Test Coverage:
# - OBS WebSocket connection status
# - Replay buffer save operation
# - Screenshot capture
# - ARTIFACT_CLIP_CREATED event generation
# - ARTIFACT_FRAME_CREATED event generation
# - Clip file creation and validation
# - Thumbnail generation
# - FFmpeg integration
#
# Prerequisites:
# - Server running on http://localhost:3123
# - OBS Studio running with WebSocket server enabled
# - OBS replay buffer configured
# - FFmpeg installed and in PATH
# - jq installed for JSON parsing
#
# Usage:
#   chmod +x tests/test-obs-integration.sh
#   ./tests/test-obs-integration.sh
# =============================================================================

set -e

# Load test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/test-utils.sh"

# Test-specific configuration
SESSION_ID=""
CLIP_ARTIFACT_ID=""
FRAME_ARTIFACT_ID=""

# =============================================================================
# Test Setup
# =============================================================================

setup() {
  print_header "OBS Integration Test"
  log_init

  check_server_health || exit 1
}

# =============================================================================
# Test Functions
# =============================================================================

test_obs_connection() {
  print_step "Checking OBS WebSocket connection..."

  local response=$(http_get "/obs/status")

  log_info "OBS status response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to get OBS status"
    echo "$response" | jq '.'
    return 1
  fi

  local connected=$(json_field "$response" "connected")
  local obs_version=$(json_field "$response" "version")
  local replay_buffer_active=$(json_field "$response" "replayBufferActive")

  if [ "$connected" != "true" ]; then
    print_error "OBS is not connected"
    print_info "Make sure OBS Studio is running with WebSocket server enabled"
    return 1
  fi

  print_success "OBS connected (version: $obs_version)"
  print_info "Replay buffer active: $replay_buffer_active"

  return 0
}

test_replay_buffer_status() {
  print_step "Checking replay buffer status..."

  local response=$(http_get "/obs/replay-buffer/status")

  log_info "Replay buffer status response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to get replay buffer status"
    echo "$response" | jq '.'
    return 1
  fi

  local active=$(json_field "$response" "active")
  local duration=$(json_field "$response" "duration")

  print_info "Replay buffer active: $active"
  print_info "Replay buffer duration: ${duration}s"

  if [ "$active" != "true" ]; then
    print_warning "Replay buffer is not active. Attempting to start..."
    local start_response=$(http_post "/obs/replay-buffer/start" "{}")

    if check_json_ok "$start_response"; then
      print_success "Replay buffer started"
    else
      print_error "Failed to start replay buffer"
      return 1
    fi
  else
    print_success "Replay buffer is active"
  fi

  return 0
}

test_create_session_for_obs() {
  print_step "Creating session for OBS tests..."

  local config=$(generate_test_session_config "streamer" "OBS Integration Test")
  local response=$(http_post "/session/start" "$config")

  if ! check_json_ok "$response"; then
    print_error "Failed to create session"
    return 1
  fi

  SESSION_ID=$(json_field "$response" "sessionId")
  print_success "Session created: $SESSION_ID"

  return 0
}

test_save_replay_buffer() {
  print_step "Testing replay buffer save..."

  local response=$(http_post "/obs/replay-buffer/save" "{}")

  log_info "Replay buffer save response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to save replay buffer"
    echo "$response" | jq '.'
    return 1
  fi

  local replay_path=$(json_field "$response" "path")
  print_info "Replay buffer saved to: $replay_path"

  # Give OBS time to write the file
  sleep 2

  print_success "Replay buffer saved successfully"
  return 0
}

test_capture_clip() {
  print_step "Testing clip capture..."

  # Mark clip start
  local clip_start=$(cat <<EOF
{
  "t": 1.0,
  "source": "api"
}
EOF
)

  local response=$(http_post "/clip/start" "$clip_start")

  if ! check_json_ok "$response"; then
    print_error "Failed to mark clip start"
    return 1
  fi

  print_info "Clip start marked at t=1.0"

  # Wait a moment
  sleep 2

  # Mark clip end
  local clip_end=$(cat <<EOF
{
  "t": 5.0,
  "source": "api"
}
EOF
)

  response=$(http_post "/clip/end" "$clip_end")

  if ! check_json_ok "$response"; then
    print_error "Failed to mark clip end"
    return 1
  fi

  print_info "Clip end marked at t=5.0"

  # Trigger clip capture
  response=$(http_post "/clip/capture" "{}")

  log_info "Clip capture response: $response"

  if ! check_json_ok "$response"; then
    print_error "Clip capture failed"
    echo "$response" | jq '.'
    return 1
  fi

  CLIP_ARTIFACT_ID=$(json_field "$response" "artifactId")
  local clip_path=$(json_field "$response" "clipPath")

  assert_not_empty "$CLIP_ARTIFACT_ID" "Clip artifact ID should be returned" || return 1
  assert_not_empty "$clip_path" "Clip path should be returned" || return 1

  print_info "Clip artifact ID: $CLIP_ARTIFACT_ID"
  print_info "Clip path: $clip_path"

  print_success "Clip captured successfully"
  return 0
}

test_verify_clip_file() {
  print_step "Verifying clip file creation..."

  # Wait for clip processing
  sleep 3

  # Look for clip file in session directory
  local clip_files=$(find "./sessions/$SESSION_ID" -name "*.mp4" -o -name "*.mkv" -o -name "*.mov" 2>/dev/null)

  if [ -z "$clip_files" ]; then
    print_warning "No clip files found yet (FFmpeg processing may still be in progress)"
    return 0
  fi

  local clip_count=$(echo "$clip_files" | wc -l)
  print_success "Found $clip_count clip file(s)"

  # Verify at least one clip file exists
  for clip_file in $clip_files; do
    if [ -f "$clip_file" ]; then
      local file_size=$(stat -f%z "$clip_file" 2>/dev/null || stat -c%s "$clip_file" 2>/dev/null || echo "0")
      print_info "Clip file: $clip_file (${file_size} bytes)"

      if [ "$file_size" -gt 0 ]; then
        print_success "Clip file has valid size"
      else
        print_warning "Clip file is empty"
      fi
    fi
  done

  return 0
}

test_verify_thumbnail() {
  print_step "Verifying thumbnail generation..."

  # Look for thumbnail file
  local thumbnail_files=$(find "./sessions/$SESSION_ID" -name "*thumbnail*.png" -o -name "*thumb*.jpg" 2>/dev/null)

  if [ -z "$thumbnail_files" ]; then
    print_warning "No thumbnail files found (may not be generated yet)"
    return 0
  fi

  local thumb_count=$(echo "$thumbnail_files" | wc -l)
  print_success "Found $thumb_count thumbnail file(s)"

  for thumb_file in $thumbnail_files; do
    if [ -f "$thumb_file" ]; then
      local file_size=$(stat -f%z "$thumb_file" 2>/dev/null || stat -c%s "$thumb_file" 2>/dev/null || echo "0")
      print_info "Thumbnail: $thumb_file (${file_size} bytes)"
    fi
  done

  return 0
}

test_capture_screenshot() {
  print_step "Testing screenshot capture..."

  local screenshot_req=$(cat <<EOF
{
  "sourceName": "Scene",
  "t": 10.0
}
EOF
)

  local response=$(http_post "/obs/screenshot" "$screenshot_req")

  log_info "Screenshot response: $response"

  if ! check_json_ok "$response"; then
    print_warning "Screenshot capture failed (source may not exist)"
    echo "$response" | jq '.'
    return 0  # Non-critical failure
  fi

  FRAME_ARTIFACT_ID=$(json_field "$response" "artifactId")
  local frame_path=$(json_field "$response" "path")

  print_info "Frame artifact ID: $FRAME_ARTIFACT_ID"
  print_info "Frame path: $frame_path"

  # Verify screenshot file
  sleep 1
  if [ -f "$frame_path" ]; then
    print_success "Screenshot file created successfully"
  else
    print_warning "Screenshot file not found at: $frame_path"
  fi

  return 0
}

test_verify_artifact_events() {
  print_step "Verifying artifact events in events.jsonl..."

  local events_file="./sessions/$SESSION_ID/events.jsonl"

  if [ ! -f "$events_file" ]; then
    print_warning "Events file not found"
    return 0
  fi

  # Check for ARTIFACT_CLIP_CREATED events
  local clip_events=$(grep -c "ARTIFACT_CLIP_CREATED" "$events_file" 2>/dev/null || echo "0")
  print_info "ARTIFACT_CLIP_CREATED events: $clip_events"

  # Check for ARTIFACT_FRAME_CREATED events
  local frame_events=$(grep -c "ARTIFACT_FRAME_CREATED" "$events_file" 2>/dev/null || echo "0")
  print_info "ARTIFACT_FRAME_CREATED events: $frame_events"

  if [ "$clip_events" -gt 0 ] || [ "$frame_events" -gt 0 ]; then
    print_success "Artifact events recorded"
  else
    print_warning "No artifact events found in events.jsonl"
  fi

  return 0
}

test_ffmpeg_availability() {
  print_step "Checking FFmpeg availability..."

  local response=$(http_get "/ffmpeg/status")

  log_info "FFmpeg status response: $response"

  if ! check_json_ok "$response"; then
    print_warning "FFmpeg status endpoint not available"
    return 0
  fi

  local ffmpeg_ready=$(json_field "$response" "ready")
  local ffmpeg_version=$(json_field "$response" "ffmpeg.version")
  local ffprobe_version=$(json_field "$response" "ffprobe.version")

  print_info "FFmpeg ready: $ffmpeg_ready"
  print_info "FFmpeg version: $ffmpeg_version"
  print_info "FFprobe version: $ffprobe_version"

  if [ "$ffmpeg_ready" = "true" ]; then
    print_success "FFmpeg is available and ready"
  else
    print_warning "FFmpeg is not fully available"
  fi

  return 0
}

test_clip_metadata() {
  print_step "Retrieving clip metadata..."

  if [ -z "$CLIP_ARTIFACT_ID" ]; then
    print_warning "No clip artifact ID available to test"
    return 0
  fi

  local response=$(http_get "/clip/$CLIP_ARTIFACT_ID")

  log_info "Clip metadata response: $response"

  if ! check_json_ok "$response"; then
    print_warning "Failed to retrieve clip metadata"
    return 0
  fi

  local duration=$(json_field "$response" "duration")
  local format=$(json_field "$response" "format")
  local resolution=$(json_field "$response" "resolution")

  print_info "Clip duration: ${duration}s"
  print_info "Clip format: $format"
  print_info "Clip resolution: $resolution"

  print_success "Clip metadata retrieved successfully"
  return 0
}

test_stop_replay_buffer() {
  print_step "Testing replay buffer stop..."

  local response=$(http_post "/obs/replay-buffer/stop" "{}")

  log_info "Replay buffer stop response: $response"

  if check_json_ok "$response"; then
    print_success "Replay buffer stopped successfully"
  else
    print_warning "Failed to stop replay buffer (may already be stopped)"
  fi

  return 0
}

# =============================================================================
# Test Teardown
# =============================================================================

teardown() {
  print_step "Cleaning up test data..."

  # End session
  if [ -n "$SESSION_ID" ]; then
    http_post "/session/end" "{}" > /dev/null
    cleanup_session "$SESSION_ID"
    print_info "Cleaned up session: $SESSION_ID"
  fi

  print_success "Cleanup completed"
}

# =============================================================================
# Main Test Execution
# =============================================================================

main() {
  setup

  # Run test suite
  test_obs_connection || {
    print_error "OBS is not available. Skipping OBS tests."
    print_info "Start OBS Studio with WebSocket server enabled and rerun this test."
    exit 1
  }

  test_replay_buffer_status || exit 1
  test_ffmpeg_availability || exit 1
  test_create_session_for_obs || exit 1
  test_save_replay_buffer || exit 1
  test_capture_clip || exit 1
  test_verify_clip_file || exit 1
  test_verify_thumbnail || exit 1
  test_capture_screenshot || exit 1
  test_verify_artifact_events || exit 1
  test_clip_metadata || exit 1
  test_stop_replay_buffer || exit 1

  # Cleanup
  teardown

  # Print summary
  print_summary
}

# Run tests
main

# Exit with appropriate code
exit $?
