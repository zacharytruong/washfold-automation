#!/bin/sh
# Fix volume permissions at runtime (Railway mounts override build-time chown)
if [ -d "/app/data" ]; then
  chown -R bun:bun /app/data
fi
exec su -s /bin/sh bun -c "bun run src/index.ts"
