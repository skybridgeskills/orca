#!/bin/sh
set -e

# Apply pending Prisma migrations against DATABASE_URL_DIRECT.
# Idempotent: first start creates the baseline; subsequent starts
# are no-ops unless a new migration is bundled in the image.
pnpm exec prisma migrate deploy --schema src/prisma/schema.prisma

# Hand off to the SvelteKit adapter-node server.
exec node build/index.js
