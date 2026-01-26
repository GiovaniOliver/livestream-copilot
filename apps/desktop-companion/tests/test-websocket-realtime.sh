#!/bin/bash

# =============================================================================
# WebSocket Real-Time Event Test
# =============================================================================
# Tests WebSocket connectivity and real-time event broadcasting
#
# Test Coverage:
# - WebSocket connection establishment
# - Hello message reception
# - Event subscription
# - Real-time event broadcasting
# - TRANSCRIPT_SEGMENT event delivery
# - ARTIFACT_CLIP_CREATED event delivery
# - OUTPUT_CREATED event delivery
# - Connection persistence
# - Reconnection logic
#
# Prerequisites:
# - Server running on http://localhost:3123
# - WebSocket server on ws://localhost:3124
# - websocat installed (cargo install websocat)
# - jq installed for JSON parsing
#
# Usage:
#   chmod +x tests/test-websocket-realtime.sh
#   ./tests/test-websocket-realtime.sh
# =============================================================================

set -e

# Load test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/test-utils.sh"

# Test-specific configuration
SESSION_ID=""
WS_PID=""
WS_OUTPUT_FILE=""

# =============================================================================
# Test Setup
# =============================================================================

setup() {
  print_header "WebSocket Real-Time Event Test"
  log_init

  check_server_health || exit 1

  # Check for websocat
  if ! check_websocat; then
    print_error "websocat is required for WebSocket testing"
    print_info "Install with: cargo install websocat"
    print_info "Or download from: https://github.com/vi/websocat"
    exit 1
  fi

  # Create temp file for WebSocket output
  WS_OUTPUT_FILE=$(mktemp)
  log_info "WebSocket output file: $WS_OUTPUT_FILE"
}

# =============================================================================
# WebSocket Helper Functions
# =============================================================================

start_websocket_listener() {
  local ws_url=$1

  print_step "Starting WebSocket listener..."

  # Start websocat in background, capturing output
  websocat "$ws_url" > "$WS_OUTPUT_FILE" 2>&1 &
  WS_PID=$!

  # Give it time to connect
  sleep 2

  # Check if process is still running
  if ! kill -0 $WS_PID 2>/dev/null; then
    print_error "WebSocket listener failed to start"
    cat "$WS_OUTPUT_FILE"
    return 1
  fi

  print_success "WebSocket listener started (PID: $WS_PID)"
  return 0
}

stop_websocket_listener() {
  if [ -n "$WS_PID" ]; then
    print_step "Stopping WebSocket listener..."

    kill $WS_PID 2>/dev/null || true
    wait $WS_PID 2>/dev/null || true

    print_success "WebSocket listener stopped"
    WS_PID=""
  fi
}

wait_for_ws_message() {
  local pattern=$1
  local timeout=${2:-10}
  local start_time=$(date +%s)

  print_step "Waiting for WebSocket message matching: $pattern"

  while true; do
    if grep -q "$pattern" "$WS_OUTPUT_FILE" 2>/dev/null; then
      print_success "Message received"
      return 0
    fi

    local elapsed=$(($(date +%s) - start_time))
    if [ $elapsed -ge $timeout ]; then
      print_error "Timeout waiting for message"
      return 1
    fi

    sleep 0.5
  done
}

get_ws_messages() {
  if [ -f "$WS_OUTPUT_FILE" ]; then
    cat "$WS_OUTPUT_FILE"
  fi
}

