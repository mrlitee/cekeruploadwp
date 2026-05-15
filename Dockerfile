FROM node:22-alpine

WORKDIR /app

# Install build deps (untuk dependency yang perlu compile, walau sekarang sudah pure-JS)
RUN apk add --no-cache python3 make g++ git

COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm install -g typescript ts-node-dev
RUN npx tsc -p . || true

# Persistent volumes for auth & db
VOLUME ["/app/data", "/app/auth"]

ENV NODE_ENV=production
ENV TZ=Asia/Jakarta

# Cloud platforms (Railway/Render/Fly) inject PORT
ENV WEBHOOK_PORT=3000
EXPOSE 3000

CMD ["npx", "ts-node-dev", "--transpile-only", "src/index.ts"]
