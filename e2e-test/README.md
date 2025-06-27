# E2E Test Suite for Reddit MCP Server

This is a comprehensive test suite for the Reddit MCP Server that validates all MCP functionality.

## Prerequisites

1. **Docker**: The MCP server must be running in Docker
2. **Valid MCP JWT Token**: You must have a valid MCP JWT token obtained through the OAuth flow

## Understanding the Authentication Flow

The Reddit MCP Server uses a two-layer authentication system:

1. **Reddit OAuth**: Users authenticate with Reddit to get Reddit access/refresh tokens
2. **MCP JWT**: The MCP server wraps Reddit tokens inside its own JWT tokens

### Token Types Explained

- **Reddit Client ID/Secret**: Your app's credentials from Reddit (configured in server's .env)
- **Reddit Access/Refresh Tokens**: User's Reddit OAuth tokens (obtained via OAuth flow)
- **MCP JWT Token**: Server-issued JWT containing Reddit tokens (what tests need)

## Setting Up Authentication

### Step 1: Configure the Server

Create `.env` in the server root with your Reddit app credentials:
```env
REDDIT_CLIENT_ID=your_reddit_app_id
REDDIT_CLIENT_SECRET=your_reddit_app_secret
JWT_SECRET=your-secure-random-string
```

### Step 2: Start the Server

```bash
docker-compose up -d
```

### Step 3: Obtain MCP JWT Token

You need to go through the OAuth flow to get a valid MCP JWT token:

1. Make a request to the MCP endpoint without authentication
2. Follow the OAuth flow URL from the WWW-Authenticate header
3. Authorize with Reddit
4. Exchange the authorization code for an MCP JWT token

### Step 4: Configure Tests

Create `e2e-test/.env` with your MCP JWT token:
```env
MCP_ACCESS_TOKEN=your-mcp-jwt-token-here
```

## Running Tests

```bash
cd e2e-test
npm install
npm test
```

### Individual Test Suites

- `npm run test:tools` - Test MCP tools
- `npm run test:prompts` - Test MCP prompts
- `npm run test:resources` - Test MCP resources
- `npm run test:sampling` - Test sampling capability
- `npm run test:concurrent` - Test concurrent operations

## Test Structure

```
e2e-test/
├── typescript/          # TypeScript tests using official MCP SDK
│   ├── test-tools.ts
│   ├── test-prompts.ts
│   ├── test-resources.ts
│   ├── test-sampling.ts
│   ├── test-concurrent.ts
│   └── test-utils.ts    # Shared test utilities
├── bash-scripts/        # Bash script tests
│   └── run-all.sh
├── scripts/
│   └── check-env.js    # Pre-test environment validation
└── .env                 # Your MCP JWT token (not committed)
```

## Important Notes

1. **Token Expiry**: MCP JWT tokens expire after 24 hours
2. **No Hardcoded Tokens**: Never commit tokens to version control
3. **OAuth Required**: The entire server requires valid Reddit OAuth authentication
4. **Docker Required**: Tests must run against the Docker container

## Troubleshooting

### "MCP_ACCESS_TOKEN is not set"
You need to obtain a valid MCP JWT token through the OAuth flow.

### "Invalid or expired access token"
Your MCP JWT token has expired. Get a new one through the OAuth flow.

### "Connection timeout"
Ensure the Docker container is running and healthy:
```bash
docker ps
docker logs systemprompt-mcp-reddit-mcp-server-full-1
```