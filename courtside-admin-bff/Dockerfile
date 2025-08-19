# Courtside Admin Frontend - Production Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json only (not package-lock.json to avoid platform conflicts)
COPY package.json .npmrc ./

# Install dependencies fresh for the target platform
RUN npm install --production=false

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
