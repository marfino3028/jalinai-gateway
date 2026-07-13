# ── build ──
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── runtime ──
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Data persisten (keys/usage/orders) — mount volume ke sini di produksi.
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data
EXPOSE 8080
CMD ["node", "dist/server.js"]