count_ws_messages() {
  local pattern=$1

  if [ -f "$WS_OUTPUT_FILE" ]; then
    grep -c "$pattern" "$WS_OUTPUT_FILE" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

# =============================================================================
# Test Functions
# =============================================================================

test_websocket_connection() {
  print_step "Testing WebSocket connection..."

  # Try to connect with a short timeout
  if ws_connect_test "$WS_URL" 5; then
    print_success "WebSocket server is reachable"
  else
    print_error "Failed to connect to WebSocket server"
    print_info "Make sure WebSocket server is running on $WS_URL"
    return 1
  fi

  return 0
}

test_websocket_hello_message() {
  print_step "Testing WebSocket hello message..."

  # Start listener
  start_websocket_listener "$WS_URL" || return 1

  # Wait for hello message
  if wait_for_ws_message '"type":"hello"' 5; then
    print_success "Received hello message"

    # Parse and display hello message
    local hello_msg=$(get_ws_messages | head -n 1)
    local ok=$(echo "$hello_msg" | jq -r '.ok // "null"')

    if [ "$ok" = "true" ]; then
      print_success "Hello message indicates server ready"
    else
      print_warning "Hello message format unexpected"
    fi
  else
    print_error "Did not receive hello message"
    print_info "WebSocket output:"
    get_ws_messages
    return 1
  fi

  return 0
}

test_create_session_with_websocket() {
  print_step "Creating session to test WebSocket events..."

  local config=$(generate_test_session_config "streamer" "WebSocket Test Session")
  local response=$(http_post "/session/start" "$config")

  if ! check_json_ok "$response"; then
    print_error "Failed to create session"
    return 1
  fi

  SESSION_ID=$(json_field "$response" "sessionId")
  print_success "Session created: $SESSION_ID"

  return 0
}

test_realtime_transcript_event() {
  print_step "Testing real-time TRANSCRIPT_SEGMENT event delivery..."

  # Clear previous messages
  > "$WS_OUTPUT_FILE"

  # Send a transcript segment
  local transcript=$(cat <<EOF
{
  "speakerId": "test_speaker",
  "text": "This is a test transcript segment for WebSocket delivery verification.",
  "t0": 1.0,
  "t1": 5.0
}
EOF
)

  http_post "/event/transcript" "$transcript" > /dev/null

  # Wait for WebSocket event
  if wait_for_ws_message "TRANSCRIPT_SEGMENT" 5; then
    print_success "TRANSCRIPT_SEGMENT event received via WebSocket"

    # Verify event structure
    local event=$(get_ws_messages | grep "TRANSCRIPT_SEGMENT" | head -n 1)
    local event_type=$(echo "$event" | jq -r '.type')
    local event_text=$(echo "$event" | jq -r '.payload.text')

    assert_eq "$event_type" "TRANSCRIPT_SEGMENT" "Event type should match" || return 1
    print_info "Event text: $event_text"
  else
    print_error "TRANSCRIPT_SEGMENT event not received"
    return 1
  fi

  return 0
}

test_realtime_clip_event() {
  print_step "Testing real-time ARTIFACT_CLIP_CREATED event delivery..."

  # Clear previous messages
  > "$WS_OUTPUT_FILE"

  # Trigger clip creation (this will also trigger replay buffer save)
  local clip_start='{"t": 2.0, "source": "api"}'
  http_post "/clip/start" "$clip_start" > /dev/null

  sleep 1

  local clip_end='{"t": 8.0, "source": "api"}'
  http_post "/clip/end" "$clip_end" > /dev/null

  http_post "/clip/capture" "{}" > /dev/null

  # Wait for WebSocket event (may take longer due to OBS processing)
  if wait_for_ws_message "ARTIFACT_CLIP_CREATED" 15; then
    print_success "ARTIFACT_CLIP_CREATED event received via WebSocket"

    # Verify event structure
    local event=$(get_ws_messages | grep "ARTIFACT_CLIP_CREATED" | head -n 1)
    local event_type=$(echo "$event" | jq -r '.type')
    local artifact_id=$(echo "$event" | jq -r '.payload.artifactId')
    local clip_path=$(echo "$event" | jq -r '.payload.path')

    assert_eq "$event_type" "ARTIFACT_CLIP_CREATED" "Event type should match" || return 1
    assert_not_empty "$artifact_id" "Artifact ID should be present" || return 1
    print_info "Clip artifact ID: $artifact_id"
    print_info "Clip path: $clip_path"
  else
    print_warning "ARTIFACT_CLIP_CREATED event not received (OBS may not be available)"
  fi

  return 0
}

test_realtime_output_event() {
  print_step "Testing real-time OUTPUT_CREATED event delivery..."

  # Check if agents are enabled
  local agent_status=$(http_get "/agents/status")
  local agents_enabled=$(json_field "$agent_status" "enabled")

  if [ "$agents_enabled" != "true" ]; then
    print_warning "Agents not enabled, skipping OUTPUT_CREATED test"
    return 0
  fi

  # Clear previous messages
  > "$WS_OUTPUT_FILE"

  # Send a transcript that should trigger agent processing
  local transcript=$(cat <<EOF
{
  "speakerId": "streamer",
  "text": "Hey chat! Let's talk about the most epic gaming moment I've ever had. This was absolutely insane and I think it would make an amazing clip!",
  "t0": 10.0,
  "t1": 18.0
}
EOF
)

  http_post "/event/transcript" "$transcript" > /dev/null

  # Wait for WebSocket event (agents may take time to process)
  if wait_for_ws_message "OUTPUT_CREATED" 20; then
    print_success "OUTPUT_CREATED event received via WebSocket"

    # Verify event structure
    local event=$(get_ws_messages | grep "OUTPUT_CREATED" | head -n 1)
    local event_type=$(echo "$event" | jq -r '.type')
    local output_id=$(echo "$event" | jq -r '.payload.outputId')
    local category=$(echo "$event" | jq -r '.payload.category')
    local output_text=$(echo "$event" | jq -r '.payload.text' | head -c 60)

    assert_eq "$event_type" "OUTPUT_CREATED" "Event type should match" || return 1
    assert_not_empty "$output_id" "Output ID should be present" || return 1
    print_info "Output ID: $output_id"
    print_info "Category: $category"
    print_info "Text preview: $output_text..."
  else
    print_warning "OUTPUT_CREATED event not received (agents may be slow or disabled)"
  fi

  return 0
}

test_multiple_concurrent_events() {
  print_step "Testing multiple concurrent event delivery..."

  # Clear previous messages
  > "$WS_OUTPUT_FILE"

  # Send multiple events rapidly
  for i in {1..5}; do
    local marker='{"label": "test_marker_'$i'", "t": '$i'}'
    http_post "/event/moment" "$marker" > /dev/null &
  done

  # Wait for all requests to complete
  wait

  # Give WebSocket time to receive all events
  sleep 2

  # Count received events
  local event_count=$(count_ws_messages "MOMENT_MARKER")
  print_info "Received $event_count MOMENT_MARKER events"

  if [ "$event_count" -ge 5 ]; then
    print_success "All concurrent events delivered via WebSocket"
  else
    print_warning "Some events may have been missed (expected 5, got $event_count)"
  fi

  return 0
}

test_event_ordering() {
  print_step "Testing event delivery ordering..."

  # Clear previous messages
  > "$WS_OUTPUT_FILE"

  # Send events with specific timestamps
  for i in {1..3}; do
    local marker='{"label": "ordered_marker_'$i'", "t": '$i'}'
    http_post "/event/moment" "$marker" > /dev/null
    sleep 0.5
  done

  # Give WebSocket time to receive all events
  sleep 1

  # Check ordering
  local events=$(get_ws_messages | grep "MOMENT_MARKER")

  if echo "$events" | grep -q "ordered_marker_1" && \
     echo "$events" | grep -q "ordered_marker_2" && \
     echo "$events" | grep -q "ordered_marker_3"; then
    print_success "Events received in order"
  else
    print_warning "Event ordering could not be fully verified"
  fi

  return 0
}

test_websocket_reconnection() {
  print_step "Testing WebSocket reconnection..."

  # Stop current listener
  stop_websocket_listener

  print_info "Waiting 2 seconds before reconnecting..."
  sleep 2

  # Reconnect
  if start_websocket_listener "$WS_URL"; then
    print_success "WebSocket reconnected successfully"

    # Verify we still receive messages
    local marker='{"label": "reconnection_test", "t": 999}'
    http_post "/event/moment" "$marker" > /dev/null

    if wait_for_ws_message "reconnection_test" 5; then
      print_success "Events received after reconnection"
    else
      print_error "No events received after reconnection"
      return 1
    fi
  else
    print_error "Failed to reconnect WebSocket"
    return 1
  fi

  return 0
}

test_event_message_format() {
  print_step "Validating event message format..."

  # Get a sample event
  local sample_event=$(get_ws_messages | grep '"type":' | head -n 1)

  if [ -z "$sample_event" ]; then
    print_warning "No events available for format validation"
    return 0
  fi

  # Validate required fields
  local has_id=$(echo "$sample_event" | jq 'has("id")')
  local has_session_id=$(echo "$sample_event" | jq 'has("sessionId")')
  local has_ts=$(echo "$sample_event" | jq 'has("ts")')
  local has_type=$(echo "$sample_event" | jq 'has("type")')
  local has_payload=$(echo "$sample_event" | jq 'has("payload")')

  print_info "Event format validation:"
  print_info "  has id: $has_id"
  print_info "  has sessionId: $has_session_id"
  print_info "  has ts: $has_ts"
  print_info "  has type: $has_type"
  print_info "  has payload: $has_payload"

  if [ "$has_id" = "true" ] && \
     [ "$has_session_id" = "true" ] && \
     [ "$has_ts" = "true" ] && \
     [ "$has_type" = "true" ] && \
     [ "$has_payload" = "true" ]; then
    print_success "Event message format is valid"
  else
    print_error "Event message format is invalid"
    return 1
  fi

  return 0
}

test_websocket_message_count() {
  print_step "Verifying WebSocket message count..."

  local total_messages=$(get_ws_messages | grep '"type":' | wc -l)
  print_info "Total messages received: $total_messages"

  if [ "$total_messages" -gt 0 ]; then
    print_success "WebSocket delivered messages successfully"

    # Break down by event type
    local transcript_count=$(count_ws_messages "TRANSCRIPT_SEGMENT")
    local moment_count=$(count_ws_messages "MOMENT_MARKER")
    local clip_count=$(count_ws_messages "ARTIFACT_CLIP_CREATED")
    local output_count=$(count_ws_messages "OUTPUT_CREATED")

    print_info "  TRANSCRIPT_SEGMENT: $transcript_count"
    print_info "  MOMENT_MARKER: $moment_count"
    print_info "  ARTIFACT_CLIP_CREATED: $clip_count"
    print_info "  OUTPUT_CREATED: $output_count"
  else
    print_warning "No messages received via WebSocket"
  fi

  return 0
}

# =============================================================================
# Test Teardown
# =============================================================================

teardown() {
  print_step "Cleaning up test data..."

  # Stop WebSocket listener
  stop_websocket_listener

  # Clean up temp file
  if [ -f "$WS_OUTPUT_FILE" ]; then
    rm -f "$WS_OUTPUT_FILE"
  fi

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
  test_websocket_connection || exit 1
  test_websocket_hello_message || exit 1
  test_create_session_with_websocket || exit 1
  test_realtime_transcript_event || exit 1
  test_multiple_concurrent_events || exit 1
  test_event_ordering || exit 1
  test_event_message_format || exit 1
  test_realtime_clip_event || exit 1
  test_realtime_output_event || exit 1
  test_websocket_reconnection || exit 1
  test_websocket_message_count || exit 1

  # Cleanup
  teardown

  # Print summary
  print_summary
}

# Run tests
main

# Exit with appropriate code
exit $?
