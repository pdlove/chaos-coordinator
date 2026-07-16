# syntax=docker/dockerfile:1
# Build context is `web/` (the workspace root), not this directory — see docker-compose.yml,
# which sets `context: ./web` and `dockerfile: packages/app/Dockerfile`. Needed because npm
# workspaces requires the whole workspace tree (shared + core + app) to install and build.

FROM node:22-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/app/package.json packages/app/package.json
RUN npm install

COPY . .
RUN npm run build --workspace=@chaos-coordinator/app

FROM nginx:1.27-alpine AS runtime
COPY packages/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/packages/app/dist /usr/share/nginx/html

EXPOSE 80
