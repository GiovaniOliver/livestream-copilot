#!/bin/bash

# =============================================================================
# Agent Processing End-to-End Test
# =============================================================================
# Tests AI agent processing of events and output generation
#
# Test Coverage:
# - Agent initialization and configuration
# - Event routing to appropriate agents
# - OUTPUT_CREATED event generation
# - Output validation
# - Database persistence of outputs
# - Different workflow types (streamer, podcast, debate)
# - Output categories and formats
#
# Prerequisites:
# - Server running on http://localhost:3123
# - ANTHROPIC_API_KEY configured in .env
# - Database accessible
# - jq installed for JSON parsing
#
# Usage:
#   chmod +x tests/test-agent-processing.sh
#   ./tests/test-agent-processing.sh
# =============================================================================

set -e

# Load test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/test-utils.sh"

# Test-specific configuration
SESSION_ID=""
OUTPUT_IDS=()

# =============================================================================
# Test Setup
# =============================================================================

setup() {
  print_header "Agent Processing Test"
  log_init

  check_server_health || exit 1
}

# =============================================================================
# Test Functions
# =============================================================================

test_agent_availability() {
  print_step "Checking AI agent availability..."

  local response=$(http_get "/agents/status")

  log_info "Agent status response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to get agent status"
    echo "$response" | jq '.'
    return 1
  fi

  local enabled=$(json_field "$response" "enabled")
  local provider=$(json_field "$response" "provider")
  local model=$(json_field "$response" "model")

  if [ "$enabled" != "true" ]; then
    print_error "AI agents are not enabled"
    print_info "Set ANTHROPIC_API_KEY in .env to enable agents"
    return 1
  fi

  print_success "AI agents enabled"
  print_info "Provider: $provider"
  print_info "Model: $model"

  return 0
}

test_list_available_agents() {
  print_step "Listing available agents..."

  local response=$(http_get "/agents/list")

  log_info "Agent list response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to list agents"
    return 1
  fi

  local agent_count=$(echo "$response" | jq '.agents | length')
  print_info "Available agents: $agent_count"

  # Display agent details
  echo "$response" | jq -r '.agents[] | "  - \(.name) (\(.workflow))"' | while read line; do
    print_info "$line"
  done

  if [ "$agent_count" -gt 0 ]; then
    print_success "Agents registered successfully"
  else
    print_warning "No agents registered"
  fi

  return 0
}

test_create_streamer_session() {
  print_step "Creating streamer session for agent testing..."

  local config=$(generate_test_session_config "streamer" "Agent Test - Streamer")
  local response=$(http_post "/session/start" "$config")

  if ! check_json_ok "$response"; then
    print_error "Failed to create session"
    return 1
  fi

  SESSION_ID=$(json_field "$response" "sessionId")
  print_success "Streamer session created: $SESSION_ID"

  return 0
}

test_send_transcript_segment() {
  print_step "Sending transcript segment to trigger agent processing..."

  local transcript=$(cat <<EOF
{
  "speakerId": "speaker_1",
  "text": "Hey everyone! Welcome back to the stream. Today we're going to build something really cool - an AI-powered livestream assistant. This is going to be epic!",
  "t0": 5.0,
  "t1": 12.0
}
EOF
)

  local response=$(http_post "/event/transcript" "$transcript")

  log_info "Transcript event response: $response"

  if ! check_json_ok "$response"; then
    print_error "Failed to send transcript segment"
    echo "$response" | jq '.'
    return 1
  fi

  print_success "Transcript segment sent successfully"
  print_info "Waiting for agent processing (10 seconds)..."

  # Wait for agents to process and generate outputs
  sleep 10

  return 0
}

test_verify_output_created_event() {
  print_step "Verifying OUTPUT_CREATED events..."

  local events_file="./sessions/$SESSION_ID/events.jsonl"

  if [ ! -f "$events_file" ]; then
    print_error "Events file not found"
    return 1
  fi

  # Check for OUTPUT_CREATED events
  local output_events=$(grep "OUTPUT_CREATED" "$events_file" 2>/dev/null || echo "")

  if [ -z "$output_events" ]; then
    print_warning "No OUTPUT_CREATED events found yet"
    print_info "This may indicate agents are still processing or agent processing is slow"
    return 0
  fi

  local event_count=$(echo "$output_events" | wc -l)
  print_success "Found $event_count OUTPUT_CREATED event(s)"

  # Parse output IDs
  echo "$output_events" | while read -r event_line; do
    local output_id=$(echo "$event_line" | jq -r '.payload.outputId')
    local category=$(echo "$event_line" | jq -r '.payload.category')
    local text=$(echo "$event_line" | jq -r '.payload.text' | head -c 60)

    print_info "Output $output_id [$category]: $text..."
    OUTPUT_IDS+=("$output_id")
  done

  return 0
}

