# ── Stage 1: Install dependencies ─────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: Production runner ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Switch to non-root user
USER appuser

# Port configuration — Railway injects $PORT at runtime
ENV PORT=5000
EXPOSE 5000

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Graceful shutdown — Node.js receives SIGTERM from Docker
STOPSIGNAL SIGTERM

CMD ["node", "server.js"]
