#!/bin/bash

# =============================================================================
# FluxBoard Test Suite Runner
# =============================================================================
# Master test runner for all FluxBoard end-to-end tests
#
# Test Suites:
# 1. Session Lifecycle - Session CRUD operations
# 2. OBS Integration - OBS WebSocket and clip capture
# 3. Agent Processing - AI agent outputs and validation
# 4. WebSocket Real-Time - Event broadcasting and delivery
# 5. Full Workflow - Complete end-to-end integration
#
# Prerequisites:
# - Server running on http://localhost:3123
# - OBS Studio running (for OBS tests)
# - API keys configured (for STT and agents)
# - Required tools: jq, websocat (optional)
#
# Usage:
#   chmod +x tests/run-all-tests.sh
#   ./tests/run-all-tests.sh [options]
#
# Options:
#   --quick          Run only essential tests (session, basic workflow)
#   --skip-obs       Skip OBS integration tests
#   --skip-agents    Skip agent processing tests
#   --skip-ws        Skip WebSocket tests
#   --only <test>    Run only specified test (lifecycle|obs|agents|ws|workflow)
#   --parallel       Run tests in parallel (experimental)
#   --verbose        Show detailed output
#   --help           Show this help message
# =============================================================================

set -e

# Load test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/helpers/test-utils.sh"

# Test configuration
RUN_MODE="all"
SKIP_OBS=false
SKIP_AGENTS=false
SKIP_WS=false
PARALLEL=false
VERBOSE=false

# Test results
declare -A TEST_RESULTS
TEST_START_TIME=$(date +%s)
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# =============================================================================
# Argument Parsing
# =============================================================================

show_help() {
  cat << EOF
FluxBoard Test Suite Runner

Usage: $0 [options]

Options:
  --quick          Run only essential tests (session, basic workflow)
  --skip-obs       Skip OBS integration tests
  --skip-agents    Skip agent processing tests
  --skip-ws        Skip WebSocket tests
  --only <test>    Run only specified test:
                   - lifecycle: Session lifecycle tests
                   - obs: OBS integration tests
                   - agents: Agent processing tests
                   - ws: WebSocket real-time tests
                   - workflow: Full workflow integration
  --parallel       Run tests in parallel (experimental)
  --verbose        Show detailed output from test scripts
  --help           Show this help message

Examples:
  # Run all tests
  $0

  # Run quick tests only
  $0 --quick

  # Run specific test suite
  $0 --only lifecycle

  # Skip optional components
  $0 --skip-obs --skip-agents

  # Run with verbose output
  $0 --verbose

Prerequisites:
  - Server running on http://localhost:3123
  - OBS Studio (for OBS tests)
  - API keys configured in .env
  - Tools: jq, websocat (optional for WebSocket tests)

EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --help)
        show_help
        exit 0
        ;;
      --quick)
        RUN_MODE="quick"
        shift
        ;;
      --skip-obs)
        SKIP_OBS=true
        shift
        ;;
      --skip-agents)
        SKIP_AGENTS=true
        shift
        ;;
      --skip-ws)
        SKIP_WS=true
        shift
        ;;
      --only)
        RUN_MODE="only"
        ONLY_TEST="$2"
        shift 2
        ;;
      --parallel)
        PARALLEL=true
        shift
        ;;
      --verbose)
        VERBOSE=true
        shift
        ;;
      *)
        echo "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
}

# =============================================================================
# Test Execution Functions
# =============================================================================

run_test() {
  local test_name=$1
  local test_script=$2
  local test_description=$3

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo ""
  echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"
  echo -e "${COLOR_BLUE}Running: $test_description${COLOR_RESET}"
  echo -e "${COLOR_BLUE}========================================${COLOR_RESET}"

  local start_time=$(date +%s)

  if [ "$VERBOSE" = true ]; then
    bash "$test_script"
    local result=$?
  else
    bash "$test_script" > /dev/null 2>&1
    local result=$?
  fi

  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  if [ $result -eq 0 ]; then
    TEST_RESULTS[$test_name]="PASS:${duration}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${COLOR_GREEN}✓ $test_description - PASSED (${duration}s)${COLOR_RESET}"
  else
    TEST_RESULTS[$test_name]="FAIL:${duration}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "${COLOR_RED}✗ $test_description - FAILED (${duration}s)${COLOR_RESET}"
  fi

  return $result
}

skip_test() {
  local test_name=$1
  local test_description=$2
  local reason=$3

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  SKIPPED_TESTS=$((SKIPPED_TESTS + 1))

  TEST_RESULTS[$test_name]="SKIP"
  echo -e "${COLOR_YELLOW}⊘ $test_description - SKIPPED ($reason)${COLOR_RESET}"
}

