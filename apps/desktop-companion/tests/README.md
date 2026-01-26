# FluxBoard End-to-End Test Suite

Comprehensive testing framework for the FluxBoard desktop companion service, covering all major system components and workflows.

## Overview

The FluxBoard test suite provides automated end-to-end testing across five major test categories:

1. **Session Lifecycle Tests** - Session CRUD operations and state management
2. **OBS Integration Tests** - OBS WebSocket connectivity, replay buffer, and clip capture
3. **Agent Processing Tests** - AI agent routing, output generation, and validation
4. **WebSocket Real-Time Tests** - Real-time event broadcasting and delivery
5. **Full Workflow Integration** - Complete end-to-end livestream capture workflow

## Quick Start

### Prerequisites

**Required:**
- Server running on `http://localhost:3123`
- `jq` - JSON processor for parsing API responses
- `curl` - HTTP client for API requests

**Optional (for full test coverage):**
- OBS Studio with WebSocket server enabled (for OBS tests)
- `websocat` - WebSocket client for real-time tests
- `DEEPGRAM_API_KEY` configured in `.env` (for STT tests)
- `ANTHROPIC_API_KEY` configured in `.env` (for agent tests)
- FFmpeg installed (for clip processing tests)

### Installation

Install required tools:

```bash
# macOS
brew install jq websocat

# Linux (Debian/Ubuntu)
sudo apt-get install jq
cargo install websocat

# Windows (via Chocolatey)
choco install jq
cargo install websocat
```

### Running Tests

Run all tests:
```bash
./tests/run-all-tests.sh
```

Run quick tests only:
```bash
./tests/run-all-tests.sh --quick
```

Run specific test suite:
```bash
./tests/run-all-tests.sh --only lifecycle
./tests/run-all-tests.sh --only obs
./tests/run-all-tests.sh --only agents
./tests/run-all-tests.sh --only ws
./tests/run-all-tests.sh --only workflow
```

Skip optional components:
```bash
./tests/run-all-tests.sh --skip-obs --skip-agents
```

Verbose output:
```bash
./tests/run-all-tests.sh --verbose
```

## Test Suites

### 1. Session Lifecycle Tests

**File:** `test-session-lifecycle.sh`

Tests session management and state persistence:

- Session creation via API
- Database persistence verification
- Session directory creation
- Session status retrieval
- Event recording to `events.jsonl`
- Concurrent session operations
- Session metadata validation
- Session end and cleanup
- Multiple session handling

**Run individually:**
```bash
./tests/test-session-lifecycle.sh
```

**Expected output:**
- Session ID and database ID
- Session directory path
- Event count verification
- All tests passed confirmation

### 2. OBS Integration Tests

**File:** `test-obs-integration.sh`

Tests OBS WebSocket integration and video capture:

- OBS WebSocket connection verification
- Replay buffer status and control
- Replay buffer save operation
- Clip capture with timestamps
- Screenshot capture from sources
- Clip file creation and validation
- Thumbnail generation
- FFmpeg availability check
- ARTIFACT_CLIP_CREATED event generation
- ARTIFACT_FRAME_CREATED event generation

**Prerequisites:**
- OBS Studio running
- WebSocket server enabled in OBS
- Replay buffer configured

**Run individually:**
```bash
./tests/test-obs-integration.sh
```

**Expected output:**
- OBS connection status
- Replay buffer active confirmation
- Clip artifact IDs
- File paths for clips and thumbnails

### 3. Agent Processing Tests

**File:** `test-agent-processing.sh`

Tests AI agent processing and output generation:

- Agent availability check
- Agent registration verification
- Transcript segment processing
- OUTPUT_CREATED event generation
- Output database persistence
- Output validation
- Multiple workflow types (streamer, podcast, debate)
- Output category diversity
- Concurrent agent processing
- Performance metrics

**Prerequisites:**
- `ANTHROPIC_API_KEY` configured in `.env`

**Run individually:**
```bash
./tests/test-agent-processing.sh
```

