# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy all source files
COPY . .

# Build the frontend (Vite)
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built frontend and server source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/package.json ./package.json

# Install tsx to run the server.ts directly (or we could compile it, but tsx is easier)
RUN npm install -g tsx

# Set environment to production
ENV NODE_ENV=production

# Cloud Run uses the PORT environment variable
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