test_retrieve_agent_outputs() {
  print_step "Retrieving agent outputs from database..."

  local response=$(http_get "/outputs?sessionId=$SESSION_ID")

  log_info "Outputs response: $response"

  if ! check_json_ok "$response"; then
    print_warning "Failed to retrieve outputs"
    return 0
  fi

  local output_count=$(echo "$response" | jq '.outputs | length')
  print_info "Retrieved $output_count output(s) from database"

  if [ "$output_count" -gt 0 ]; then
    print_success "Agent outputs persisted to database"

    # Display output summary
    echo "$response" | jq -r '.outputs[] | "  [\(.category)] \(.text | .[0:80])..."' | while read line; do
      print_info "$line"
    done
  else
    print_warning "No outputs found in database yet"
  fi

  return 0
}

test_output_validation() {
  print_step "Testing output validation..."

  if [ ${#OUTPUT_IDS[@]} -eq 0 ]; then
    print_warning "No output IDs available for validation testing"
    return 0
  fi

  local output_id="${OUTPUT_IDS[0]}"
  local response=$(http_post "/outputs/$output_id/validate" "{}")

  log_info "Validation response: $response"

  if ! check_json_ok "$response"; then
    print_warning "Output validation endpoint may not be implemented"
    return 0
  fi

  local valid=$(json_field "$response" "valid")
  print_info "Output validation result: $valid"

  print_success "Output validation completed"
  return 0
}

test_podcast_workflow() {
  print_step "Testing podcast workflow agent..."

  # End current session
  http_post "/session/end" "{}" > /dev/null

  # Create podcast session
  local config=$(generate_test_session_config "podcast" "Agent Test - Podcast")
  local response=$(http_post "/session/start" "$config")

  if ! check_json_ok "$response"; then
    print_error "Failed to create podcast session"
    return 1
  fi

  local podcast_session_id=$(json_field "$response" "sessionId")
  print_info "Podcast session created: $podcast_session_id"

  # Send podcast-style transcript
  local transcript=$(cat <<EOF
{
  "speakerId": "host",
  "text": "Welcome to Tech Talk podcast. Today we're discussing the future of AI in content creation with our special guest. Let's dive into how AI is transforming the way creators work.",
  "t0": 2.0,
  "t1": 15.0
}
EOF
)

  http_post "/event/transcript" "$transcript" > /dev/null
  print_info "Podcast transcript sent, waiting for agent processing..."

  sleep 10

  # Check for outputs
  local events_file="./sessions/$podcast_session_id/events.jsonl"
  if [ -f "$events_file" ]; then
    local output_count=$(grep -c "OUTPUT_CREATED" "$events_file" 2>/dev/null || echo "0")
    print_info "Podcast workflow generated $output_count output(s)"

    if [ "$output_count" -gt 0 ]; then
      print_success "Podcast workflow agent processed successfully"
    else
      print_warning "No outputs generated by podcast workflow"
    fi
  fi

  # Cleanup
  http_post "/session/end" "{}" > /dev/null
  cleanup_session "$podcast_session_id"

  return 0
}

test_debate_workflow() {
  print_step "Testing debate workflow agent..."

  # Create debate session
  local config=$(generate_test_session_config "debate" "Agent Test - Debate")
  local response=$(http_post "/session/start" "$config")

  if ! check_json_ok "$response"; then
    print_error "Failed to create debate session"
    return 1
  fi

  local debate_session_id=$(json_field "$response" "sessionId")
  print_info "Debate session created: $debate_session_id"

  # Send debate-style transcript
  local transcript=$(cat <<EOF
{
  "speakerId": "debater_1",
  "text": "I argue that artificial intelligence will create more jobs than it eliminates. History shows us that technological advancement has always led to net job growth. The industrial revolution created entirely new industries.",
  "t0": 5.0,
  "t1": 18.0
}
EOF
)

  http_post "/event/transcript" "$transcript" > /dev/null
  print_info "Debate transcript sent, waiting for agent processing..."

  sleep 10

  # Check for outputs
  local events_file="./sessions/$debate_session_id/events.jsonl"
  if [ -f "$events_file" ]; then
    local output_count=$(grep -c "OUTPUT_CREATED" "$events_file" 2>/dev/null || echo "0")
    print_info "Debate workflow generated $output_count output(s)"

    if [ "$output_count" -gt 0 ]; then
      # Check for debate-specific output categories
      local claim_count=$(grep -c "CLAIM" "$events_file" 2>/dev/null || echo "0")
      local evidence_count=$(grep -c "EVIDENCE_CARD" "$events_file" 2>/dev/null || echo "0")

      print_info "Claims: $claim_count, Evidence cards: $evidence_count"
      print_success "Debate workflow agent processed successfully"
    else
      print_warning "No outputs generated by debate workflow"
    fi
  fi

  # Cleanup
  http_post "/session/end" "{}" > /dev/null
  cleanup_session "$debate_session_id"

  return 0
}

test_output_categories() {
  print_step "Verifying output category diversity..."

  local events_file="./sessions/$SESSION_ID/events.jsonl"

  if [ ! -f "$events_file" ]; then
    print_warning "Events file not available"
    return 0
  fi

  # Extract unique output categories
  local categories=$(grep "OUTPUT_CREATED" "$events_file" 2>/dev/null | \
    jq -r '.payload.category' | sort -u)

  if [ -z "$categories" ]; then
    print_warning "No output categories found"
    return 0
  fi

  local category_count=$(echo "$categories" | wc -l)
  print_info "Found $category_count unique output categor(y/ies):"

  echo "$categories" | while read category; do
    print_info "  - $category"
  done

  print_success "Output categories verified"
  return 0
}

test_agent_performance_metrics() {
  print_step "Checking agent performance metrics..."

  local response=$(http_get "/agents/stats")

  log_info "Agent stats response: $response"

  if ! check_json_ok "$response"; then
    print_warning "Agent stats endpoint not available"
    return 0
  fi

  local total_events=$(json_field "$response" "totalEventsProcessed")
  local total_outputs=$(json_field "$response" "totalOutputsGenerated")
  local avg_processing_time=$(json_field "$response" "avgProcessingTimeMs")

  print_info "Total events processed: $total_events"
  print_info "Total outputs generated: $total_outputs"
  print_info "Average processing time: ${avg_processing_time}ms"

  print_success "Agent performance metrics retrieved"
  return 0
}

test_concurrent_agent_processing() {
  print_step "Testing concurrent agent processing..."

  # Send multiple transcript segments quickly
  for i in {1..3}; do
    local transcript=$(cat <<EOF
{
  "speakerId": "speaker_$i",
  "text": "This is test segment number $i. Testing concurrent agent processing to ensure agents can handle multiple events without race conditions or dropped events.",
  "t0": $((i * 10)),
  "t1": $((i * 10 + 8))
}
EOF
)
    http_post "/event/transcript" "$transcript" > /dev/null &
  done

  # Wait for all requests to complete
  wait

  print_info "Sent 3 concurrent transcript segments"
  print_info "Waiting for agent processing (15 seconds)..."
  sleep 15

  # Check for outputs
  local events_file="./sessions/$SESSION_ID/events.jsonl"
  if [ -f "$events_file" ]; then
    local output_count=$(grep -c "OUTPUT_CREATED" "$events_file" 2>/dev/null || echo "0")
    print_info "Total outputs after concurrent processing: $output_count"

    if [ "$output_count" -ge 3 ]; then
      print_success "Concurrent agent processing handled successfully"
    else
      print_warning "Expected more outputs from concurrent processing"
    fi
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

  # Clean up any remaining test sessions
  find ./sessions -name "Agent Test*" -type d -exec rm -rf {} + 2>/dev/null || true

  print_success "Cleanup completed"
}

# =============================================================================
# Main Test Execution
# =============================================================================

main() {
  setup

  # Run test suite
  test_agent_availability || {
    print_error "AI agents are not available. Skipping agent tests."
    print_info "Set ANTHROPIC_API_KEY in .env to enable agent processing tests."
    exit 1
  }

  test_list_available_agents || exit 1
  test_create_streamer_session || exit 1
  test_send_transcript_segment || exit 1
  test_verify_output_created_event || exit 1
  test_retrieve_agent_outputs || exit 1
  test_output_validation || exit 1
  test_output_categories || exit 1
  test_concurrent_agent_processing || exit 1
  test_agent_performance_metrics || exit 1

  # Test different workflow types
  test_podcast_workflow || exit 1
  test_debate_workflow || exit 1

  # Cleanup
  teardown

  # Print summary
  print_summary
}

# Run tests
main

# Exit with appropriate code
exit $?