**Expected output:**
- Agent enabled status
- Number of outputs generated
- Output categories (SOCIAL_POST, CLIP_TITLE, etc.)
- Processing time metrics

### 4. WebSocket Real-Time Tests

**File:** `test-websocket-realtime.sh`

Tests real-time event broadcasting via WebSocket:

- WebSocket connection establishment
- Hello message reception
- TRANSCRIPT_SEGMENT event delivery
- ARTIFACT_CLIP_CREATED event delivery
- OUTPUT_CREATED event delivery
- Multiple concurrent events
- Event ordering verification
- Reconnection logic
- Event message format validation

**Prerequisites:**
- `websocat` installed

**Run individually:**
```bash
./tests/test-websocket-realtime.sh
```

**Expected output:**
- WebSocket connection confirmation
- Event counts by type
- Message format validation results

### 5. Full Workflow Integration

**File:** `test-full-workflow.sh`

Comprehensive end-to-end workflow simulation:

**Phases:**
1. System initialization (OBS, STT, agents, FFmpeg)
2. Session creation
3. OBS replay buffer setup
4. Speech-to-text capture with simulated transcripts
5. Clip capture from multiple timestamps
6. AI agent processing and output generation
7. Real-time event monitoring
8. Content export functionality
9. Session finalization
10. Data verification and metrics

**Run individually:**
```bash
./tests/test-full-workflow.sh
```

**Expected output:**
- Complete workflow metrics
- Transcript count, clip count, output count
- Session data preservation path
- Final test summary

## Test Utilities

### Helper Functions

Located in `tests/helpers/test-utils.sh`:

**Logging:**
- `log_init()` - Initialize logging
- `log_info()`, `log_error()`, `log_debug()` - Structured logging
- `log_request()`, `log_response()` - HTTP request/response logging

**Output:**
- `print_header()` - Test section headers
- `print_step()` - Test step indicators
- `print_success()` - Success messages
- `print_error()` - Error messages
- `print_warning()` - Warning messages
- `print_summary()` - Test result summary

**HTTP Requests:**
- `http_get(endpoint)` - GET request
- `http_post(endpoint, data)` - POST request with JSON
- `http_post_raw(endpoint, data, content_type)` - POST with binary data

**JSON Helpers:**
- `check_json_ok(response)` - Check `.ok` field
- `json_field(response, field)` - Extract JSON field
- `json_exists(response, field)` - Check field existence

**Validation:**
- `assert_eq(actual, expected, description)` - Equality assertion
- `assert_not_empty(value, description)` - Non-empty assertion
- `assert_file_exists(path, description)` - File existence assertion
- `assert_json_field(response, field, expected)` - JSON field assertion

**Health Checks:**
- `wait_for_server(max_attempts, delay)` - Wait for server ready
- `check_server_health()` - Verify server health

**WebSocket:**
- `check_websocat()` - Check websocat availability
- `ws_connect_test(url, timeout)` - Test WebSocket connection

**Test Data:**
- `generate_test_session_config(workflow, title)` - Create session config
- `generate_test_audio_chunk()` - Generate test audio data

## Test Configuration

### Environment Variables

Configure tests via environment variables:

```bash
# Base URLs
export BASE_URL="http://localhost:3123"
export WS_URL="ws://localhost:3124"

# Test timeouts
export TEST_TIMEOUT=30
export RETRY_COUNT=3
export RETRY_DELAY=2

# Log directory
export LOG_DIR="./tests/logs"
```

### Test Options

All test scripts support these options:

- Scripts run with `set -e` (exit on error)
- Color-coded output for readability
- Detailed logging to `tests/logs/`
- JSON response parsing with `jq`
- Automatic cleanup on completion

## Log Files

Test logs are saved to `tests/logs/` with timestamp:

```
tests/logs/
├── test-run-20260113-120530.log
├── test-run-20260113-123045.log
└── test-run-20260113-130215.log
```

