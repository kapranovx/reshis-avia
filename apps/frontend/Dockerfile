# Собирается из корня репозитория: docker build -f apps/frontend/Dockerfile .

FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace apps/frontend --workspace packages/shared --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/ ./
COPY package.json package-lock.json turbo.json ./
COPY packages/shared packages/shared
COPY apps/frontend apps/frontend

# Вшивается в клиентский бандл при сборке, поэтому здесь публичный адрес.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG API_URL_INTERNAL
ENV API_URL_INTERNAL=$API_URL_INTERNAL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --prefix packages/shared run build \
  && npm --prefix apps/frontend run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3500

# standalone не копирует static и public, переносим их отдельно.
COPY --from=build --chown=node:node /repo/apps/frontend/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=node:node /repo/apps/frontend/public ./apps/frontend/public

USER node
EXPOSE 3500
CMD ["node", "apps/frontend/server.js"]
