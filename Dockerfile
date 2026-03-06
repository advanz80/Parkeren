# Stage 1: Build React frontend
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

# better-sqlite3 needs build tools for native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install server dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Cleanup build tools to reduce image size
RUN apk del python3 make g++

# Copy server source
COPY server/ ./server/

# Copy built React app from stage 1
COPY --from=client-build /app/client/build ./client/build

# Create directory for SQLite database
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server/index.js"]
