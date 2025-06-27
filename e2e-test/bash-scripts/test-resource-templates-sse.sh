#!/bin/bash
set -e

echo "🧪 Testing MCP Resource Templates with SSE"
echo "=========================================="

SERVER_URL="http://localhost:3000/mcp"

# Step 1: Initialize session with proper headers
echo -e "\n1️⃣ Initializing MCP session with SSE support..."
TEMP_FILE=$(mktemp)
HEADERS_FILE=$(mktemp)

# Make the initialization request and capture both body and headers
curl -s -D "$HEADERS_FILE" -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {
        "resourceTemplates": {}
      },
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }' > "$TEMP_FILE"

# Extract session ID from headers
SESSION_ID=$(grep -i "mcp-session-id:" "$HEADERS_FILE" | awk -F': ' '{print $2}' | tr -d '\r\n' | awk '{print $1}')
echo "Session ID: '$SESSION_ID'"

# Parse the SSE response
echo -e "\n2️⃣ Parsing initialization response..."
if grep -q "event: message" "$TEMP_FILE"; then
  # Extract JSON data from SSE format
  INIT_JSON=$(grep "^data: " "$TEMP_FILE" | head -1 | sed 's/^data: //')
  echo "Init response (parsed): $INIT_JSON"
  
  # Check capabilities
  if echo "$INIT_JSON" | grep -q "resourceTemplates"; then
    echo "✅ Server supports resourceTemplates capability"
  else
    echo "⚠️  Server may not support resourceTemplates capability"
  fi
else
  echo "Raw response:"
  cat "$TEMP_FILE"
fi

# Step 3: Now make the resources/templates/list request with the session
echo -e "\n3️⃣ Testing resources/templates/list with session..."
TEMPLATES_RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "resources/templates/list",
    "params": {}
  }')

echo "Templates response:"
echo "$TEMPLATES_RESPONSE"

# Parse SSE response if present
if echo "$TEMPLATES_RESPONSE" | grep -q "event: message"; then
  TEMPLATES_JSON=$(echo "$TEMPLATES_RESPONSE" | grep "^data: " | head -1 | sed 's/^data: //')
  echo -e "\n✅ Parsed templates response:"
  echo "$TEMPLATES_JSON" | jq '.' 2>/dev/null || echo "$TEMPLATES_JSON"
  
  # Extract and display templates
  if echo "$TEMPLATES_JSON" | grep -q "resourceTemplates"; then
    echo -e "\n📋 Available resource templates:"
    echo "$TEMPLATES_JSON" | jq -r '.result.resourceTemplates[] | "  - \(.name): \(.uriTemplate)"' 2>/dev/null || echo "Could not parse templates"
  fi
fi

# Cleanup
rm -f "$TEMP_FILE" "$HEADERS_FILE"

echo -e "\n✅ Test completed"