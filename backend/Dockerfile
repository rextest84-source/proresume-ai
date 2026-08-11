FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3001

# Railway sets PORT automatically
CMD ["node", "src/index.js"]
