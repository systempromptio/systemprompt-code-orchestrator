#!/bin/bash

# E2E Bash Script Test Runner
# Runs all bash-based integration tests

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test tracking
PASSED=0
FAILED=0
TOTAL=0

echo -e "${BLUE}===================================="
echo "MCP Server - Bash Script Test Suite"
echo -e "====================================${NC}\n"

# Function to run a test
run_test() {
    local test_name=$1
    local test_script=$2
    
    TOTAL=$((TOTAL + 1))
    echo -e "${BLUE}Running: ${test_name}${NC}"
    
    if bash "${test_script}"; then
        PASSED=$((PASSED + 1))
        echo -e "${GREEN}✅ ${test_name} passed${NC}\n"
    else
        FAILED=$((FAILED + 1))
        echo -e "${RED}❌ ${test_name} failed${NC}\n"
    fi
}

# Run individual test scripts
run_test "Basic Tools Test" "./test-tools.sh"
run_test "Concurrent Sessions Test" "./test-concurrent-sessions.sh"
run_test "Concurrent Tools Test" "./test-concurrent-tools.sh"
run_test "Full Flow Test" "./test-full-flow.sh"

# Summary
echo -e "${BLUE}===================================="
echo "Test Summary"
echo -e "====================================${NC}"
echo "Total: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"

if [ ${FAILED} -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi