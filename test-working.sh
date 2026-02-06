#!/bin/bash

echo "=== Testing Worker Orchestration ==="
echo ""

# Helper function to parse SSE response
parse_sse() {
  grep "^data:" | sed 's/^data: //'
}

# Test 1: Initialize and get session ID
echo "Test 1: Initialize MCP Connection"
INIT_FULL=$(curl -si http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}')

SESSION_ID=$(echo "$INIT_FULL" | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')
echo "Session ID: $SESSION_ID"

INIT_DATA=$(echo "$INIT_FULL" | parse_sse)
echo "$INIT_DATA" | python3 -m json.tool 2>/dev/null | head -10
echo ""

# Test 2: List tools
echo "Test 2: List Tools (filtering for orchestration tools)"
TOOLS=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')

TOOLS_DATA=$(echo "$TOOLS" | parse_sse)
echo "$TOOLS_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); tools = [t['name'] for t in data['result']['tools'] if 'task' in t['name'] or 'batch' in t['name'] or 'orchestration' in t['name']]; print('Orchestration tools:', tools)" 2>/dev/null
echo ""

# Test 3: Create a task
echo "Test 3: Create Data Processing Task"
CREATE=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_task","arguments":{"type":"data_processing","params":{"records":500}}}}')

CREATE_DATA=$(echo "$CREATE" | parse_sse)
TASK_ID=$(echo "$CREATE_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result']['content'][0]['text'].split(': ')[1])" 2>/dev/null)
echo "Created Task ID: $TASK_ID"
echo "$CREATE_DATA" | python3 -m json.tool 2>/dev/null | grep -A5 "content"
echo ""

# Test 4: Check task status (wait for processing)
echo "Test 4: Checking task status after 3 seconds..."
sleep 3

STATUS=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task_status\",\"arguments\":{\"taskId\":\"$TASK_ID\"}}}")

STATUS_DATA=$(echo "$STATUS" | parse_sse)
echo "$STATUS_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result']['content'][0]['text'])" 2>/dev/null
echo ""

# Test 5: Process batch
echo "Test 5: Process Batch - Square of [3, 5, 7]"
BATCH=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"process_batch","arguments":{"items":[3,5,7],"operation":"square"}}}')

BATCH_DATA=$(echo "$BATCH" | parse_sse)
echo "$BATCH_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result']['content'][0]['text'])" 2>/dev/null
echo ""

# Test 6: Wait and list all tasks
sleep 3
echo "Test 6: List All Tasks"
LIST=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"list_tasks","arguments":{"status":"all"}}}')

LIST_DATA=$(echo "$LIST" | parse_sse)
echo "$LIST_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result']['content'][0]['text'])" 2>/dev/null
echo ""

# Test 7: Get orchestration dashboard
echo "Test 7: Get Orchestration Dashboard"
DASH=$(curl -s http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"get_orchestration_dashboard","arguments":{}}}')

DASH_DATA=$(echo "$DASH" | parse_sse)
echo "$DASH_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Dashboard stats:', data['result']['content'][0]['text']); print('Has UI:', '_meta' in data['result'])" 2>/dev/null
echo ""

echo "=== Worker Orchestration Tests Complete! ==="
echo ""
echo "Summary:"
echo "- Created and tracked individual tasks"
echo "- Processed batch calculations"
echo "- Listed all tasks with status"
echo "- Generated orchestration dashboard with UI"
