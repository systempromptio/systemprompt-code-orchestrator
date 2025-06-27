# Host Command Execution from Docker

By default, Docker containers are isolated and cannot execute commands on the host machine. This is by design for security. Here are options to enable host execution:

## Option 1: Docker Socket Mounting (Most Common)

Mount the Docker socket to allow the container to control Docker on the host:

```yaml
# docker-compose.yml
services:
  mcp-server:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

This allows the container to:
- Run other Docker containers
- Execute commands via `docker exec` on the host
- Limited to Docker commands only

## Option 2: SSH Access

Install SSH client in container and SSH back to host:

```dockerfile
# Dockerfile addition
RUN apt-get update && apt-get install -y openssh-client
```

```yaml
# docker-compose.yml
services:
  mcp-server:
    volumes:
      - ~/.ssh:/root/.ssh:ro  # Mount SSH keys
    extra_hosts:
      - "host.docker.internal:host-gateway"  # Access host
```

## Option 3: Privileged Container (NOT Recommended)

Run container with full privileges:

```yaml
# docker-compose.yml
services:
  mcp-server:
    privileged: true
    pid: host
    volumes:
      - /:/host  # Mount entire host filesystem
```

⚠️ **SECURITY WARNING**: This gives the container root access to the host system!

## Option 4: Named Pipes / Unix Sockets

Create a command execution service on the host:

```bash
# On host: Create a named pipe
mkfifo /tmp/host-executor

# On host: Listen for commands
while true; do
  cmd=$(cat /tmp/host-executor)
  eval "$cmd"
done
```

```yaml
# docker-compose.yml
services:
  mcp-server:
    volumes:
      - /tmp/host-executor:/tmp/host-executor
```

## Option 5: Remote Execution Service

Run a separate service on the host that accepts commands:

```python
# host-executor.py (runs on host)
from flask import Flask, request
import subprocess

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute():
    cmd = request.json['command']
    result = subprocess.run(cmd, shell=True, capture_output=True)
    return {'output': result.stdout.decode(), 'error': result.stderr.decode()}

app.run(host='0.0.0.0', port=5000)
```

## Recommended Approach for MCP Server

For an MCP server that needs to execute commands, consider:

1. **Define specific commands needed** - Don't allow arbitrary execution
2. **Use Docker socket** for Docker-related commands
3. **Mount specific directories** for file operations
4. **Use SSH** for controlled remote execution
5. **Create an API** for predefined operations

## Security Considerations

- **Principle of Least Privilege**: Only grant necessary permissions
- **Audit Commands**: Log all executed commands
- **Validate Input**: Never execute unsanitized user input
- **Use Allow Lists**: Define allowed commands explicitly
- **Network Isolation**: Use Docker networks to limit access

## Example: Safe Command Execution

```javascript
// Whitelist approach in your MCP server
const ALLOWED_COMMANDS = {
  'list-files': 'ls -la',
  'check-disk': 'df -h',
  'system-info': 'uname -a'
};

function executeCommand(commandKey) {
  if (!ALLOWED_COMMANDS[commandKey]) {
    throw new Error('Command not allowed');
  }
  // Execute via your chosen method
}
```

## For Development vs Production

**Development**: More permissive options acceptable
**Production**: Strict isolation with specific integrations only

Choose the approach that matches your security requirements and use case.