#!/bin/bash

SERVER_URL="https://remote-mcp-server-authless-2.ajosephmartinez.workers.dev/mcp"
SESSION_ID=""

echo "=== Testing MCP UI Components ==="
echo

# Step 1: Initialize
echo "1. Initializing session..."
INIT_RESPONSE=$(curl -s -i -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test-script", "version": "1.0.0"}
    }
  }')

# Extract session ID from headers
SESSION_ID=$(echo "$INIT_RESPONSE" | grep -i "mcp-session-id:" | cut -d' ' -f2 | tr -d '\r')
echo "Session ID: $SESSION_ID"
echo

# Step 2: Call a UI tool (render_code_snippet)
echo "2. Calling render_code_snippet tool..."
TOOL_RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "render_code_snippet",
      "arguments": {
        "code": "console.log(\"Hello World\");",
        "language": "javascript",
        "filename": "hello.js",
        "showLineNumbers": true
      }
    }
  }')

echo "Tool response:"
echo "$TOOL_RESPONSE" | jq '.'
echo

# Extract resource URI
RESOURCE_URI=$(echo "$TOOL_RESPONSE" | jq -r '.result._meta.ui.resourceUri')
echo "Resource URI: $RESOURCE_URI"
echo

# Step 3: Read the UI resource
echo "3. Reading UI resource..."
RESOURCE_RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 3,
    \"method\": \"resources/read\",
    \"params\": {
      \"uri\": \"$RESOURCE_URI\"
    }
  }")

echo "Resource response:"
echo "$RESOURCE_RESPONSE" | jq '.'
echo

# Check if successful
if echo "$RESOURCE_RESPONSE" | jq -e '.result.contents[0].blob' > /dev/null; then
  echo "✅ SUCCESS: UI resource was created and retrieved!"
  echo
  echo "Decoded HTML preview:"
  echo "$RESOURCE_RESPONSE" | jq -r '.result.contents[0].blob' | base64 -d | head -c 200
  echo "..."
else
  echo "❌ FAILED: Error retrieving resource"
  echo "$RESOURCE_RESPONSE" | jq '.error'
fi
