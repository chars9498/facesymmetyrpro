# Use Node.js 20 image
FROM node:20-slim

# Install tsx globally
RUN npm install -g tsx

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["tsx", "server.ts"]
