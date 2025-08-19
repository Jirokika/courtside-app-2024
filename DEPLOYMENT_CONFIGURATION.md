# 🚀 Courtside App Deployment Configuration Guide

## 📋 **Overview**

This guide covers the standardized deployment configuration for all Courtside services:
- **Backend API** - Main application backend
- **Admin-BFF** - Admin backend for frontend
- **Admin-Frontend** - Admin dashboard frontend

## 🐳 **Docker Configuration**

### **Backend Service**
- **File**: `backend/Dockerfile.new`
- **Base Image**: `node:22-alpine`
- **Features**:
  - Timezone set to Cambodia (UTC+7)
  - Multi-stage build for optimization
  - Non-root user for security
  - Health check endpoint
  - Production-only dependencies

### **Admin-BFF Service**
- **File**: `admin-bff/Dockerfile.new`
- **Base Image**: `node:18-alpine`
- **Features**:
  - Same optimizations as backend
  - Custom build process
  - Health check integration

### **Admin-Frontend Service**
- **File**: Uses NIXPACKS builder
- **Features**:
  - Static file serving with `serve` package
  - Production build optimization
  - Environment-based configuration

## 🚂 **Railway Configuration**

### **Backend Service**
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **Admin-BFF Service**
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "npm start",
    "buildCommand": "npm run build",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **Admin-Frontend Service**
```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "buildCommand": "npm run build",
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🔧 **Environment Variables**

### **Required Variables for All Services**

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Service port | `8080` |
| `NODE_ENV` | Environment | `production` |
| `TZ` | Timezone | `Asia/Phnom_Penh` |

### **Backend Service Variables**

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `JWT_SECRET` | JWT signing secret | ✅ | - |
| `CORS_ORIGIN` | Allowed CORS origins | ✅ | - |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit per window | ❌ | `50000` |
| `LOG_LEVEL` | Logging level | ❌ | `info` |

### **Admin-BFF Service Variables**

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `JWT_SECRET` | JWT signing secret | ✅ | - |
| `CORS_ORIGIN` | Allowed CORS origins | ✅ | - |
| `ADMIN_API_KEY` | Admin API key | ✅ | - |

### **Admin-Frontend Service Variables**

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | ✅ | - |
| `VITE_ADMIN_API_URL` | Admin-BFF API URL | ✅ | - |
| `VITE_APP_NAME` | Application name | ❌ | `Courtside Admin` |
| `VITE_APP_VERSION` | Application version | ❌ | `2.0.0` |

## 📁 **File Structure**

```
Courtside-web-app-2.0/
├── backend/
│   ├── Dockerfile.new          # Optimized Dockerfile
│   ├── railway.json            # Railway configuration
│   ├── env.example             # Environment variables template
│   └── src/                    # Source code
├── admin-bff/
│   ├── Dockerfile.new          # Optimized Dockerfile
│   ├── railway.json            # Railway configuration
│   ├── env.example             # Environment variables template
│   └── src/                    # Source code
├── admin-frontend/
│   ├── railway.json            # Railway configuration
│   ├── env.example             # Environment variables template
│   └── src/                    # Source code
└── DEPLOYMENT_CONFIGURATION.md # This file
```

## 🚀 **Deployment Steps**

### **1. Prepare Dockerfiles**
```bash
# Backend
cd backend
cp Dockerfile.new Dockerfile

# Admin-BFF
cd ../admin-bff
cp Dockerfile.new Dockerfile
```

### **2. Set Environment Variables**
- Copy `env.example` to `.env` in each service directory
- Fill in actual values for your environment
- Set Railway environment variables in the Railway dashboard

### **3. Deploy to Railway**
```bash
# Deploy backend
railway up --service backend

# Deploy admin-bff
railway up --service admin-bff

# Deploy admin-frontend
railway up --service admin-frontend
```

### **4. Verify Deployment**
```bash
# Check backend health
curl https://your-backend-domain.com/health

# Check admin-bff health
curl https://your-admin-bff-domain.com/health

# Check admin-frontend
curl https://your-admin-frontend-domain.com/
```

## 🔍 **Health Checks**

All services include health check endpoints:

- **Backend**: `/health`
- **Admin-BFF**: `/health` (if implemented)
- **Admin-Frontend**: Root path `/`

## 🛡️ **Security Features**

- **Non-root users** in Docker containers
- **JWT authentication** for API endpoints
- **CORS protection** for cross-origin requests
- **Rate limiting** to prevent abuse
- **Environment variable** configuration (no hardcoded secrets)

## 📊 **Monitoring & Logging**

- **Health checks** every 30 seconds
- **Structured logging** with configurable levels
- **Error tracking** and reporting
- **Performance metrics** collection

## 🔄 **Update Process**

1. **Code Changes**: Commit and push to GitHub
2. **Automatic Build**: Railway detects changes and rebuilds
3. **Health Check**: Service health is verified
4. **Rollback**: Automatic rollback on health check failure

## ❗ **Troubleshooting**

### **Common Issues**

1. **Build Failures**
   - Check Dockerfile syntax
   - Verify all required files are present
   - Check environment variables

2. **Runtime Errors**
   - Check service logs in Railway dashboard
   - Verify database connectivity
   - Check environment variable values

3. **Health Check Failures**
   - Verify service is running
   - Check port configuration
   - Review application logs

### **Support**

For deployment issues:
1. Check Railway service logs
2. Verify environment variables
3. Test locally with Docker
4. Review this configuration guide

---

**Last Updated**: Phase 4 Completion
**Version**: 2.0.0
**Status**: Ready for Production Deployment
