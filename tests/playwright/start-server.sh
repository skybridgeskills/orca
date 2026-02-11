#!/bin/bash
set -e

# Load .env.test
export $(cat .env.test | grep -v '^#' | xargs)

# Run Prisma migrate deploy
pnpm exec prisma migrate deploy --schema src/prisma/schema.prisma

# Export SERVER_PORT so vite.config.js can use it
export SERVER_PORT=${SERVER_PORT:-5173}
export PORT=$SERVER_PORT

# Start vite dev server
exec pnpm exec vite dev --host 0.0.0.0 --port ${SERVER_PORT}
