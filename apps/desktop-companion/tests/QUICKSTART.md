# FluxBoard Test Suite - Quick Start Guide

Get started with FluxBoard testing in 5 minutes.

## 1. Prerequisites Check

```bash
# Check if server is running
curl http://localhost:3123/health

# Check required tools
which jq        # JSON processor
which curl      # HTTP client
which websocat  # WebSocket client (optional)
```

## 2. Install Dependencies

```bash
# macOS
brew install jq
cargo install websocat

# Linux
sudo apt-get install jq
cargo install websocat

# Windows (via package managers)
choco install jq
cargo install websocat
```

## 3. Start the Server

```bash
cd apps/desktop-companion
pnpm install
pnpm dev
```

Server should start on `http://localhost:3123`

## 4. Run Your First Test

```bash
# Quick health check
./tests/run-all-tests.sh --quick

# Or run a specific test
./tests/test-session-lifecycle.sh
```

## 5. Common Commands

### Run all tests
```bash
./tests/run-all-tests.sh
```

### Run specific test suite
```bash
./tests/run-all-tests.sh --only lifecycle   # Session tests
./tests/run-all-tests.sh --only obs         # OBS tests
./tests/run-all-tests.sh --only agents      # AI agent tests
./tests/run-all-tests.sh --only ws          # WebSocket tests
./tests/run-all-tests.sh --only workflow    # Full workflow
```

### Skip optional components
```bash
./tests/run-all-tests.sh --skip-obs         # Skip OBS tests
./tests/run-all-tests.sh --skip-agents      # Skip agent tests
./tests/run-all-tests.sh --skip-ws          # Skip WebSocket tests
```

### Verbose output
```bash
./tests/run-all-tests.sh --verbose
```

## 6. Understanding Test Output

### Success
```
✓ Session created successfully
✓ Session directory exists
✓ All tests passed!
```

### Failure
```
✗ Session creation failed
ERROR: Failed to connect to server
```

### Warning
```
⚠ OBS is not connected (OBS tests may fail)
```

## 7. Test Logs

All test runs create detailed logs:

```bash
# View latest log
ls -lt tests/logs/ | head -n 1

# Read a specific log
cat tests/logs/test-run-20260113-120530.log
```

## 8. Optional Setup

### For OBS Tests

1. Start OBS Studio
2. Go to Tools → WebSocket Server Settings
3. Enable WebSocket server
4. Set password (or leave empty)
5. Update `.env`:
   ```bash
   OBS_WS_URL=ws://127.0.0.1:4455
   OBS_WS_PASSWORD=your-password  # or leave empty
   ```

### For Agent Tests

Add API key to `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### For STT Tests

Add API key to `.env`:
```bash
DEEPGRAM_API_KEY=your-key-here
```

## 9. Troubleshooting

### Server not running?
```bash
cd apps/desktop-companion
pnpm dev
```

### OBS not connected?
```bash
# Check OBS status
curl http://localhost:3123/obs/status | jq
```

### Tests failing?
```bash
# Run with verbose output
./tests/run-all-tests.sh --verbose

# Check logs
tail -f tests/logs/test-run-*.log
```

### Clean up test data
```bash
# Remove test sessions
rm -rf sessions/*Test*

# Clean old logs
find tests/logs -name "*.log" -mtime +7 -delete
```

## 10. Next Steps

- Read full documentation: [`tests/README.md`](./README.md)
- Explore test utilities: [`tests/helpers/test-utils.sh`](./helpers/test-utils.sh)
- Review individual test scripts in `tests/`
- Set up CI/CD integration
- Write custom tests for your features

## Quick Reference Card

| Command | Description |
|---------|-------------|
| `./tests/run-all-tests.sh` | Run all tests |
| `./tests/run-all-tests.sh --quick` | Run essential tests only |
| `./tests/run-all-tests.sh --only <test>` | Run specific test suite |
| `./tests/run-all-tests.sh --skip-obs` | Skip OBS tests |
| `./tests/run-all-tests.sh --verbose` | Show detailed output |
| `./tests/test-session-lifecycle.sh` | Test session management |
| `./tests/test-obs-integration.sh` | Test OBS integration |
| `./tests/test-agent-processing.sh` | Test AI agents |
| `./tests/test-websocket-realtime.sh` | Test WebSocket events |
| `./tests/test-full-workflow.sh` | Test complete workflow |

## Success Indicators

Your tests are working correctly when you see:

- ✅ All prerequisite checks pass
- ✅ Session IDs are generated
- ✅ Files are created in `sessions/` directory
- ✅ Events are logged to `events.jsonl`
- ✅ WebSocket messages are received
- ✅ Final summary shows all tests passed

## Support

If you encounter issues:

1. Check server is running: `curl http://localhost:3123/health`
2. Verify dependencies: `jq`, `curl`, `websocat`
3. Review test logs in `tests/logs/`
4. Run with `--verbose` flag for details
5. Check `.env` configuration

Happy Testing! 🚀
