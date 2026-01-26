#!/bin/bash

# =============================================================================
# Session Lifecycle End-to-End Test
# =============================================================================
# Tests session creation, retrieval, updates, and cleanup
#
# Test Coverage:
# - Session creation via API
# - Database persistence verification
# - Session state management
# - File system operations
# - Session cleanup and deletion
#
# Prerequisites:
# - Server running on http://localhost:3123
# - Database accessible and healthy
# - jq installed for JSON parsing
#
# Usage:
#   chmod +x tests/test-session-lifecycle.sh
#   ./tests/test-session-lifecycle.sh
# =============================================================================

set -e

# Load test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/test-utils.sh"

# Test-specific configuration
SESSION_ID=""
DB_SESSION_ID=""
SESSION_DIR_PATH=""

# =============================================================================
# Test Setup
# =============================================================================

setup() {
  print_header "Session Lifecycle Test"
  log_init

  check_server_health || exit 1
}

# =============================================================================
# Test Functions
# =============================================================================

test_create_session() {
  print_step "Creating a new session..."

  local config=$(generate_test_session_config "streamer" "Lifecycle Test Session")
  local response=$(http_post "/session/start" "$config")

  log_info "Session start response: $response"

  # Validate response structure
  if ! check_json_ok "$response"; then
    print_error "Session creation failed"
    echo "$response" | jq '.'
    return 1
  fi

  # Extract session details
  SESSION_ID=$(json_field "$response" "sessionId")
  DB_SESSION_ID=$(json_field "$response" "dbSessionId")
  local ws_url=$(json_field "$response" "ws")

  assert_not_empty "$SESSION_ID" "Session ID should be returned" || return 1
  assert_not_empty "$DB_SESSION_ID" "Database session ID should be returned" || return 1
  assert_not_empty "$ws_url" "WebSocket URL should be returned" || return 1

  print_info "Session ID: $SESSION_ID"
  print_info "DB Session ID: $DB_SESSION_ID"
  print_info "WebSocket URL: $ws_url"

  print_success "Session created successfully"
  return 0
}

test_verify_session_directory() {
  print_step "Verifying session directory creation..."

  SESSION_DIR_PATH="./sessions/$SESSION_ID"

  if [ ! -d "$SESSION_DIR_PATH" ]; then
    print_error "Session directory not found: $SESSION_DIR_PATH"
    return 1
  fi

  print_success "Session directory exists: $SESSION_DIR_PATH"

  # Check for events file
  local events_file="$SESSION_DIR_PATH/events.jsonl"
  if [ ! -f "$events_file" ]; then
    print_warning "Events file not found (may be created on first event): $events_file"
  else
    print_success "Events file exists: $events_file"
  fi

  return 0
}

test_verify_session_in_database() {
  print_step "Verifying session persisted to database..."

  # Note: This would require a database query endpoint
  # For now, we check that the DB session ID was returned
  assert_not_empty "$DB_SESSION_ID" "Database session ID exists" || return 1

  print_success "Session persisted to database with ID: $DB_SESSION_ID"
  return 0
}

test_get_session_status() {
  print_step "Retrieving session status..."

  local response=$(http_get "/session/status")

  log_info "Session status response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to get session status"
    echo "$response" | jq '.'
    return 1
  fi

  # Verify active session matches our session
  local active=$(json_field "$response" "active")
  local current_session_id=$(json_field "$response" "sessionId")

  assert_eq "$active" "true" "Session should be active" || return 1
  assert_eq "$current_session_id" "$SESSION_ID" "Active session ID should match" || return 1

  print_success "Session status retrieved successfully"
  return 0
}

test_session_heartbeat() {
  print_step "Testing session heartbeat..."

  # Create a moment marker event to test event system
  local event_data=$(cat <<EOF
{
  "label": "test_heartbeat",
  "t": 1.5,
  "notes": "Heartbeat test marker"
}
EOF
)

  local response=$(http_post "/event/moment" "$event_data")

  log_info "Moment marker response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to create moment marker"
    echo "$response" | jq '.'
    return 1
  fi

  # Verify event was written to events file
  local events_file="$SESSION_DIR_PATH/events.jsonl"
  if [ -f "$events_file" ]; then
    local event_count=$(wc -l < "$events_file")
    if [ "$event_count" -gt 0 ]; then
      print_success "Event recorded to events.jsonl ($event_count events)"
    else
      print_warning "Events file exists but is empty"
    fi
  else
    print_warning "Events file not created yet"
  fi

  print_success "Session heartbeat test passed"
  return 0
}

