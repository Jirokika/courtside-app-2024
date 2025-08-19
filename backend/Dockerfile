# Clean Railway Backend Build v2.0
FROM node:20-alpine

# Set timezone to Cambodia (UTC+7)
ENV TZ=Asia/Phnom_Penh
ENV NODE_ENV=production

# Install timezone data and set timezone
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Phnom_Penh /etc/localtime && \
    echo "Asia/Phnom_Penh" > /etc/timezone

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install dependencies
RUN npm ci --only=production=false && \
    npm cache clean --force

# Copy source code and config
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build && \
    rm -rf src && \
    rm tsconfig.json

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: process.env.PORT || 8080, path: '/health', timeout: 5000 }; \
    const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["npm", "start"]