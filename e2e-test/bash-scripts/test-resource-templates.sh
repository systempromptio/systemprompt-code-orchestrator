#!/bin/bash
set -e

echo "🧪 Testing MCP Resource Templates"
echo "================================="

# Server URL
SERVER_URL="http://localhost:3000/mcp"

# Step 1: Initialize session
echo -e "\n1️⃣ Initializing MCP session..."
INIT_RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {
        "roots": { "listChanged": true },
        "resourceTemplates": {}
      },
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }')

echo "Init response: $INIT_RESPONSE"

# Extract session ID from headers (we need to capture headers)
echo -e "\n2️⃣ Initializing with header capture..."
TEMP_HEADERS=$(mktemp)
INIT_RESPONSE=$(curl -s -D "$TEMP_HEADERS" -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {
        "roots": { "listChanged": true },
        "resourceTemplates": {}
      },
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }')

# Extract session ID
SESSION_ID=$(grep -i "mcp-session-id\|x-session-id" "$TEMP_HEADERS" | head -1 | awk '{print $2}' | tr -d '\r\n')
echo "Session ID: '$SESSION_ID'"
echo "Headers:"
cat "$TEMP_HEADERS" | grep -i "session"
echo "Init response: $INIT_RESPONSE"

# Check if we have required capability
if echo "$INIT_RESPONSE" | grep -q "resourceTemplates"; then
  echo "✅ Server supports resourceTemplates capability"
else
  echo "⚠️  Server may not support resourceTemplates capability"
fi

# Step 3: Test resources/templates/list
echo -e "\n3️⃣ Testing resources/templates/list..."
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

echo "Templates response: $TEMPLATES_RESPONSE"

# Parse and display templates if successful
if echo "$TEMPLATES_RESPONSE" | grep -q "error"; then
  echo "❌ Error in response"
  
  # Try alternative approach - check what methods the server supports
  echo -e "\n4️⃣ Debugging - Listing available resources..."
  RESOURCES_RESPONSE=$(curl -s -X POST "$SERVER_URL" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "mcp-session-id: $SESSION_ID" \
    -d '{
      "jsonrpc": "2.0",
      "id": 3,
      "method": "resources/list",
      "params": {}
    }')
  
  echo "Resources response: $RESOURCES_RESPONSE"
  
  # Try with different session header name
  echo -e "\n5️⃣ Trying with x-session-id header..."
  TEMPLATES_RESPONSE2=$(curl -s -X POST "$SERVER_URL" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "x-session-id: $SESSION_ID" \
    -d '{
      "jsonrpc": "2.0",
      "id": 4,
      "method": "resources/templates/list",
      "params": {}
    }')
  
  echo "Templates response (x-session-id): $TEMPLATES_RESPONSE2"
  
else
  echo "✅ Successfully retrieved resource templates!"
  echo "$TEMPLATES_RESPONSE" | jq '.result.resourceTemplates[] | {name: .name, uriTemplate: .uriTemplate}' 2>/dev/null || echo "$TEMPLATES_RESPONSE"
fi

# Cleanup
rm -f "$TEMP_HEADERS"

echo -e "\n✅ Test completed"