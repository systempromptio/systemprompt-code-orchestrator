#!/bin/bash

# Test concurrent tool calls across multiple sessions

set -e
source .env

SERVER_URL="${MCP_BASE_URL:-http://localhost:${PORT:-3000}}"
ACCESS_TOKEN="${MCP_ACCESS_TOKEN}"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Testing Concurrent Tool Calls Across Sessions${NC}"

# Function to call a tool
call_tool() {
    local session_id=$1
    local tool_name=$2
    local args=$3
    local req_id=$4
    
    local response=$(curl -s \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "mcp-session-id: ${session_id}" \
        -d '{
            "jsonrpc": "2.0",
            "id": '${req_id}',
            "method": "tools/call",
            "params": {
                "name": "'${tool_name}'",
                "arguments": '${args}'
            }
        }' \
        "${SERVER_URL}/mcp" 2>/dev/null)
    
    if echo "$response" | grep -q "result"; then
        echo -e "${GREEN}✅ Session ${session_id:0:10}... called ${tool_name}${NC}"
        return 0
    else
        echo -e "${RED}❌ Session ${session_id:0:10}... failed ${tool_name}${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Initialize server if needed
echo -e "${CYAN}Ensuring server is initialized...${NC}"
curl -s \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {
                "name": "tool-test-client",
                "version": "1.0.0"
            }
        }
    }' \
    "${SERVER_URL}/mcp" > /dev/null 2>&1

echo -e "${GREEN}✅ Server ready${NC}"

# Create 3 sessions and call different tools concurrently
echo -e "\n${CYAN}Running concurrent tool calls...${NC}"

# Session 1: structured_data_example
(
    SESSION_ID="session_tool_test_1_${RANDOM}"
    echo -e "${CYAN}Session 1 calling structured_data_example...${NC}"
    call_tool "$SESSION_ID" "structured_data_example" '{"dataType": "user", "includeNested": true}' 100
) &

# Session 2: elicitation_example (doesn't need Reddit auth)
(
    SESSION_ID="session_tool_test_2_${RANDOM}"
    echo -e "${CYAN}Session 2 calling elicitation_example...${NC}"
    call_tool "$SESSION_ID" "elicitation_example" '{"type": "input", "prompt": "Test elicitation from session 2"}' 200
) &

# Session 3: sampling_example (doesn't need Reddit auth for the demo)
(
    SESSION_ID="session_tool_test_3_${RANDOM}"
    echo -e "${CYAN}Session 3 calling sampling_example...${NC}"
    call_tool "$SESSION_ID" "sampling_example" '{"taskType": "summarize", "content": "This is a test content to summarize for concurrent testing."}' 300
) &

# Wait for all to complete
wait

echo -e "\n${GREEN}All concurrent tool calls completed!${NC}"

# Show server logs
echo -e "\n${CYAN}Recent server activity:${NC}"
docker logs systemprompt-mcp-reddit-reddit-mcp-server-1 2>&1 | tail -30 | grep -E "(handleToolCall|Session|🔧)" | tail -10 || echo "No tool logs found"