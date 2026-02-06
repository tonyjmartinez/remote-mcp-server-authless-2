#!/bin/bash

# Test Worker Orchestration

echo "=== Testing MCP Worker Orchestration ==="
echo ""

# Initialize MCP session
echo "1. Initializing MCP session..."
INIT_RESPONSE=$(curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-client", "version": "1.0.0"}
    }
  }')

# Extract session ID from response headers
SESSION_ID=$(echo "$INIT_RESPONSE" | grep -i "mcp-session-id" | awk '{print $2}' | tr -d '\r')
echo "Session initialized"
echo ""

# Send initialized notification
curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "notifications/initialized"}' > /dev/null

# List available tools
echo "2. Listing tools..."
TOOLS_RESPONSE=$(curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }' | grep -oP '"name":\s*"\K[^"]+' | grep -E "(create_task|get_task_status|list_tasks|process_batch|get_orchestration_dashboard)")

echo "Orchestration tools found:"
echo "$TOOLS_RESPONSE"
echo ""

# Create a task
echo "3. Creating a data processing task..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "create_task",
      "arguments": {
        "type": "data_processing",
        "params": {"records": 500}
      }
    }
  }')

TASK_ID=$(echo "$CREATE_RESPONSE" | grep -oP 'task_[0-9a-z_]+' | head -1)
echo "Task created: $TASK_ID"
echo ""

# Wait for task to process
echo "4. Waiting 3 seconds for task to process..."
sleep 3
echo ""

# Check task status
echo "5. Checking task status..."
STATUS_RESPONSE=$(curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 4,
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"get_task_status\",
      \"arguments\": {
        \"taskId\": \"$TASK_ID\"
      }
    }
  }")

echo "$STATUS_RESPONSE" | grep -oP '"text":\s*"\K[^"]+' | sed 's/\\n/\n/g' | head -1
echo ""

# Create batch processing tasks
echo "6. Creating batch processing tasks..."
BATCH_RESPONSE=$(curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "process_batch",
      "arguments": {
        "items": [5, 10, 15],
        "operation": "square"
      }
    }
  }')

echo "$BATCH_RESPONSE" | grep -oP '"text":\s*"\K[^"]+' | sed 's/\\n/\n/g' | head -1
echo ""

# Wait for batch to process
sleep 3

# List all tasks
echo "7. Listing all tasks..."
LIST_RESPONSE=$(curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "list_tasks",
      "arguments": {
        "status": "all"
      }
    }
  }')

echo "$LIST_RESPONSE" | grep -oP '"text":\s*"\K[^"]+' | sed 's/\\n/\n/g' | head -1
echo ""

echo "=== Worker Orchestration Test Complete ==="