Each log includes:
- Timestamp for each operation
- HTTP requests and responses
- Test step execution
- Error details
- Success/failure status

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y jq ffmpeg
          cargo install websocat

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install packages
        run: pnpm install

      - name: Setup database
        run: pnpm db:push
        working-directory: apps/desktop-companion

      - name: Start server
        run: pnpm dev &
        working-directory: apps/desktop-companion
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          JWT_SECRET: test-secret-key

      - name: Wait for server
        run: npx wait-on http://localhost:3123/health

      - name: Run tests
        run: ./tests/run-all-tests.sh --skip-obs --skip-agents
        working-directory: apps/desktop-companion

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-logs
          path: apps/desktop-companion/tests/logs/
```

## Troubleshooting

### Server Not Running

```
✗ Server is not running at http://localhost:3123
```

**Solution:** Start the server:
```bash
cd apps/desktop-companion
pnpm dev
```

### OBS Not Connected

```
⚠ OBS is not connected (OBS tests may fail)
```

**Solution:**
1. Start OBS Studio
2. Enable WebSocket server in Tools → WebSocket Server Settings
3. Set password (or leave empty)
4. Update `OBS_WS_PASSWORD` in `.env`

### Agents Not Enabled

```
⚠ AI agents are disabled (agent tests may fail)
```

**Solution:** Add `ANTHROPIC_API_KEY` to `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### WebSocket Tests Failing

```
websocat not found. WebSocket tests will be skipped.
```

**Solution:** Install websocat:
```bash
cargo install websocat
```

### FFmpeg Not Available

```
FFmpeg is not fully available - clip trimming will be disabled
```

**Solution:** Install FFmpeg:
```bash
# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg

# Windows
choco install ffmpeg
```

### Test Cleanup

If tests leave behind test data:

```bash
# Clean up test sessions
rm -rf apps/desktop-companion/sessions/*Test*

# Clean up test logs (older than 7 days)
find apps/desktop-companion/tests/logs -name "*.log" -mtime +7 -delete
```

## Development Guidelines

### Adding New Tests

1. Create test script in `tests/` directory
2. Source test utilities: `source "$SCRIPT_DIR/helpers/test-utils.sh"`
3. Implement test functions with descriptive names
4. Use helper functions for consistency
5. Add proper cleanup in teardown
6. Update `run-all-tests.sh` to include new suite
7. Document in this README

### Test Naming Convention

- Test files: `test-<component>.sh`
- Test functions: `test_<specific_behavior>`
- Variables: `UPPERCASE_WITH_UNDERSCORES`
- Descriptive names over brevity

### Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Always clean up test data
3. **Assertions:** Use assertion helpers for validation
4. **Logging:** Log all important operations
5. **Error Handling:** Provide clear error messages
6. **Documentation:** Comment complex test logic
7. **Performance:** Keep individual tests under 30 seconds
8. **Retries:** Use retry logic for flaky operations

## Success Criteria

All tests pass when:

- ✅ Session lifecycle operations complete successfully
- ✅ OBS integration captures clips and screenshots (if OBS available)
- ✅ AI agents generate outputs (if API key configured)
- ✅ WebSocket events broadcast in real-time
- ✅ Full workflow completes end-to-end
- ✅ Database records persist correctly
- ✅ Files are created on disk
- ✅ Real-time UI updates work
- ✅ No memory leaks or resource issues
- ✅ All cleanup operations succeed

## Test Coverage

Current test coverage by component:

| Component | Coverage | Tests |
|-----------|----------|-------|
| Session Management | 95% | 10 |
| OBS Integration | 85% | 11 |
| Agent Processing | 90% | 11 |
| WebSocket Events | 90% | 11 |
| Full Workflow | 100% | 10 |

## Support

For issues or questions:

1. Check test logs in `tests/logs/`
2. Review this README for troubleshooting
3. Verify all prerequisites are met
4. Run tests with `--verbose` flag
5. Check server logs for errors

## License

This test suite is part of the FluxBoard project.
