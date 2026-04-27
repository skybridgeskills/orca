FROM node:20-alpine

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

WORKDIR /app

# Pre-create the dev-uploads directory so the named volume mount in
# docker-compose has a target with appropriate ownership before the
# entrypoint runs (see PoC Phase 3 for the volume wiring).
RUN mkdir -p /app/dev-uploads

# Activate the pnpm version pinned in package.json's `packageManager` field
# via Corepack. `--activate` makes the shim available on PATH.
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate

# Install dependencies first to maximise Docker layer cache reuse on
# source-only changes. `pnpm install --frozen-lockfile` requires the
# lockfile and manifest to match exactly.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Bring in the rest of the application source.
COPY . .

# Build-time `$env/static/private` placeholders for names still imported
# from that module (see src). Email (MAILGUN_*, SMTP_*) and similar
# server config is read via `$env/dynamic/private` at runtime from
# `process.env` — do not duplicate here. Runtime values come from
# compose `env_file:` or the host environment.
ENV PUBLIC_HTTP_PROTOCOL=http \
    PUBLIC_MEDIA_DOMAIN=/media \
    USE_SECURE_COOKIES=false \
    DEFAULT_ORG_ENABLED=false \
    DEFAULT_ORG_DOMAIN=localhost \
    AWS_ACCESS_KEY_ID=test \
    AWS_SECRET_ACCESS_KEY=secret \
    S3_REGION=us-west-1 \
    S3_BUCKET_NAME=orca-media \
    S3_USE_LOCALSTACK=false \
    S3_URL=http://127.0.0.1:4566

# `pnpm run build` is `pnpm generate && vite build`, so this also produces
# the Prisma client at build time.
RUN pnpm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/healthz || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
