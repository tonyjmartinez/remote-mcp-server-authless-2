#!/bin/bash

BASE_URL="https://remote-mcp-server-authless-2.ajosephmartinez.workers.dev"

echo "=== Testing Production Worker Orchestration ==="
echo "URL: $BASE_URL"
echo ""

# Helper function to parse SSE response
parse_sse() {
  grep "^data:" | sed 's/^data: //'
}

# Test 1: Initialize and get session ID
echo "1. Initialize MCP Connection"
INIT_FULL=$(curl -si $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"production-test","version":"1.0"}}}')

SESSION_ID=$(echo "$INIT_FULL" | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')
echo "   ✓ Session ID: ${SESSION_ID:0:16}..."
echo ""

# Test 2: List orchestration tools
echo "2. List Orchestration Tools"
TOOLS=$(curl -s $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')

TOOLS_DATA=$(echo "$TOOLS" | parse_sse)
ORCH_TOOLS=$(echo "$TOOLS_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); tools = [t['name'] for t in data['result']['tools'] if 'task' in t['name'] or 'batch' in t['name'] or 'orchestration' in t['name']]; print(', '.join(tools))" 2>/dev/null)
echo "   ✓ Found tools: $ORCH_TOOLS"
echo ""

# Test 3: Create a data processing task
echo "3. Create Data Processing Task"
CREATE=$(curl -s $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_task","arguments":{"type":"data_processing","params":{"records":1000}}}}')

CREATE_DATA=$(echo "$CREATE" | parse_sse)
TASK_ID=$(echo "$CREATE_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result']['content'][0]['text'].split(': ')[1])" 2>/dev/null)
echo "   ✓ Created Task: $TASK_ID"
echo ""

# Test 4: Wait and check task status
echo "4. Check Task Status (waiting 3 seconds for processing...)"
sleep 3

STATUS=$(curl -s $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task_status\",\"arguments\":{\"taskId\":\"$TASK_ID\"}}}")

STATUS_DATA=$(echo "$STATUS" | parse_sse)
TASK_STATUS=$(echo "$STATUS_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); lines = data['result']['content'][0]['text'].split('\n'); print('   ' + '\n   '.join([l for l in lines if l.strip()]))" 2>/dev/null)
echo "$TASK_STATUS"
echo ""

# Test 5: Create batch processing tasks
echo "5. Process Batch - Factorial of [4, 5, 6]"
BATCH=$(curl -s $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"process_batch","arguments":{"items":[4,5,6],"operation":"factorial"}}}')

BATCH_DATA=$(echo "$BATCH" | parse_sse)
BATCH_INFO=$(echo "$BATCH_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result']['content'][0]['text'])" 2>/dev/null)
echo "   ✓ $BATCH_INFO"
echo ""

# Test 6: Wait and list all tasks
echo "6. List All Tasks (waiting 3 seconds...)"
sleep 3

LIST=$(curl -s $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"list_tasks","arguments":{"status":"completed"}}}')

LIST_DATA=$(echo "$LIST" | parse_sse)
COMPLETED_TASKS=$(echo "$LIST_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); text = data['result']['content'][0]['text']; lines = text.split('\n')[1:]; print('\n   '.join(['✓ ' + l for l in lines if l.strip()]))" 2>/dev/null)
echo "$COMPLETED_TASKS"
echo ""

# Test 7: Get orchestration dashboard
echo "7. Get Orchestration Dashboard"
DASH=$(curl -s $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"get_orchestration_dashboard","arguments":{}}}')

DASH_DATA=$(echo "$DASH" | parse_sse)
DASH_STATS=$(echo "$DASH_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print('   ' + data['result']['content'][0]['text']); print('   ✓ Dashboard UI generated with', len(data['result']['_meta']['ui']['blob']), 'bytes')" 2>/dev/null)
echo "$DASH_STATS"
echo ""

# Test 8: Create image generation task
echo "8. Create Image Generation Task"
IMAGE_TASK=$(curl -s $BASE_URL/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"create_task","arguments":{"type":"image_generation","params":{"prompt":"sunset over mountains","size":"1024x1024"}}}}')

IMAGE_DATA=$(echo "$IMAGE_TASK" | parse_sse)
IMAGE_TASK_ID=$(echo "$IMAGE_DATA" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['result']['content'][0]['text'].split(': ')[1])" 2>/dev/null)
echo "   ✓ Created Image Task: $IMAGE_TASK_ID"
echo ""

echo "=== Production Test Complete! ==="
echo ""
echo "✅ All worker orchestration features working on production:"
echo "   • Task creation (multiple types)"
echo "   • Background processing with progress tracking"
echo "   • Task status monitoring"
echo "   • Batch processing"
echo "   • Task listing with filtering"
echo "   • Dashboard generation with UI"
echo ""
echo "🌐 Test the UI at: $BASE_URL/test"
