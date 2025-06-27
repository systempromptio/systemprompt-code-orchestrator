#!/bin/bash

# Tool Testing Script for Reddit MCP Server
# Tests various tools including structured-data-example

set -e

# Load environment variables
if [[ -f "../.env" ]]; then
    source ../.env
else
    echo "❌ .env file not found"
    exit 1
fi

# Configuration
SERVER_URL="${MCP_BASE_URL:-http://localhost:${PORT:-3000}}"
ACCESS_TOKEN="${MCP_ACCESS_TOKEN}"

# Validate token
if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "❌ MCP_ACCESS_TOKEN not found in .env file"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${BOLD}${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                        🧪 MCP TOOL TEST SUITE                                ║"
echo "║                     Testing Tool Calls with Sessions                         ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# First, initialize a session
echo -e "${CYAN}🔗 Initializing session...${NC}"
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
                "name": "tool-test-client",
                "version": "1.0.0"
            }
        }
    }' \
    "${SERVER_URL}/mcp" 2>/dev/null)

# Extract session ID
SESSION_ID=$(echo "$INIT_RESPONSE" | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')

if [[ -z "$SESSION_ID" ]]; then
    echo -e "${RED}❌ Failed to initialize session${NC}"
    echo "$INIT_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Session initialized with ID: ${SESSION_ID}${NC}"

# Function to call a tool
call_tool() {
    local tool_name=$1
    local tool_args=$2
    local request_id=$3
    
    echo -e "\n${BLUE}🔧 Calling tool: ${tool_name}${NC}"
    
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "mcp-session-id: ${SESSION_ID}" \
        -d '{
            "jsonrpc": "2.0",
            "id": '${request_id}',
            "method": "tools/call",
            "params": {
                "name": "'${tool_name}'",
                "arguments": '${tool_args}'
            }
        }' \
        "${SERVER_URL}/mcp" 2>/dev/null || echo -e "\n000")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "${http_code}" == "200" ]]; then
        echo -e "${GREEN}✅ Tool call successful${NC}"
        echo -e "${CYAN}Response:${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}❌ Tool call failed - HTTP ${http_code}${NC}"
        echo -e "${YELLOW}Response: ${body}${NC}"
        return 1
    fi
}

# Test 1: List available tools
echo -e "\n${BOLD}📋 Test 1: List available tools${NC}"
TOOLS_RESPONSE=$(curl -s \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "mcp-session-id: ${SESSION_ID}" \
    -d '{
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    }' \
    "${SERVER_URL}/mcp" 2>/dev/null)

echo -e "${CYAN}Available tools:${NC}"
echo "$TOOLS_RESPONSE" | jq -r '.result.tools[].name' 2>/dev/null || echo "Failed to parse tools"

# Test 2: Call structured-data-example tool
echo -e "\n${BOLD}📊 Test 2: Structured Data Example Tool${NC}"
call_tool "structured-data-example" '{
    "type": "user",
    "name": "TestUser123",
    "email": "test@example.com",
    "isActive": true,
    "age": 25,
    "tags": ["test", "mcp", "concurrent"],
    "metadata": {
        "source": "test-script",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
}' 3

# Test 3: Call search-reddit tool
echo -e "\n${BOLD}🔍 Test 3: Search Reddit Tool${NC}"
call_tool "search-reddit" '{
    "query": "typescript",
    "sort": "relevance",
    "time": "week",
    "limit": 5
}' 4

# Test 4: Call get-notifications tool
echo -e "\n${BOLD}🔔 Test 4: Get Notifications Tool${NC}"
call_tool "get-notifications" '{}' 5

# Test 5: Test concurrent tool calls
echo -e "\n${BOLD}⚡ Test 5: Concurrent Tool Calls${NC}"
echo -e "${CYAN}Starting 3 concurrent tool calls...${NC}"

# Start concurrent calls
(call_tool "structured-data-example" '{"type":"admin","name":"Admin1","email":"admin1@test.com","isActive":true,"age":30,"tags":["admin"],"metadata":{}}' 6) &
PID1=$!

(call_tool "structured-data-example" '{"type":"moderator","name":"Mod1","email":"mod1@test.com","isActive":false,"age":28,"tags":["moderator"],"metadata":{}}' 7) &
PID2=$!

(call_tool "structured-data-example" '{"type":"user","name":"User2","email":"user2@test.com","isActive":true,"age":22,"tags":["regular"],"metadata":{}}' 8) &
PID3=$!

# Wait for all concurrent calls
wait $PID1 && echo -e "${GREEN}✅ Concurrent call 1 completed${NC}" || echo -e "${RED}❌ Concurrent call 1 failed${NC}"
wait $PID2 && echo -e "${GREEN}✅ Concurrent call 2 completed${NC}" || echo -e "${RED}❌ Concurrent call 2 failed${NC}"
wait $PID3 && echo -e "${GREEN}✅ Concurrent call 3 completed${NC}" || echo -e "${RED}❌ Concurrent call 3 failed${NC}"

echo -e "\n${BOLD}${BLUE}"
echo "════════════════════════════════════════════════════════════════════════════════"
echo "                              📊 TEST SUMMARY"
echo "════════════════════════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${GREEN}✅ Tool testing completed!${NC}"
echo -e "${CYAN}Session ID: ${SESSION_ID}${NC}"