#!/bin/bash

# Live Integration Test for MCP Orchestration
# Tests against deployed Cloudflare Worker at:
#   https://remote-mcp-server-authless-2.ajosephmartinez.workers.dev

BASE_URL="${1:-https://remote-mcp-server-authless-2.ajosephmartinez.workers.dev}"
PASS=0
FAIL=0
WARN=0

echo "========================================="
echo "  MCP Orchestration Integration Tests"
echo "  Target: $BASE_URL"
echo "========================================="
echo ""

parse_sse() {
  grep "^data:" | sed 's/^data: //'
}

record_pass() {
  echo "  PASS: $1"
  PASS=$((PASS + 1))
}

record_fail() {
  echo "  FAIL: $1"
  FAIL=$((FAIL + 1))
}

# ===========================
# TEST 1: Initialize
# ===========================
echo "TEST 1: Initialize MCP Connection"
INIT_FULL=$(curl -si "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' 2>/dev/null)

SESSION_ID=$(echo "$INIT_FULL" | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')
INIT_DATA=$(echo "$INIT_FULL" | parse_sse)

if [ -z "$SESSION_ID" ]; then
  record_fail "No session ID received"
  echo "Cannot continue without session. Aborting."
  exit 1
fi
record_pass "Session ID acquired"

SERVER_INFO=$(echo "$INIT_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"result\"][\"serverInfo\"][\"name\"]} v{d[\"result\"][\"serverInfo\"][\"version\"]}')" 2>/dev/null)
echo "  Server: $SERVER_INFO"
echo ""

# ===========================
# TEST 2: List Tools
# ===========================
echo "TEST 2: List Tools"
TOOLS_RAW=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' 2>/dev/null)

TOOLS_DATA=$(echo "$TOOLS_RAW" | parse_sse)
ORCH_COUNT=$(echo "$TOOLS_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
names = [t['name'] for t in data['result']['tools']]
orch = [n for n in names if n in ('create_task','get_task_status','list_tasks','process_batch','get_orchestration_dashboard')]
print(len(orch))
" 2>/dev/null)

if [ "$ORCH_COUNT" = "5" ]; then
  record_pass "All 5 orchestration tools present"
else
  record_fail "Expected 5 orchestration tools, found $ORCH_COUNT"
fi
echo ""

# ===========================
# TEST 3: Basic Add Tool
# ===========================
echo "TEST 3: Basic 'add' Tool (2 + 3 = 5)"
ADD_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"add","arguments":{"a":2,"b":3}}}' 2>/dev/null | parse_sse)

ADD_RESULT=$(echo "$ADD_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
echo "  Result: $ADD_RESULT"
if echo "$ADD_RESULT" | grep -q "5"; then
  record_pass "add(2, 3) = 5"
else
  record_fail "Unexpected add result"
fi
echo ""

# ===========================
# TEST 4: Calculate (multiply)
# ===========================
echo "TEST 4: Calculate Tool (7 * 8 = 56)"
CALC_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"calculate","arguments":{"operation":"multiply","a":7,"b":8}}}' 2>/dev/null | parse_sse)

CALC_RESULT=$(echo "$CALC_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
echo "  Result: $CALC_RESULT"
if echo "$CALC_RESULT" | grep -q "56"; then
  record_pass "calculate(multiply, 7, 8) = 56"
else
  record_fail "Unexpected calculate result"
fi
echo ""

# ===========================
# TEST 5: Division by zero
# ===========================
echo "TEST 5: Division by Zero Error Handling"
DIV0_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"calculate","arguments":{"operation":"divide","a":10,"b":0}}}' 2>/dev/null | parse_sse)

DIV0_ERROR=$(echo "$DIV0_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'].get('isError', False))" 2>/dev/null)
if [ "$DIV0_ERROR" = "True" ]; then
  record_pass "Division by zero returns isError=true"
else
  record_fail "Division by zero not properly handled"
fi
echo ""

# ===========================
# TEST 6: Create Task
# ===========================
echo "TEST 6: Create Data Processing Task"
CREATE_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"create_task","arguments":{"type":"data_processing","params":{"records":500}}}}' 2>/dev/null | parse_sse)

TASK_ID=$(echo "$CREATE_DATA" | python3 -c "
import sys, json, re
data = json.load(sys.stdin)
text = data['result']['content'][0]['text']
match = re.search(r'task_\w+', text)
print(match.group(0) if match else '')
" 2>/dev/null)

if [ -n "$TASK_ID" ]; then
  record_pass "Task created: $TASK_ID"
else
  record_fail "No task ID returned"
fi
echo ""

# ===========================
# TEST 7: Task Status (immediate)
# ===========================
echo "TEST 7: Task Status (immediate - should be pending/running)"
STATUS_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":7,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task_status\",\"arguments\":{\"taskId\":\"$TASK_ID\"}}}" 2>/dev/null | parse_sse)

TASK_STATUS=$(echo "$STATUS_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
if echo "$TASK_STATUS" | grep -qiE "pending|running"; then
  record_pass "Task is pending/running immediately after creation"
else
  record_fail "Unexpected immediate status"
fi
echo ""

# ===========================
# TEST 8: Task Status (after delay)
# ===========================
echo "TEST 8: Task Status (after 4s - should be completed)"
sleep 4
STATUS2_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":8,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task_status\",\"arguments\":{\"taskId\":\"$TASK_ID\"}}}" 2>/dev/null | parse_sse)

