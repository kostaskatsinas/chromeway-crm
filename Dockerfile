# ── Chromeway CRM — production image ─────────────────────
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
# Dummy DATABASE_URL & AUTH_SECRET for build-time prisma generate only
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-only-secret-not-used-at-runtime"
RUN npm run build

# ── Runtime ──
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV UPLOAD_DIR=/app/uploads

RUN addgroup -S chromeway && adduser -S chromeway -G chromeway
COPY --chown=chromeway:chromeway --from=builder /app/package.json ./package.json
COPY --chown=chromeway:chromeway --from=deps /app/node_modules ./node_modules
COPY --chown=chromeway:chromeway --from=builder /app/.next ./.next
COPY --chown=chromeway:chromeway --from=builder /app/prisma ./prisma
COPY --chown=chromeway:chromeway --from=builder /app/public ./public
RUN mkdir -p /app/uploads && chown chromeway:chromeway /app/uploads

USER chromeway
EXPOSE 3000

# Apply migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