# =============================================================================
# Test Suite Definitions
# =============================================================================

run_session_lifecycle_tests() {
  if [ "$RUN_MODE" = "only" ] && [ "$ONLY_TEST" != "lifecycle" ]; then
    skip_test "lifecycle" "Session Lifecycle Tests" "not selected"
    return
  fi

  run_test "lifecycle" \
    "$SCRIPT_DIR/test-session-lifecycle.sh" \
    "Session Lifecycle Tests"
}

run_obs_integration_tests() {
  if [ "$SKIP_OBS" = true ]; then
    skip_test "obs" "OBS Integration Tests" "OBS tests disabled"
    return
  fi

  if [ "$RUN_MODE" = "only" ] && [ "$ONLY_TEST" != "obs" ]; then
    skip_test "obs" "OBS Integration Tests" "not selected"
    return
  fi

  if [ "$RUN_MODE" = "quick" ]; then
    skip_test "obs" "OBS Integration Tests" "quick mode"
    return
  fi

  run_test "obs" \
    "$SCRIPT_DIR/test-obs-integration.sh" \
    "OBS Integration Tests"
}

run_agent_processing_tests() {
  if [ "$SKIP_AGENTS" = true ]; then
    skip_test "agents" "Agent Processing Tests" "agent tests disabled"
    return
  fi

  if [ "$RUN_MODE" = "only" ] && [ "$ONLY_TEST" != "agents" ]; then
    skip_test "agents" "Agent Processing Tests" "not selected"
    return
  fi

  if [ "$RUN_MODE" = "quick" ]; then
    skip_test "agents" "Agent Processing Tests" "quick mode"
    return
  fi

  run_test "agents" \
    "$SCRIPT_DIR/test-agent-processing.sh" \
    "Agent Processing Tests"
}

run_websocket_tests() {
  if [ "$SKIP_WS" = true ]; then
    skip_test "websocket" "WebSocket Real-Time Tests" "WebSocket tests disabled"
    return
  fi

  if [ "$RUN_MODE" = "only" ] && [ "$ONLY_TEST" != "ws" ]; then
    skip_test "websocket" "WebSocket Real-Time Tests" "not selected"
    return
  fi

  if [ "$RUN_MODE" = "quick" ]; then
    skip_test "websocket" "WebSocket Real-Time Tests" "quick mode"
    return
  fi

  run_test "websocket" \
    "$SCRIPT_DIR/test-websocket-realtime.sh" \
    "WebSocket Real-Time Tests"
}

