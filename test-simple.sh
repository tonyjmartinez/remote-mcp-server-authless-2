#!/bin/bash

echo "=== Testing Worker Orchestration MCP Tools ==="
echo ""

# Test 1: Initialize
echo "Test 1: Initialize MCP Connection"
INIT=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}')

echo "$INIT" | python3 -m json.tool 2>/dev/null | head -20
echo ""

# Get session ID from the response
SESSION_ID=$(echo "$INIT" | grep -oP '"sessionId":\s*"\K[^"]+' || echo "")
if [ -z "$SESSION_ID" ]; then
  echo "Warning: No sessionId found in init response, using test-session"
  SESSION_ID="test-session"
fi

# Test 2: List tools to see orchestration tools
echo "Test 2: List Tools"
TOOLS=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')

echo "$TOOLS" | python3 -m json.tool 2>/dev/null | grep -A2 '"name".*orchestration\|"name".*task\|"name".*batch' | head -30
echo ""

# Test 3: Create a task
echo "Test 3: Create Task"
CREATE=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_task","arguments":{"type":"data_processing","params":{"records":500}}}}')

echo "$CREATE" | python3 -m json.tool 2>/dev/null | head -30
TASK_ID=$(echo "$CREATE" | grep -oP 'task_[0-9a-z_]+' | head -1)
echo ""
echo "Created task ID: $TASK_ID"
echo ""

# Test 4: Wait and check status
echo "Test 4: Waiting 3 seconds then checking task status..."
sleep 3

STATUS=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task_status\",\"arguments\":{\"taskId\":\"$TASK_ID\"}}}")

echo "$STATUS" | python3 -m json.tool 2>/dev/null | head -40
echo ""

# Test 5: Process batch
echo "Test 5: Process Batch (square of [2, 4, 6])"
BATCH=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"process_batch","arguments":{"items":[2,4,6],"operation":"square"}}}')

echo "$BATCH" | python3 -m json.tool 2>/dev/null | head -30
echo ""

# Test 6: List all tasks
sleep 2
echo "Test 6: List All Tasks"
LIST=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"list_tasks","arguments":{"status":"all"}}}')

echo "$LIST" | python3 -m json.tool 2>/dev/null | head -40
echo ""

echo "=== Tests Complete ==="
