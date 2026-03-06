FROM oven/bun:1.3.4

WORKDIR /app

# Copy package files first for layer caching
COPY package.json bun.lock tsconfig.json ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source
COPY src/ src/

# Create data directory for persistent volume (Railway mounts here)
RUN mkdir -p /app/data && chown bun:bun /app/data

# Copy entrypoint script (runs as root to fix volume perms, then drops to bun)
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 3000

# Health check using Bun (no curl dependency)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1))" || exit 1

# Start via entrypoint (fixes volume permissions at runtime, then runs as bun user)
ENTRYPOINT ["/app/entrypoint.sh"]
