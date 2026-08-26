# ── Chromeway CRM — unified production/demo image ────────────
# Works unchanged in three places:
#   • VPS via docker-compose.prod.yml        (PORT=3000, no autoseed)
#   • Hugging Face Spaces free tier          (app_port: 3000, DEMO_AUTOSEED=true)
#   • Any Docker host
#
# Runtime behaviour is driven by env vars (see .env.demo.example):
#   PORT            listen port            (default 3000)
#   HOSTNAME        bind address           (default 0.0.0.0)
#   DEMO_AUTOSEED   "true" → seed Greek demo data ONLY if the
#                   database has zero users (never wipes data)

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# ── Build ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy values used only at build time by `prisma generate`
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

# ── Runtime ──
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV UPLOAD_DIR=/app/uploads
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The image's built-in `node` user already has UID 1000,
# which is what Hugging Face Spaces expects.
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN mkdir -p /app/uploads \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && chown -R node:node /app

USER node
EXPOSE 3000
ENTRYPOINT ["entrypoint.sh"]
