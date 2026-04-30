FROM node:alpine

ARG PNPM_VERSION=10.10.0

WORKDIR /workspace

RUN npm install --global "pnpm@${PNPM_VERSION}" \
  && npm cache clean --force

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .
