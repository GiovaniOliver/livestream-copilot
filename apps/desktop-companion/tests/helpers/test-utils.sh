#!/bin/bash

# =============================================================================
# Test Utilities
# =============================================================================
# Common helper functions for FluxBoard E2E tests
# =============================================================================

# Colors for output
export COLOR_GREEN='\033[0;32m'
export COLOR_RED='\033[0;31m'
export COLOR_YELLOW='\033[1;33m'
export COLOR_BLUE='\033[0;34m'
export COLOR_CYAN='\033[0;36m'
export COLOR_MAGENTA='\033[0;35m'
export COLOR_RESET='\033[0m'

# Test configuration
export BASE_URL="${BASE_URL:-http://localhost:3123}"
export WS_URL="${WS_URL:-ws://localhost:3124}"
export TEST_TIMEOUT="${TEST_TIMEOUT:-30}"
export RETRY_COUNT="${RETRY_COUNT:-3}"
export RETRY_DELAY="${RETRY_DELAY:-2}"

# Test state
export TEST_START_TIME
export TEST_STEP=0
export TEST_FAILURES=0
export TEST_PASSES=0
export TEST_NAME=""

# Logging
export LOG_DIR="./tests/logs"
export LOG_FILE="${LOG_DIR}/test-run-$(date +%Y%m%d-%H%M%S).log"

# =============================================================================
# Logging Functions
# =============================================================================

log_init() {
  mkdir -p "$LOG_DIR"
  TEST_START_TIME=$(date +%s)
  echo "Test run started at $(date)" > "$LOG_FILE"
}

log_message() {
  local level=$1
  shift
  local message="$@"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

log_info() {
  log_message "INFO" "$@"
}

log_error() {
  log_message "ERROR" "$@"
}

log_debug() {
  log_message "DEBUG" "$@"
}

log_request() {
  local method=$1
  local endpoint=$2
  local body=${3:-""}

  log_debug "REQUEST: $method $endpoint"
  if [ -n "$body" ]; then
    log_debug "BODY: $body"
  fi
}

log_response() {
  local status=$1
  local body=$2

  log_debug "RESPONSE: HTTP $status"
  log_debug "BODY: $body"
}

# =============================================================================
# Output Functions
# =============================================================================

print_header() {
  local title="$1"
  echo -e "${COLOR_BLUE}"
  echo "============================================"
  echo "  $title"
  echo "============================================"
  echo -e "${COLOR_RESET}"
  log_info "TEST: $title"
  TEST_NAME="$title"
}

print_step() {
  TEST_STEP=$((TEST_STEP + 1))
  echo -e "\n${COLOR_YELLOW}[$TEST_STEP] $1${COLOR_RESET}"
  log_info "STEP $TEST_STEP: $1"
}

print_success() {
  echo -e "${COLOR_GREEN}✓ $1${COLOR_RESET}"
  log_info "SUCCESS: $1"
  TEST_PASSES=$((TEST_PASSES + 1))
}

print_error() {
  echo -e "${COLOR_RED}✗ $1${COLOR_RESET}"
  log_error "FAILURE: $1"
  TEST_FAILURES=$((TEST_FAILURES + 1))
}

print_warning() {
  echo -e "${COLOR_YELLOW}⚠ $1${COLOR_RESET}"
  log_message "WARN" "$1"
}

print_info() {
  echo -e "${COLOR_CYAN}  $1${COLOR_RESET}"
  log_info "$1"
}

print_summary() {
  local total=$((TEST_PASSES + TEST_FAILURES))
  local end_time=$(date +%s)
  local duration=$((end_time - TEST_START_TIME))

  echo ""
  echo -e "${COLOR_BLUE}============================================${COLOR_RESET}"
  echo -e "${COLOR_BLUE}  Test Summary${COLOR_RESET}"
  echo -e "${COLOR_BLUE}============================================${COLOR_RESET}"
  echo -e "Test Name:    ${TEST_NAME}"
  echo -e "Total Tests:  ${total}"
  echo -e "Passed:       ${COLOR_GREEN}${TEST_PASSES}${COLOR_RESET}"
  echo -e "Failed:       ${COLOR_RED}${TEST_FAILURES}${COLOR_RESET}"
  echo -e "Duration:     ${duration}s"
  echo -e "Log File:     ${LOG_FILE}"
  echo ""

  log_info "Test completed: ${TEST_PASSES} passed, ${TEST_FAILURES} failed in ${duration}s"

  if [ $TEST_FAILURES -eq 0 ]; then
    echo -e "${COLOR_GREEN}All tests passed! ✓${COLOR_RESET}"
    return 0
  else
    echo -e "${COLOR_RED}Some tests failed!${COLOR_RESET}"
    return 1
  fi
}

# =============================================================================
# HTTP Request Functions
# =============================================================================

http_get() {
  local endpoint=$1
  local url="${BASE_URL}${endpoint}"

  log_request "GET" "$endpoint"

  local response=$(curl -s -w "\n%{http_code}" "$url")
  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)

  log_response "$status" "$body"

  echo "$body"
  return $status
}

http_post() {
  local endpoint=$1
  local data=$2
  local url="${BASE_URL}${endpoint}"

  log_request "POST" "$endpoint" "$data"

  local response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
    -H "Content-Type: application/json" \
    -d "$data")

  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)

  log_response "$status" "$body"

  echo "$body"
  return $status
}

