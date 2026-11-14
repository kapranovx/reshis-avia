# Собирается из корня репозитория: docker build -f apps/backend/Dockerfile .

FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
# devDependencies нужны: сервис migrate запускает prisma CLI из этого образа.
RUN npm ci --workspace apps/backend --workspace packages/shared --include-workspace-root

FROM node:22-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/ ./
COPY package.json turbo.json ./
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN npm --prefix packages/shared run build \
  && npm --prefix apps/backend run prisma:generate \
  && npm --prefix apps/backend run build

FROM node:22-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./
COPY --from=build /repo/packages/shared/package.json ./packages/shared/
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/apps/backend/package.json ./apps/backend/
COPY --from=build /repo/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
COPY data ./data

# Чтение для всех (при клоне с umask 077 файлы будут 600). Владелец остаётся root.
RUN chmod -R a+rX package.json packages/shared apps/backend data

USER node
WORKDIR /repo/apps/backend
EXPOSE 3501
CMD ["node", "dist/main"]
