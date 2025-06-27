# E2E Test Suite for SystemPrompt Coding Agent

This is a comprehensive test suite for the SystemPrompt Coding Agent MCP Server that validates all MCP functionality.

## Prerequisites

1. **Docker**: The MCP server can be run in Docker
2. **Node.js**: Required for running tests

## Running Tests

### Step 1: Start the Server

Using Docker:
```bash
docker-compose up -d
```

Or locally:
```bash
npm run build
npm start
```

### Step 2: Configure Tests

Create `.env` in the e2e-test directory:
```env
MCP_BASE_URL=http://localhost:3000
```

### Step 3: Run Tests

```bash
cd e2e-test
npm install
npm test
```

## Test Structure

The test suite validates:

1. **Tool Execution**
   - Task creation
   - Status checking
   - Task cancellation
   - Output retrieval

2. **Agent Management**
   - Claude Code integration
   - Gemini CLI integration
   - Agent cleanup

3. **State Persistence**
   - Task state saving
   - State restoration

4. **Error Handling**
   - Invalid inputs
   - Agent failures
   - Timeout scenarios

## Writing New Tests

Example test structure:

```typescript
describe('Task Management', () => {
  it('should create a new task', async () => {
    const result = await client.callTool('orchestrator_create_task', {
      description: 'Test task',
      agent: 'claude-code',
      requirements: ['Write tests']
    });
    
    expect(result.taskId).toBeDefined();
  });
});
```

## Debugging Tests

Enable debug logging:
```bash
DEBUG=* npm test
```

## Test Coverage

Run tests with coverage:
```bash
npm run test:coverage
```