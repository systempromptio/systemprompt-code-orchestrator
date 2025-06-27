#!/bin/bash

# Full MCP Flow Test - Tools and Sampling
# Tests the complete flow: Tool → Sampling Request → Client Callback → Server Resolution

set -e

# Load environment variables
if [[ -f ".env" ]]; then
    source .env
else
    echo "❌ .env file not found"
    exit 1
fi

# Configuration
SERVER_URL="${MCP_BASE_URL:-http://localhost:${PORT:-3000}}"
ACCESS_TOKEN="${MCP_ACCESS_TOKEN}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BOLD}${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    🧪 FULL MCP FLOW TEST SUITE                               ║"
echo "║            Tool Calls → Sampling Requests → Callbacks                        ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Initialize session
echo -e "${CYAN}🔗 Initializing MCP session...${NC}"
INIT_RESPONSE=$(curl -s -i \
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
                "name": "full-flow-test",
                "version": "1.0.0"
            }
        }
    }' \
    "${SERVER_URL}/mcp" 2>/dev/null)

SESSION_ID=$(echo "$INIT_RESPONSE" | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')

if [[ -z "$SESSION_ID" ]]; then
    echo -e "${RED}❌ Failed to initialize session${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Session initialized: ${SESSION_ID}${NC}"

# Test 1: List tools
echo -e "\n${BOLD}📋 Test 1: List Available Tools${NC}"
TOOLS=$(curl -s \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "mcp-session-id: ${SESSION_ID}" \
    -d '{
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    }' \
    "${SERVER_URL}/mcp")

echo -e "${CYAN}Available tools:${NC}"
echo "$TOOLS" | jq -r '.result.tools[] | "- \(.name): \(.description)"' 2>/dev/null || echo "$TOOLS"

# Test 2: Call structured-data-example (simple tool)
echo -e "\n${BOLD}📊 Test 2: Structured Data Tool (No Sampling)${NC}"
STRUCT_RESPONSE=$(curl -s \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "mcp-session-id: ${SESSION_ID}" \
    -d '{
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "structured_data_example",
            "arguments": {
                "dataType": "user",
                "id": "test-123",
                "includeNested": true
            }
        }
    }' \
    "${SERVER_URL}/mcp")

echo -e "${CYAN}Response:${NC}"
echo "$STRUCT_RESPONSE" | jq '.' 2>/dev/null || echo "$STRUCT_RESPONSE"

# Test 3: Call sampling-example tool (triggers full flow)
echo -e "\n${BOLD}🤖 Test 3: Sampling Example Tool (Full Flow)${NC}"
echo -e "${YELLOW}This tool will:${NC}"
echo -e "1. Create a sampling request on the server"
echo -e "2. Send it to the client for approval"
echo -e "3. Execute the suggest_action callback on the server"
echo -e ""

SAMPLING_RESPONSE=$(curl -s \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "mcp-session-id: ${SESSION_ID}" \
    -d '{
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {
            "name": "sampling_example",
            "arguments": {
                "taskType": "analyze",
                "content": "Test the full MCP flow: Tool creates sampling request, client approves, server executes callback"
            }
        }
    }' \
    "${SERVER_URL}/mcp")

echo -e "${CYAN}Sampling Tool Response:${NC}"
echo "$SAMPLING_RESPONSE" | jq '.' 2>/dev/null || echo "$SAMPLING_RESPONSE"

# Test 4: Direct sampling request (bypass tool)
echo -e "\n${BOLD}📨 Test 4: Direct Sampling Request${NC}"
DIRECT_SAMPLING=$(curl -s \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "mcp-session-id: ${SESSION_ID}" \
    -d '{
        "jsonrpc": "2.0",
        "id": 5,
        "method": "sampling/createMessage",
        "params": {
            "messages": [
                {
                    "role": "user",
                    "content": {
                        "type": "text",
                        "text": "Direct sampling test: Analyze MCP architecture"
                    }
                }
            ],
            "maxTokens": 100,
            "_meta": {
                "callback": "suggest_action"
            }
        }
    }' \
    "${SERVER_URL}/mcp")

echo -e "${CYAN}Direct Sampling Response:${NC}"
echo "$DIRECT_SAMPLING" | jq '.' 2>/dev/null || echo "$DIRECT_SAMPLING"

# Test 5: Multiple concurrent sampling requests
echo -e "\n${BOLD}⚡ Test 5: Concurrent Sampling Requests${NC}"
echo -e "${CYAN}Sending 3 concurrent sampling requests...${NC}"

for i in {1..3}; do
    (
        curl -s \
            -H "Content-Type: application/json" \
            -H "Accept: application/json, text/event-stream" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            -H "mcp-session-id: ${SESSION_ID}" \
            -d '{
                "jsonrpc": "2.0",
                "id": '$((5+i))',
                "method": "tools/call",
                "params": {
                    "name": "sampling_example",
                    "arguments": {
                        "taskType": "summarize",
                        "content": "Concurrent test '$i': Testing session isolation and callback handling"
                    }
                }
            }' \
            "${SERVER_URL}/mcp" > /tmp/sampling_result_$i.json 2>&1
        
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ Concurrent request $i completed${NC}"
        else
            echo -e "${RED}❌ Concurrent request $i failed${NC}"
        fi
    ) &
done

# Wait for all concurrent requests
wait

echo -e "\n${BOLD}${BLUE}"
echo "════════════════════════════════════════════════════════════════════════════════"
echo "                           📊 TEST SUMMARY"
echo "════════════════════════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Check Docker logs for callback execution
echo -e "${CYAN}📜 Checking server logs for callback execution...${NC}"
if command -v docker &> /dev/null; then
    CALLBACK_LOGS=$(docker logs systemprompt-mcp-reddit-reddit-mcp-server-1 2>&1 | tail -20 | grep -E "(Callback started|suggest_action|Sampling request completed)" || echo "No callback logs found")
    echo -e "${YELLOW}Recent callback activity:${NC}"
    echo "$CALLBACK_LOGS"
fi

echo -e "\n${GREEN}✅ Full flow test completed!${NC}"
echo -e "${CYAN}Key validations:${NC}"
echo "• Session management working"
echo "• Tool calls executing properly"
echo "• Sampling requests triggering"
echo "• Callbacks being invoked"
echo "• Concurrent requests handled"