run_full_workflow_tests() {
  if [ "$RUN_MODE" = "only" ] && [ "$ONLY_TEST" != "workflow" ]; then
    skip_test "workflow" "Full Workflow Integration" "not selected"
    return
  fi

  run_test "workflow" \
    "$SCRIPT_DIR/test-full-workflow.sh" \
    "Full Workflow Integration"
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

preflight_checks() {
  print_header "FluxBoard Test Suite"

  echo -e "${COLOR_CYAN}Pre-flight checks...${COLOR_RESET}"

  # Check if server is running
  if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${COLOR_RED}✗ Server is not running at $BASE_URL${COLOR_RESET}"
    echo -e "${COLOR_YELLOW}Start the server with: pnpm dev${COLOR_RESET}"
    exit 1
  fi
  echo -e "${COLOR_GREEN}✓ Server is running${COLOR_RESET}"

  # Check for jq
  if ! command -v jq &> /dev/null; then
    echo -e "${COLOR_RED}✗ jq is not installed${COLOR_RESET}"
    echo -e "${COLOR_YELLOW}Install with: brew install jq (macOS) or apt-get install jq (Linux)${COLOR_RESET}"
    exit 1
  fi
  echo -e "${COLOR_GREEN}✓ jq is available${COLOR_RESET}"

  # Check for optional dependencies
  if [ "$SKIP_WS" = false ]; then
    if ! command -v websocat &> /dev/null; then
      echo -e "${COLOR_YELLOW}⚠ websocat not found (WebSocket tests may fail)${COLOR_RESET}"
      echo -e "${COLOR_CYAN}  Install with: cargo install websocat${COLOR_RESET}"
    else
      echo -e "${COLOR_GREEN}✓ websocat is available${COLOR_RESET}"
    fi
  fi

  # Check OBS status
  if [ "$SKIP_OBS" = false ] && [ "$RUN_MODE" != "quick" ]; then
    local obs_status=$(curl -s "$BASE_URL/obs/status" || echo '{"ok":false}')
    local obs_connected=$(echo "$obs_status" | jq -r '.connected // false')

    if [ "$obs_connected" = "true" ]; then
      echo -e "${COLOR_GREEN}✓ OBS is connected${COLOR_RESET}"
    else
      echo -e "${COLOR_YELLOW}⚠ OBS is not connected (OBS tests may fail)${COLOR_RESET}"
      echo -e "${COLOR_CYAN}  Start OBS Studio with WebSocket server enabled${COLOR_RESET}"
    fi
  fi

  # Check agent availability
  if [ "$SKIP_AGENTS" = false ] && [ "$RUN_MODE" != "quick" ]; then
    local agent_status=$(curl -s "$BASE_URL/agents/status" || echo '{"ok":false}')
    local agents_enabled=$(echo "$agent_status" | jq -r '.enabled // false')

    if [ "$agents_enabled" = "true" ]; then
      echo -e "${COLOR_GREEN}✓ AI agents are enabled${COLOR_RESET}"
    else
      echo -e "${COLOR_YELLOW}⚠ AI agents are disabled (agent tests may fail)${COLOR_RESET}"
      echo -e "${COLOR_CYAN}  Set ANTHROPIC_API_KEY in .env to enable agents${COLOR_RESET}"
    fi
  fi

  echo ""
}

# =============================================================================
# Test Summary
# =============================================================================

print_test_summary() {
  local end_time=$(date +%s)
  local total_duration=$((end_time - TEST_START_TIME))

  echo ""
  echo -e "${COLOR_BLUE}============================================${COLOR_RESET}"
  echo -e "${COLOR_BLUE}  Test Suite Summary${COLOR_RESET}"
  echo -e "${COLOR_BLUE}============================================${COLOR_RESET}"
  echo ""
  echo "Total Tests:    $TOTAL_TESTS"
  echo -e "Passed:         ${COLOR_GREEN}${PASSED_TESTS}${COLOR_RESET}"
  echo -e "Failed:         ${COLOR_RED}${FAILED_TESTS}${COLOR_RESET}"
  echo -e "Skipped:        ${COLOR_YELLOW}${SKIPPED_TESTS}${COLOR_RESET}"
  echo "Duration:       ${total_duration}s"
  echo ""
  echo "Individual Test Results:"
  echo "------------------------"

  for test_name in "${!TEST_RESULTS[@]}"; do
    local result="${TEST_RESULTS[$test_name]}"
    local status=$(echo "$result" | cut -d':' -f1)
    local duration=$(echo "$result" | cut -d':' -f2)

    case $status in
      PASS)
        echo -e "  ${COLOR_GREEN}✓${COLOR_RESET} $test_name (${duration}s)"
        ;;
      FAIL)
        echo -e "  ${COLOR_RED}✗${COLOR_RESET} $test_name (${duration}s)"
        ;;
      SKIP)
        echo -e "  ${COLOR_YELLOW}⊘${COLOR_RESET} $test_name (skipped)"
        ;;
    esac
  done

  echo ""

  # Print log locations
  echo "Test Logs:"
  echo "----------"
  find "$LOG_DIR" -name "test-run-*.log" -mtime -1 | head -n 5 | while read log_file; do
    echo "  $log_file"
  done
  echo ""

  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${COLOR_GREEN}============================================${COLOR_RESET}"
    echo -e "${COLOR_GREEN}  All tests passed! ✓${COLOR_RESET}"
    echo -e "${COLOR_GREEN}============================================${COLOR_RESET}"
    return 0
  else
    echo -e "${COLOR_RED}============================================${COLOR_RESET}"
    echo -e "${COLOR_RED}  Some tests failed!${COLOR_RESET}"
    echo -e "${COLOR_RED}============================================${COLOR_RESET}"
    echo ""
    echo "Check the test logs for detailed error information."
    return 1
  fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
  parse_args "$@"

  # Initialize logging
  log_init

  # Run pre-flight checks
  preflight_checks

  echo -e "${COLOR_CYAN}Starting test suite...${COLOR_RESET}"
  echo -e "${COLOR_CYAN}Mode: $RUN_MODE${COLOR_RESET}"
  echo ""

  # Run test suites
  if [ "$PARALLEL" = true ]; then
    echo -e "${COLOR_YELLOW}Parallel mode is experimental${COLOR_RESET}"
    run_session_lifecycle_tests &
    [ "$RUN_MODE" != "quick" ] && run_obs_integration_tests &
    [ "$RUN_MODE" != "quick" ] && run_agent_processing_tests &
    [ "$RUN_MODE" != "quick" ] && run_websocket_tests &
    run_full_workflow_tests &
    wait
  else
    run_session_lifecycle_tests
    run_obs_integration_tests
    run_agent_processing_tests
    run_websocket_tests
    run_full_workflow_tests
  fi

  # Print summary
  print_test_summary
}

# Run main function
main "$@"

# Exit with appropriate code
exit $?
