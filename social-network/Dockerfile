FROM node:20.18.1-alpine3.20 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci && \
    npm cache clean --force

COPY . .

RUN npm run build

FROM node:20.18.1-alpine3.20

RUN apk upgrade --no-cache && \
    apk add --no-cache \
    postgresql-client \
    dumb-init

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/schema.sql ./src/database/schema.sql

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => r.statusCode === 404 ? process.exit(0) : process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]