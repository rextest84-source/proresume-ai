# Build context: repository root (Railway root directory = .)
FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY backend/src ./src

ENV NODE_ENV=production
EXPOSE 3003

CMD ["node", "src/cron.js"]
