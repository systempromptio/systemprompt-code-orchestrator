#!/bin/sh
set -e

# Ensure state directories exist with correct permissions
echo "Initializing state directories..."
mkdir -p /data/state/tasks /data/state/sessions /data/state/logs /data/state/reports

# Check if we can write to the directories
if ! touch /data/state/.write-test 2>/dev/null; then
    echo "Warning: Cannot write to /data/state. Falling back to local directory."
    export STATE_PATH="./coding-agent-state"
    mkdir -p ./coding-agent-state/tasks ./coding-agent-state/sessions ./coding-agent-state/logs ./coding-agent-state/reports
else
    rm -f /data/state/.write-test
    echo "✓ State directory is writable: /data/state"
fi

# Set default environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export STATE_PATH=${STATE_PATH:-/data/state}
export PROJECTS_PATH=${PROJECTS_PATH:-/data/projects}

# Pass through tunnel URL if set
if [ -n "$TUNNEL_URL" ]; then
    export PUBLIC_URL=${TUNNEL_URL}
    echo "- Using tunnel URL: $TUNNEL_URL"
fi

# Unset ANTHROPIC_API_KEY to use authenticated session
unset ANTHROPIC_API_KEY
echo "- Using Claude authenticated session (ANTHROPIC_API_KEY unset)"

echo "Starting Coding Agent MCP Server..."
echo "- Environment: $NODE_ENV"
echo "- Port: $PORT"
echo "- State Path: $STATE_PATH"
echo "- Projects Path: $PROJECTS_PATH"

# Configure Git to trust the workspace directory
if [ -d "/workspace/.git" ]; then
    echo "Configuring Git safe directory..."
    # Use system config if we can't write to user config
    git config --system --add safe.directory /workspace 2>/dev/null || \
    git config --global --add safe.directory /workspace 2>/dev/null || \
    echo "Warning: Could not configure Git safe directory"
fi

# Execute the main command
exec "$@"