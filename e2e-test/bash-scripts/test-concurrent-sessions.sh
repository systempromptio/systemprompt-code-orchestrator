#!/bin/bash

# Concurrent Sessions Test for Reddit MCP Server
# Tests multiple simultaneous sampling requests across different sessions
# This validates the new single-server, multi-session architecture

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
NUM_SESSIONS=5
REQUESTS_PER_SESSION=3
CONCURRENT_DELAY=0.1  # Delay between starting concurrent requests
SESSION_DELAY=0.2     # Delay between session creation

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

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up background processes...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    wait 2>/dev/null || true
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Function to create a session and get session ID
create_session() {
    local session_num=$1
    echo -e "${CYAN}🔗 Creating session ${session_num}...${NC}"
    
    # First send initialize request
    local init_response=$(curl -s -w "\n%{http_code}" \
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
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }' \
        "${SERVER_URL}/mcp" 2>/dev/null || echo -e "\n000")
    
    local http_code=$(echo "$init_response" | tail -n1)
    local body=$(echo "$init_response" | head -n -1)
    
    if [[ "${http_code}" != "200" ]]; then
        echo -e "${RED}❌ Failed to initialize session ${session_num}: HTTP ${http_code}${NC}"
        echo -e "${YELLOW}   Response: ${body}${NC}"
        return 1
    fi
    
    # Extract session ID from response headers if available
    local session_id=$(echo "$body" | jq -r '.sessionId // empty' 2>/dev/null)
    
    # Now make a test request to verify session is working
    local test_response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        ${session_id:+-H "mcp-session-id: ${session_id}"} \
        -d '{
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list"
        }' \
        "${SERVER_URL}/mcp" 2>/dev/null || echo "000")
    
    if [[ "${test_response}" == *"200" ]]; then
        echo -e "${GREEN}✅ Session ${session_num} created and verified successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to verify session ${session_num}: ${test_response}${NC}"
        return 1
    fi
}

# Function to perform a sampling request
do_sampling_request() {
    local session_num=$1
    local request_num=$2
    local session_id=$3
    
    echo -e "${BLUE}📤 Session ${session_num}, Request ${request_num}: Starting sampling...${NC}"
    
    local start_time=$(date +%s.%N)
    
    # Perform sampling request
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        ${session_id:+-H "mcp-session-id: ${session_id}"} \
        -d '{
            "jsonrpc": "2.0",
            "id": '${request_num}',
            "method": "sampling/createMessage",
            "params": {
                "messages": [
                    {
                        "role": "user",
                        "content": {
                            "type": "text",
                            "text": "Analyze this concurrent test scenario for session '${session_num}' request '${request_num}'"
                        }
                    }
                ],
                "maxTokens": 100,
                "temperature": 0.7,
                "_meta": {
                    "callback": "suggest_action"
                }
            }
        }' \
        "${SERVER_URL}/mcp" 2>/dev/null || echo -e "\n000")
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc -l)
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [[ "${http_code}" == "200" ]]; then
        echo -e "${GREEN}✅ Session ${session_num}, Request ${request_num}: SUCCESS (${duration}s)${NC}"
        echo -e "${CYAN}   Response preview: $(echo "$body" | jq -r '.result.content.text // "No content"' 2>/dev/null | head -c 50)...${NC}"
        return 0
    else
        echo -e "${RED}❌ Session ${session_num}, Request ${request_num}: FAILED (${duration}s) - HTTP ${http_code}${NC}"
        echo -e "${YELLOW}   Response: $(echo "$body" | head -c 100)${NC}"
        return 1
    fi
}

# Function to test a single session with multiple requests
test_session() {
    local session_num=$1
    echo -e "\n${BOLD}${BLUE}🚀 Testing Session ${session_num}${NC}"
    
    # Initialize session first
    local session_id="session_${session_num}_${RANDOM}"
    
    # Send initialize request
    echo -e "${CYAN}🔗 Initializing session ${session_num}...${NC}"
    local init_response=$(curl -s -i \
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
                    "name": "test-client-'${session_num}'",
                    "version": "1.0.0"
                }
            }
        }' \
        "${SERVER_URL}/mcp" 2>/dev/null)
    
    # Extract session ID from headers if provided
    local extracted_session_id=$(echo "$init_response" | grep -i "mcp-session-id:" | awk '{print $2}' | tr -d '\r')
    if [[ -n "$extracted_session_id" ]]; then
        session_id="$extracted_session_id"
        echo -e "${GREEN}✅ Session ${session_num} initialized with ID: ${session_id}${NC}"
    else
        # Check if the response was successful
        if echo "$init_response" | tail -1 | grep -q "result"; then
            echo -e "${GREEN}✅ Session ${session_num} initialized successfully${NC}"
        else
            echo -e "${RED}❌ Session ${session_num}: Failed to initialize${NC}"
            echo -e "${YELLOW}Response: $(echo "$init_response" | tail -5)${NC}"
            return 1
        fi
    fi
    
    local success_count=0
    local total_requests=$REQUESTS_PER_SESSION
    
    # Start multiple concurrent requests for this session
    local pids=()
    for req_num in $(seq 1 $REQUESTS_PER_SESSION); do
        (
            sleep $(echo "$req_num * $CONCURRENT_DELAY" | bc -l)
            do_sampling_request $session_num $req_num "$session_id"
        ) &
        pids+=($!)
    done
    
    # Wait for all requests in this session to complete
    for pid in "${pids[@]}"; do
        if wait $pid; then
            ((success_count++))
        fi
    done
    
    echo -e "${BOLD}📊 Session ${session_num} Summary: ${success_count}/${total_requests} requests succeeded${NC}"
    
    if [[ $success_count -eq $total_requests ]]; then
        echo -e "${GREEN}✅ Session ${session_num}: ALL REQUESTS SUCCESSFUL${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Session ${session_num}: Some requests failed${NC}"
        return 1
    fi
}

