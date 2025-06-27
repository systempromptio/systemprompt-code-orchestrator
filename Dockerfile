FROM node:18-alpine

# Install necessary packages
# Note: coreutils is needed for full 'env' command support (npx uses env -S)
RUN apk add --no-cache tini git bash curl coreutils

# Install global Node.js tools
RUN npm install -g @google/gemini-cli @anthropic-ai/claude-code

# Create app user and group (use node user if conflicts)
RUN addgroup -S appgroup || true && \
    adduser -S appuser -G appgroup || true

# Create necessary directories with proper permissions
RUN mkdir -p /app /data/state /data/projects && \
    chown -R appuser:appgroup /app /data

WORKDIR /app

# Copy package files as root
COPY package*.json ./

# Install dependencies as root (for native modules)
RUN npm ci --ignore-scripts || npm install --ignore-scripts

# Copy application files
COPY . .

# Copy and set permissions for entrypoint
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Build the application
RUN npm run build

# Change ownership of app files
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
ARG PORT=3000
EXPOSE ${PORT}

# Use tini and our entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]

# Run the application
CMD ["node", "build/index.js"]