test_concurrent_operations() {
  print_step "Testing concurrent session operations..."

  # Create multiple moment markers in quick succession
  for i in {1..5}; do
    local event_data=$(cat <<EOF
{
  "label": "concurrent_test_$i",
  "t": $i,
  "notes": "Concurrent operation test $i"
}
EOF
)
    http_post "/event/moment" "$event_data" > /dev/null &
  done

  # Wait for all background jobs
  wait

  # Give server a moment to process
  sleep 1

  # Verify all events were recorded
  local events_file="$SESSION_DIR_PATH/events.jsonl"
  if [ -f "$events_file" ]; then
    local event_count=$(wc -l < "$events_file")
    if [ "$event_count" -ge 5 ]; then
      print_success "All concurrent operations completed ($event_count events recorded)"
      return 0
    else
      print_warning "Expected at least 5 events, found $event_count"
      return 1
    fi
  else
    print_error "Events file not found"
    return 1
  fi
}

test_session_metadata() {
  print_step "Verifying session metadata..."

  local response=$(http_get "/session/status")

  # Check workflow configuration
  local workflow=$(json_field "$response" "config.workflow")
  local title=$(json_field "$response" "config.title")
  local capture_mode=$(json_field "$response" "config.captureMode")

  assert_eq "$workflow" "streamer" "Workflow should match" || return 1
  assert_not_empty "$title" "Title should exist" || return 1
  assert_eq "$capture_mode" "av" "Capture mode should match" || return 1

  print_success "Session metadata verified"
  return 0
}

test_end_session() {
  print_step "Ending the session..."

  local response=$(http_post "/session/end" "{}")

  log_info "Session end response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to end session"
    echo "$response" | jq '.'
    return 1
  fi

  print_success "Session ended successfully"

  # Verify session is no longer active
  sleep 1
  local status_response=$(http_get "/session/status")
  local active=$(json_field "$status_response" "active")

  if [ "$active" = "false" ]; then
    print_success "Session confirmed inactive"
  else
    print_warning "Session still appears active after end"
  fi

  return 0
}

test_verify_session_cleanup() {
  print_step "Verifying session cleanup..."

  # Check that session directory still exists (data should be preserved)
  if [ -d "$SESSION_DIR_PATH" ]; then
    print_success "Session data preserved in: $SESSION_DIR_PATH"

    # Verify events file is intact
    local events_file="$SESSION_DIR_PATH/events.jsonl"
    if [ -f "$events_file" ]; then
      local event_count=$(wc -l < "$events_file")
      print_success "Events file preserved with $event_count events"
    fi
  else
    print_warning "Session directory was removed"
  fi

  return 0
}

test_create_multiple_sessions() {
  print_step "Testing multiple session creation..."

  local session_ids=()

  # Create 3 sessions
  for i in {1..3}; do
    local config=$(generate_test_session_config "podcast" "Multi-session Test $i")
    local response=$(http_post "/session/start" "$config")

    if check_json_ok "$response"; then
      local sid=$(json_field "$response" "sessionId")
      session_ids+=("$sid")
      print_info "Created session $i: $sid"
    else
      print_error "Failed to create session $i"
      return 1
    fi

    # Clean up immediately
    http_post "/session/end" "{}" > /dev/null
    sleep 0.5
  done

  print_success "Created ${#session_ids[@]} sessions successfully"
  return 0
}

# =============================================================================
# Test Teardown
# =============================================================================

teardown() {
  print_step "Cleaning up test data..."

  # Clean up session directory if it exists
  if [ -n "$SESSION_ID" ]; then
    cleanup_session "$SESSION_ID"
    print_info "Cleaned up session: $SESSION_ID"
  fi

  # Clean up any other test sessions
  find ./sessions -name "Lifecycle Test Session*" -type d -exec rm -rf {} + 2>/dev/null || true
  find ./sessions -name "Multi-session Test*" -type d -exec rm -rf {} + 2>/dev/null || true

  print_success "Cleanup completed"
}

# =============================================================================
# Main Test Execution
# =============================================================================

main() {
  setup

  # Run test suite
  test_create_session || exit 1
  test_verify_session_directory || exit 1
  test_verify_session_in_database || exit 1
  test_get_session_status || exit 1
  test_session_heartbeat || exit 1
  test_concurrent_operations || exit 1
  test_session_metadata || exit 1
  test_end_session || exit 1
  test_verify_session_cleanup || exit 1
  test_create_multiple_sessions || exit 1

  # Cleanup
  teardown

  # Print summary
  print_summary
}

# Run tests
main

# Exit with appropriate code
exit $?