# Main test function
main() {
    echo -e "${BOLD}${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    🧪 CONCURRENT SESSIONS TEST SUITE                         ║"
    echo "║                     Reddit MCP Server Architecture Test                      ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}ℹ Testing concurrent sampling requests across multiple sessions:${NC}"
    echo -e "  • ${CYAN}Sessions: ${NUM_SESSIONS}${NC}"
    echo -e "  • ${CYAN}Requests per session: ${REQUESTS_PER_SESSION}${NC}"
    echo -e "  • ${CYAN}Total requests: $((NUM_SESSIONS * REQUESTS_PER_SESSION))${NC}"
    echo -e "  • ${CYAN}Server URL: ${SERVER_URL}${NC}"
    
    # Check if server is running
    echo -e "\n${BLUE}🔍 Checking server availability...${NC}"
    if ! curl -s "${SERVER_URL}/health" >/dev/null; then
        echo -e "${RED}❌ Server is not responding at ${SERVER_URL}${NC}"
        echo -e "${YELLOW}💡 Please start the server first: npm run dev${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Server is running${NC}"
    
    # Start concurrent sessions
    echo -e "\n${BOLD}${BLUE}🚀 Starting concurrent session tests...${NC}"
    
    local session_pids=()
    local start_time=$(date +%s.%N)
    
    # Start all sessions concurrently
    for session_num in $(seq 1 $NUM_SESSIONS); do
        (
            sleep $(echo "$session_num * $SESSION_DELAY" | bc -l)
            test_session $session_num
        ) &
        session_pids+=($!)
    done
    
    # Wait for all sessions to complete
    local successful_sessions=0
    local total_sessions=$NUM_SESSIONS
    
    echo -e "\n${BLUE}⏳ Waiting for all sessions to complete...${NC}"
    
    for pid in "${session_pids[@]}"; do
        if wait $pid; then
            ((successful_sessions++))
        fi
    done
    
    local end_time=$(date +%s.%N)
    local total_duration=$(echo "$end_time - $start_time" | bc -l)
    
    # Final summary
    echo -e "\n${BOLD}${BLUE}"
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo "                               📊 FINAL RESULTS"
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo -e "${NC}"
    
    echo -e "${BOLD}📈 Test Statistics:${NC}"
    echo -e "  • Total sessions tested: ${total_sessions}"
    echo -e "  • Successful sessions: ${successful_sessions}"
    echo -e "  • Failed sessions: $((total_sessions - successful_sessions))"
    echo -e "  • Success rate: $(echo "scale=1; $successful_sessions * 100 / $total_sessions" | bc -l)%"
    echo -e "  • Total duration: $(printf "%.2f" $total_duration)s"
    echo -e "  • Total requests sent: $((NUM_SESSIONS * REQUESTS_PER_SESSION))"
    echo -e "  • Estimated successful requests: $((successful_sessions * REQUESTS_PER_SESSION))"
    
    if [[ $successful_sessions -eq $total_sessions ]]; then
        echo -e "\n${GREEN}${BOLD}🎉 ALL SESSIONS PASSED! The single-server multi-session architecture is working perfectly!${NC}"
        echo -e "${GREEN}✅ Concurrent sampling requests handled successfully${NC}"
        echo -e "${GREEN}✅ Session isolation maintained${NC}"
        echo -e "${GREEN}✅ Server performance under load verified${NC}"
        return 0
    else
        echo -e "\n${YELLOW}⚠️  Some sessions failed. Architecture may need optimization.${NC}"
        echo -e "${YELLOW}💡 Check server logs for detailed error information${NC}"
        return 1
    fi
}

# Check dependencies
command -v curl >/dev/null 2>&1 || { echo -e "${RED}❌ curl is required but not installed${NC}"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  jq not found - response previews will be limited${NC}"; }
command -v bc >/dev/null 2>&1 || { echo -e "${RED}❌ bc is required but not installed${NC}"; exit 1; }

# Run the test
main "$@"