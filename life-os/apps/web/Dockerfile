# ==============================================================================
# LifeOS Web React/Vite Production Multi-Stage Dockerfile (LOS-1603)
# ==============================================================================
# Base Image: Pinned Node 22 Alpine & Nginx 1.27 Alpine
# Non-Root User: lifeos-app (UID 10001, GID 10001)
# Security Profile: Read-only root filesystem compatible, tmpfs /tmp, drop capabilities
# Healthcheck: /healthz on port 8080
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Stage
# ------------------------------------------------------------------------------
FROM node:22.14.0-alpine AS builder

WORKDIR /build

# Copy lockfile and package declaration first for npm caching
COPY package.json package-lock.json ./

# Clean installation using npm lockfile v3
RUN npm ci

# Copy source code and build configs
COPY . .

# Bake the public base paths the app validates at build time.
# Vite's loadEnv() picks up these prefixed process.env vars (src/app/environment.ts),
# and .env.local is gitignored so it is absent on the VPS build.
ENV VITE_APP_BASE_PATH=/life-os/
ENV VITE_API_BASE_PATH=/life-os/api/v1
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Stage
# ------------------------------------------------------------------------------
FROM nginx:1.27.4-alpine AS runner

# Install wget for healthcheck
RUN apk add --no-cache wget tzdata

# Create dedicated non-root user and group matching API UID/GID (10001)
RUN addgroup -g 10001 -S lifeos-app && \
    adduser -u 10001 -S lifeos-app -G lifeos-app

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Prepare HTML directory structure and copy static assets under /usr/share/nginx/html/life-os
RUN mkdir -p /usr/share/nginx/html/life-os /tmp/nginx /var/cache/nginx /var/run
COPY --from=builder /build/dist /usr/share/nginx/html/life-os

# Set file permissions for non-root execution
RUN chown -R lifeos-app:lifeos-app /usr/share/nginx/html /tmp /var/cache/nginx /var/run /etc/nginx

# Switch to non-root user
USER 10001

# Expose non-privileged HTTP port
EXPOSE 8080

# Container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