http_post_raw() {
  local endpoint=$1
  local data=$2
  local content_type=${3:-"application/octet-stream"}
  local url="${BASE_URL}${endpoint}"

  log_request "POST" "$endpoint" "(binary data)"

  local response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
    -H "Content-Type: $content_type" \
    --data-binary "$data")

  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)

  log_response "$status" "$body"

  echo "$body"
  return $status
}

# =============================================================================
# JSON Helper Functions
# =============================================================================

check_json_ok() {
  local response=$1
  local ok=$(echo "$response" | jq -r '.ok // "null"')

  if [ "$ok" = "true" ]; then
    return 0
  else
    return 1
  fi
}

json_field() {
  local response=$1
  local field=$2
  local default=${3:-"null"}

  echo "$response" | jq -r ".${field} // \"${default}\""
}

json_exists() {
  local response=$1
  local field=$2

  local value=$(echo "$response" | jq -r "has(\"${field}\")")
  [ "$value" = "true" ]
}

# =============================================================================
# Validation Functions
# =============================================================================

assert_eq() {
  local actual=$1
  local expected=$2
  local description=${3:-"Values should be equal"}

  if [ "$actual" = "$expected" ]; then
    print_success "$description (expected: $expected, got: $actual)"
    return 0
  else
    print_error "$description (expected: $expected, got: $actual)"
    return 1
  fi
}

assert_not_empty() {
  local value=$1
  local description=${2:-"Value should not be empty"}

  if [ -n "$value" ] && [ "$value" != "null" ]; then
    print_success "$description (got: $value)"
    return 0
  else
    print_error "$description (got empty or null)"
    return 1
  fi
}

assert_file_exists() {
  local filepath=$1
  local description=${2:-"File should exist"}

  if [ -f "$filepath" ]; then
    print_success "$description ($filepath)"
    return 0
  else
    print_error "$description ($filepath not found)"
    return 1
  fi
}

assert_json_field() {
  local response=$1
  local field=$2
  local expected=$3
  local description=${4:-"JSON field $field should equal $expected"}

  local actual=$(json_field "$response" "$field")
  assert_eq "$actual" "$expected" "$description"
}

# =============================================================================
# Health Check Functions
# =============================================================================

wait_for_server() {
  local max_attempts=${1:-30}
  local delay=${2:-1}

  print_step "Waiting for server to be ready..."

  for i in $(seq 1 $max_attempts); do
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
      print_success "Server is ready"
      return 0
    fi

    if [ $i -eq $max_attempts ]; then
      print_error "Server did not become ready after $max_attempts attempts"
      return 1
    fi

    echo -n "."
    sleep $delay
  done
}

check_server_health() {
  print_step "Checking server health..."

  local response=$(http_get "/health")

  if check_json_ok "$response"; then
    print_success "Server health check passed"
    return 0
  else
    print_error "Server health check failed"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    return 1
  fi
}

# =============================================================================
# Retry Logic
# =============================================================================

retry_command() {
  local max_attempts=$1
  local delay=$2
  shift 2
  local command="$@"

  for i in $(seq 1 $max_attempts); do
    if eval "$command"; then
      return 0
    fi

    if [ $i -lt $max_attempts ]; then
      sleep $delay
    fi
  done

  return 1
}

# =============================================================================
# Cleanup Functions
# =============================================================================

cleanup_test_files() {
  local pattern=$1

  if [ -n "$pattern" ]; then
    log_info "Cleaning up test files: $pattern"
    find ./sessions -name "$pattern" -type f -delete 2>/dev/null || true
  fi
}

cleanup_session() {
  local session_id=$1

  if [ -n "$session_id" ]; then
    log_info "Cleaning up session: $session_id"
    rm -rf "./sessions/$session_id" 2>/dev/null || true
  fi
}

# =============================================================================
# WebSocket Testing (requires websocat)
# =============================================================================

check_websocat() {
  if ! command -v websocat &> /dev/null; then
    print_warning "websocat not found. WebSocket tests will be skipped."
    print_info "Install with: cargo install websocat"
    return 1
  fi
  return 0
}

ws_connect_test() {
  local ws_url=$1
  local timeout=${2:-5}

  if ! check_websocat; then
    return 1
  fi

  timeout $timeout websocat -t "$ws_url" < /dev/null > /dev/null 2>&1
}

# =============================================================================
# Test Data Generators
# =============================================================================

generate_test_session_config() {
  local workflow=${1:-"streamer"}
  local title=${2:-"Test Session $(date +%s)"}

  cat <<EOF
{
  "workflow": "$workflow",
  "captureMode": "av",
  "title": "$title",
  "participants": [
    {"id": "test-user-1", "name": "Test User 1"},
    {"id": "test-user-2", "name": "Test User 2"}
  ]
}
EOF
}

generate_test_audio_chunk() {
  # Generate 1 second of silence as test audio data (16-bit PCM, 16kHz mono)
  dd if=/dev/zero bs=32000 count=1 2>/dev/null | base64
}

# =============================================================================
# Export test utilities
# =============================================================================

export -f log_init log_message log_info log_error log_debug log_request log_response
export -f print_header print_step print_success print_error print_warning print_info print_summary
export -f http_get http_post http_post_raw
export -f check_json_ok json_field json_exists
export -f assert_eq assert_not_empty assert_file_exists assert_json_field
export -f wait_for_server check_server_health
export -f retry_command
export -f cleanup_test_files cleanup_session
export -f check_websocat ws_connect_test
export -f generate_test_session_config generate_test_audio_chunk

log_info "Test utilities loaded"