COMPLETED_STATUS=$(echo "$STATUS2_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
if echo "$COMPLETED_STATUS" | grep -qi "completed"; then
  record_pass "Task completed after processing delay"
else
  record_fail "Task not completed after 4s"
fi
echo ""

# ===========================
# TEST 9: Non-existent Task
# ===========================
echo "TEST 9: Get Status of Non-existent Task"
NOEXIST_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"get_task_status","arguments":{"taskId":"fake_task_999"}}}' 2>/dev/null | parse_sse)

NOEXIST_ERR=$(echo "$NOEXIST_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'].get('isError', False))" 2>/dev/null)
if [ "$NOEXIST_ERR" = "True" ]; then
  record_pass "Non-existent task returns isError=true"
else
  record_fail "Non-existent task not properly handled"
fi
echo ""

# ===========================
# TEST 10: Process Batch (square)
# ===========================
echo "TEST 10: Process Batch - Square of [3, 7, 11]"
BATCH_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"process_batch","arguments":{"items":[3,7,11],"operation":"square"}}}' 2>/dev/null | parse_sse)

BATCH_TEXT=$(echo "$BATCH_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
if echo "$BATCH_TEXT" | grep -qi "batch" && echo "$BATCH_TEXT" | grep -qi "3 tasks"; then
  record_pass "Batch created 3 tasks for square operation"
else
  record_fail "Batch processing unexpected response: $BATCH_TEXT"
fi
echo ""

# ===========================
# TEST 11: Process Batch (factorial)
# ===========================
echo "TEST 11: Process Batch - Factorial of [5, 6]"
FACT_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"process_batch","arguments":{"items":[5,6],"operation":"factorial"}}}' 2>/dev/null | parse_sse)

FACT_TEXT=$(echo "$FACT_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
if echo "$FACT_TEXT" | grep -qi "batch" && echo "$FACT_TEXT" | grep -qi "2 tasks"; then
  record_pass "Batch created 2 tasks for factorial operation"
else
  record_fail "Factorial batch unexpected response: $FACT_TEXT"
fi
echo ""

# ===========================
# TEST 12: List All Tasks
# ===========================
echo "TEST 12: List All Tasks"
sleep 3
LIST_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":12,"method":"tools/call","params":{"name":"list_tasks","arguments":{"status":"all"}}}' 2>/dev/null | parse_sse)

LIST_TEXT=$(echo "$LIST_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
TASK_COUNT=$(echo "$LIST_TEXT" | python3 -c "
import sys, re
text = sys.stdin.read()
match = re.search(r'Tasks \((\d+)\)', text)
print(match.group(1) if match else '0')
" 2>/dev/null)

if [ "$TASK_COUNT" -ge 6 ]; then
  record_pass "Listed $TASK_COUNT tasks (1 data + 3 square + 2 factorial)"
else
  record_fail "Expected >= 6 tasks, got $TASK_COUNT"
fi
echo ""

# ===========================
# TEST 13: List Completed Tasks
# ===========================
echo "TEST 13: List Only Completed Tasks"
COMPLETED_LIST=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":13,"method":"tools/call","params":{"name":"list_tasks","arguments":{"status":"completed"}}}' 2>/dev/null | parse_sse)

COMPLETED_TEXT=$(echo "$COMPLETED_LIST" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
if echo "$COMPLETED_TEXT" | grep -qi "completed"; then
  record_pass "Completed task filter works"
else
  record_fail "Completed filter returned unexpected results"
fi
echo ""

# ===========================
# TEST 14: Orchestration Dashboard
# ===========================
echo "TEST 14: Orchestration Dashboard"
DASH_DATA=$(curl -s "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":14,"method":"tools/call","params":{"name":"get_orchestration_dashboard","arguments":{}}}' 2>/dev/null | parse_sse)

DASH_HAS_UI=$(echo "$DASH_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); print('_meta' in d['result'])" 2>/dev/null)
DASH_TEXT=$(echo "$DASH_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['content'][0]['text'])" 2>/dev/null)
echo "  Dashboard: $DASH_TEXT"

if [ "$DASH_HAS_UI" = "True" ]; then
  record_pass "Dashboard includes UI metadata"
else
  record_fail "Dashboard missing UI metadata"
fi
echo ""

# ===========================
# TEST 15: HTML Test Page
# ===========================
echo "TEST 15: HTML Test Page Accessibility"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null)
if [ "$HTTP_STATUS" = "200" ]; then
  record_pass "Root page returns HTTP 200"
else
  record_fail "Root page returns HTTP $HTTP_STATUS"
fi
echo ""

# ===========================
# Summary
# ===========================
echo "========================================="
echo "  Test Results"
echo "========================================="
echo "  PASSED: $PASS"
echo "  FAILED: $FAIL"
echo "  TOTAL:  $((PASS + FAIL))"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "  All tests passed!"
  exit 0
else
  echo "  Some tests failed."
  exit 1
fi
