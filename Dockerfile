# Multi-stage production build for RevAI
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace definitions
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/dashboard/package.json ./apps/dashboard/

RUN npm ci

# Copy full source
COPY apps ./apps

# Build workspaces
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
RUN npm ci --omit=dev --workspace=apps/server

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/dashboard/dist ./apps/dashboard/dist

EXPOSE 5000

CMD ["node", "apps/server/dist/index.js"]
