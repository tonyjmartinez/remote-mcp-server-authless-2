#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://remote-mcp-server-authless-2.ajosephmartinez.workers.dev}"
MCP_URL="${BASE_URL%/}/mcp"

json_payload() {
  cat
}

call_mcp() {
  local payload="$1"
  local session_id="${2:-}"

  if [[ -n "$session_id" ]]; then
    curl -sS "$MCP_URL" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json, text/event-stream" \
      -H "Mcp-Session-Id: $session_id" \
      -d "$payload"
  else
    curl -sS "$MCP_URL" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json, text/event-stream" \
      -d "$payload"
  fi
}

extract_sse_json() {
  sed -n 's/^data: //p'
}

extract_task_id() {
  python3 -c 'import json,sys,re; data=json.load(sys.stdin); text=data["result"]["content"][0]["text"]; m=re.search(r"task_[0-9a-z_]+", text); print(m.group(0) if m else "")'
}

agent_create_task() {
  local session_id="$1"
  local request_id="$2"
  local agent_name="$3"
  local message="$4"
  local task_type="$5"

  local payload
  payload=$(json_payload <<JSON
{"jsonrpc":"2.0","id":$request_id,"method":"tools/call","params":{"name":"create_task","arguments":{"type":"$task_type","params":{"agent":"$agent_name","message":"$message"}}}}
JSON
)

  call_mcp "$payload" "$session_id" | extract_sse_json
}

get_task_status_json() {
  local session_id="$1"
  local request_id="$2"
  local task_id="$3"

  local payload
  payload=$(json_payload <<JSON
{"jsonrpc":"2.0","id":$request_id,"method":"tools/call","params":{"name":"get_task_status","arguments":{"taskId":"$task_id"}}}
JSON
)

  call_mcp "$payload" "$session_id" | extract_sse_json
}

echo "=== Remote MCP Orchestration Smoke Test ==="
echo "Target: $MCP_URL"
echo

echo "1) Initialize MCP session"
INIT_RESPONSE=$(curl -siS "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"orchestration-demo","version":"1.0"}}}')

SESSION_ID=$(echo "$INIT_RESPONSE" | awk -F': ' 'tolower($1)=="mcp-session-id" {print $2}' | tr -d '\r')
if [[ -z "$SESSION_ID" ]]; then
  echo "Failed to initialize MCP session"
  exit 1
fi
echo "Session ID: $SESSION_ID"
echo

echo "2) Simulate agent-to-agent orchestration"

echo "   - Planner agent creates a data-processing task"
PLANNER_JSON=$(agent_create_task "$SESSION_ID" 2 "planner-agent" "Collect source data for analysis" "data_processing")
PLANNER_TASK_ID=$(echo "$PLANNER_JSON" | extract_task_id)
echo "     Task: $PLANNER_TASK_ID"

echo "   - Analyst agent creates a report-generation task"
ANALYST_JSON=$(agent_create_task "$SESSION_ID" 3 "analyst-agent" "Summarize and synthesize findings" "report_generation")
ANALYST_TASK_ID=$(echo "$ANALYST_JSON" | extract_task_id)
echo "     Task: $ANALYST_TASK_ID"

echo "   - Reviewer agent creates a quality-check task"
REVIEWER_JSON=$(agent_create_task "$SESSION_ID" 4 "reviewer-agent" "Verify output quality and consistency" "data_processing")
REVIEWER_TASK_ID=$(echo "$REVIEWER_JSON" | extract_task_id)
echo "     Task: $REVIEWER_TASK_ID"
echo

echo "3) Wait for worker tasks to complete"
sleep 3

echo "4) Fetch task status and display agent conversation"
for pair in \
  "planner-agent|$PLANNER_TASK_ID|5" \
  "analyst-agent|$ANALYST_TASK_ID|6" \
  "reviewer-agent|$REVIEWER_TASK_ID|7"; do
  IFS='|' read -r agent task_id req_id <<< "$pair"
  STATUS_JSON=$(get_task_status_json "$SESSION_ID" "$req_id" "$task_id")
  STATUS_TEXT=$(echo "$STATUS_JSON" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data["result"]["content"][0]["text"])')

  echo "[$agent] $STATUS_TEXT" | sed 's/\\n/ /g'

done

echo
echo "5) Get orchestration dashboard snapshot"
DASHBOARD_JSON=$(call_mcp '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"get_orchestration_dashboard","arguments":{}}}' "$SESSION_ID" | extract_sse_json)
DASHBOARD_TEXT=$(echo "$DASHBOARD_JSON" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data["result"]["content"][0]["text"])')
echo "$DASHBOARD_TEXT"

echo
echo "=== Done ==="
