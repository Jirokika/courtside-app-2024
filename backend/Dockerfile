# FORCE CACHE BUST v1.1.2 - 2025-08-05 18:00 - RAILWAY RUNTIME FIX
FROM node:22-alpine

# Set timezone to Cambodia (UTC+7)
ENV TZ=Asia/Phnom_Penh
ENV FORCE_REBUILD=true
ENV DEPLOYMENT_TIMESTAMP=2025-08-05-18-00
ENV RAILWAY_RUNTIME_FIX=v1.1.2
ENV FORCE_COMPLETE_REBUILD=true
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Phnom_Penh /etc/localtime && \
    echo "Asia/Phnom_Penh" > /etc/timezone

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./

# Install dependencies with clean slate - Force complete rebuild
RUN npm cache clean --force && \
    rm -rf node_modules && \
    rm -rf dist && \
    npm install && \
    echo "✅ Dependencies installed (clean rebuild)"

# Verify no Prisma contamination
RUN echo "🔍 Checking for Prisma files..." && \
    PRISMA_FILES=$(find . -name '*prisma*' -type f 2>/dev/null || true) && \
    if [ -n "$PRISMA_FILES" ]; then \
        echo "❌ PRISMA FOUND - BUILD FAILED"; \
        echo "$PRISMA_FILES"; \
        exit 1; \
    else \
        echo "✅ No Prisma files found"; \
    fi && \
    echo "🔍 Checking for @prisma package..." && \
    if [ -d "node_modules/@prisma" ]; then \
        echo "❌ @PRISMA PACKAGE FOUND - BUILD FAILED"; \
        ls -la node_modules/@prisma/; \
        exit 1; \
    else \
        echo "✅ No @prisma package found - proceeding with build"; \
    fi

# Copy source code
COPY src ./src
COPY tsconfig.json ./
COPY railway.json ./

# Build the application
RUN npm run build

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Start the application
CMD ["npm", "start"] 