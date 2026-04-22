FROM node:22-alpine

WORKDIR /app

# Pre-create the dev-uploads directory so the named volume mount in
# docker-compose has a target with appropriate ownership before the
# entrypoint runs (see PoC Phase 3 for the volume wiring).
RUN mkdir -p /app/dev-uploads

COPY . .

# postinstall in package.json runs `prisma generate` here.
RUN npm ci

# Build-time `$env/static/*` (no `.env` in context); matches `.env.example` / PoC defaults.
ENV PUBLIC_HTTP_PROTOCOL=http \
    PUBLIC_MEDIA_DOMAIN=/media \
    USE_SECURE_COOKIES=false \
    DEFAULT_ORG_ENABLED=false \
    DEFAULT_ORG_DOMAIN=localhost \
    MAILGUN_API_KEY=none \
    MAILGUN_DOMAIN=local \
    MAILGUN_HOST=api.mailgun.net \
    AWS_ACCESS_KEY_ID=test \
    AWS_SECRET_ACCESS_KEY=secret \
    S3_REGION=us-west-1 \
    S3_BUCKET_NAME=orca-media \
    S3_USE_LOCALSTACK=false \
    S3_URL=http://127.0.0.1:4566

RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/healthz || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
