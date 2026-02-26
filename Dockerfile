FROM oven/bun:1.3.4

WORKDIR /app

# Copy package files first for layer caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source
COPY src/ src/

# Run as non-root user (included in oven/bun image)
USER bun

# Expose port
EXPOSE 3000

# Health check using Bun (no curl dependency)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1))" || exit 1

# Start server
CMD ["bun", "run", "src/index.ts"]
