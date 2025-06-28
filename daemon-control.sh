#!/bin/bash
# daemon-control.sh - Manage the Host Bridge Daemon
# This script starts, stops, and manages the host bridge daemon that connects Docker to host CLI tools

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DAEMON_PORT="${HOST_BRIDGE_PORT:-9876}"
DAEMON_SCRIPT="daemon/dist/host-bridge-daemon.js"
PID_FILE="logs/daemon.pid"
LOG_FILE="logs/host-bridge.log"

# Helper functions
print_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if daemon is running
is_daemon_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Get daemon PID
get_daemon_pid() {
    if [ -f "$PID_FILE" ]; then
        cat "$PID_FILE"
    else
        # Fallback: try to find process
        pgrep -f "$DAEMON_SCRIPT" | head -1
    fi
}

# Stop daemon
stop_daemon() {
    if is_daemon_running; then
        local pid=$(get_daemon_pid)
        print_info "Stopping daemon (PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        
        # Wait for process to stop
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "Force killing daemon..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        rm -f "$PID_FILE"
        print_success "Daemon stopped"
    else
        print_info "Daemon is not running"
    fi
}

# Start daemon
start_daemon() {
    if is_daemon_running; then
        local pid=$(get_daemon_pid)
        print_warning "Daemon is already running (PID: $pid)"
        return 0
    fi
    
    # Ensure logs directory exists
    mkdir -p logs
    
    # Source environment if available
    if [ -f "daemon/env.sh" ]; then
        source daemon/env.sh
    fi
    
    # Set environment variables
    export CLAUDE_PATH="${CLAUDE_PATH:-$(which claude 2>/dev/null)}"
    export SHELL_PATH="${SHELL_PATH:-$(which bash)}"
    export CLAUDE_AVAILABLE="${CLAUDE_AVAILABLE:-$(command -v claude &>/dev/null && echo true || echo false)}"
    
    print_info "Starting daemon on port $DAEMON_PORT..."
    print_info "Claude path: ${CLAUDE_PATH:-not found}"
    print_info "Log file: $LOG_FILE"
    
    # Start daemon in background
    nohup node "$DAEMON_SCRIPT" >> "$LOG_FILE" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$PID_FILE"
    
    # Wait a moment to check if it started successfully
    sleep 2
    
    if ps -p "$pid" > /dev/null 2>&1; then
        print_success "Daemon started successfully (PID: $pid)"
        print_info "Listening on port $DAEMON_PORT"
        return 0
    else
        print_error "Failed to start daemon"
        rm -f "$PID_FILE"
        print_info "Check logs at: $LOG_FILE"
        tail -20 "$LOG_FILE"
        return 1
    fi
}

# Show daemon status
show_status() {
    print_header "Daemon Status"
    
    if is_daemon_running; then
        local pid=$(get_daemon_pid)
        print_success "Daemon is running (PID: $pid)"
        
        # Check if port is listening
        if lsof -i :$DAEMON_PORT > /dev/null 2>&1; then
            print_success "Listening on port $DAEMON_PORT"
        else
            print_warning "Process running but not listening on port $DAEMON_PORT"
        fi
        
        # Show recent logs
        if [ -f "$LOG_FILE" ]; then
            echo -e "\n${BLUE}Recent logs:${NC}"
            tail -5 "$LOG_FILE"
        fi
    else
        print_info "Daemon is not running"
    fi
}

# Show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        print_error "Log file not found: $LOG_FILE"
    fi
}

# Main command handling
case "${1:-start}" in
    start)
        print_header "Starting Host Bridge Daemon"
        start_daemon
        ;;
    stop)
        print_header "Stopping Host Bridge Daemon"
        stop_daemon
        ;;
    restart)
        print_header "Restarting Host Bridge Daemon"
        stop_daemon
        sleep 1
        start_daemon
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the daemon (default)"
        echo "  stop     - Stop the daemon"
        echo "  restart  - Restart the daemon"
        echo "  status   - Show daemon status"
        echo "  logs     - Follow daemon logs"
        exit 1
        ;;
esac

exit 0