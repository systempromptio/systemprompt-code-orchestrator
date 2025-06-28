#!/bin/bash
# Script to execute Claude Code on the host system
# This is called from within Docker to run Claude with host authentication

# Get the command from the first argument
COMMAND="$1"

# Execute claude with the print flag to get output and exit
exec claude -p "$COMMAND"