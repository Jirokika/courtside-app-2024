# Courtside Railway Deployment Guide

## 🚀 Complete Railway Setup (Frontend + Backend + Database)

This guide will help you deploy your entire Courtside app stack on Railway with frontend, backend, and PostgreSQL database.

## 📋 Prerequisites

- [x] Railway account (free tier available)
- [x] GitHub repository with your code
- [x] Telegram Bot Token (from @BotFather)
- [x] Node.js 18+ (for local testing)

## 🏗️ Railway Project Structure

```
Courtside Railway Project
├── Frontend Service (React App) - Courtside-Bot-frontend
├── Backend Service (Express.js API) - practical-commitment
└── Database Service (PostgreSQL) - Courtside-database
```

## 🚀 Step-by-Step Deployment

### Step 1: Create Railway Project ✅ COMPLETED

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your Courtside repository
   - **Project Name**: `celebrated-embrace`

### Step 2: Set Up Database Service ✅ COMPLETED

1. **Add PostgreSQL Database**
   - In your Railway project, click "New Service"
   - Select "Database" → "PostgreSQL"
   - Name it: `Courtside-database`

2. **Configure Database**
   - Railway will automatically generate connection details
   - **DATABASE_URL**: `postgresql://postgres:YwlejFtnuWbLOxYVVcgxFgvcTJhzwOvs@postgres.railway.internal:5432/railway`

### Step 3: Deploy Backend Service ✅ COMPLETED

1. **Add Backend Service**
   - Click "New Service" → "Empty Service"
   - Name it: `practical-commitment`

2. **Configure Backend Environment Variables** ✅ COMPLETED
   ```env
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-change-this
   DATABASE_URL=postgresql://postgres:YwlejFtnuWbLOxYVVcgxFgvcTJhzwOvs@postgres.railway.internal:5432/railway
   CORS_ORIGIN=https://courtside-bot-frontend-production.up.railway.app
   ```

3. **Deploy Backend** ✅ COMPLETED
   - Deploy from `backend` directory: `cd backend && railway up`
   - Railway auto-detected it's a Node.js app
   - Running `npm install`, `npm run build`, and `npm start`
   - **Backend URL**: `https://practical-commitment-production.up.railway.app`

### Step 4: Deploy Frontend Service ✅ COMPLETED

1. **Add Frontend Service**
   - Click "New Service" → "GitHub Repo"
   - Select your repository: `Jirokika/Courtside-Bot`
   - Set the source directory to: `/` (root)
   - **Service Name**: `Courtside-Bot-frontend`

2. **Configure Frontend Environment Variables** ✅ COMPLETED
   ```env
   NODE_ENV=production
   VITE_API_URL=https://practical-commitment-production.up.railway.app
   VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

3. **Deploy Frontend** ✅ COMPLETED
   - Railway builds and deploys your React app
   - **Frontend URL**: `https://courtside-bot-frontend-production.up.railway.app`

### Step 5: Configure Domains ⏳ PENDING

1. **Backend Domain**
   - Go to your backend service
   - Click "Settings" → "Domains"
   - Add custom domain: `api.courtside.com` (optional)

2. **Frontend Domain**
   - Go to your frontend service
   - Click "Settings" → "Domains"
   - Add custom domain: `courtside.com` (optional)

## 🔧 Environment Variables Setup

### Backend Service Variables ✅ COMPLETED
```env
# Database
DATABASE_URL=postgresql://postgres:YwlejFtnuWbLOxYVVcgxFgvcTJhzwOvs@postgres.railway.internal:5432/railway

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=production

# CORS
CORS_ORIGIN=https://courtside-bot-frontend-production.up.railway.app
```

### Frontend Service Variables ✅ COMPLETED
```env
# API Configuration
VITE_API_URL=https://practical-commitment-production.up.railway.app

# Telegram
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here

# Environment
NODE_ENV=production
```

## 🗄️ Database Setup ⏳ PENDING

### Step 1: Run Database Migrations
```bash
# Connect to your Railway database
railway connect

# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Step 2: Seed Database (Optional)
```bash
# Run seed script
npx prisma db seed
```

## 🔍 Testing Your Deployment ✅ COMPLETED

### 1. Test Backend Health ✅ WORKING
```bash
curl https://practical-commitment-production.up.railway.app/health
# Response: {"status":"ok","timestamp":"2025-07-21T13:17:01.246Z","environment":"production"}
```

### 2. Test Backend API ✅ WORKING
```bash
curl https://practical-commitment-production.up.railway.app/api/test
# Response: {"message":"Courtside Backend API is running!","timestamp":"2025-07-21T13:16:50.118Z"}
```

### 3. Test Frontend ✅ WORKING
- Visit your frontend URL: `https://courtside-bot-frontend-production.up.railway.app`
- Frontend loads successfully (HTTP 200)

### 4. Test Database Connection ⏳ PENDING
```bash
# Check if backend can connect to database
curl https://practical-commitment-production.up.railway.app/api/auth/me
```

## 📱 Telegram Mini App Setup ⏳ PENDING

### 1. Update Bot Web App URL
1. Message @BotFather on Telegram
2. Send `/myapps`
3. Select your Courtside bot
4. Set the web app URL to your frontend Railway URL

### 2. Test Mini App
1. Open your bot in Telegram
2. Click the "Courtside Booking" button
3. Test the complete booking flow

## 🔄 Continuous Deployment

### Automatic Deployments
- Railway automatically deploys on every git push
- Each service deploys independently
- Zero-downtime deployments

### Manual Deployments
```bash
# Deploy specific service
railway up

# Deploy all services
railway up --all
```

## 📊 Monitoring & Logs

### View Logs
```bash
# Backend logs
railway logs --service practical-commitment

# Frontend logs
railway logs --service Courtside-Bot-frontend

# Database logs
railway logs --service Courtside-database
```

### Health Checks ✅ WORKING
- Backend: `https://practical-commitment-production.up.railway.app/health`
- Frontend: `https://courtside-bot-frontend-production.up.railway.app/`

## 💰 Railway Pricing

### Free Tier (Perfect for MVP)
- **3 services** (Frontend + Backend + Database) ✅
- **500 hours/month** of compute time
- **1GB** database storage
- **Custom domains** included

### Pro Tier ($5/month)
- **Unlimited services**
- **Unlimited compute time**
- **5GB** database storage
- **Priority support**

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database URL
railway variables --service Courtside-database

# Test connection
railway connect
```

#### 2. Frontend Can't Connect to Backend
```bash
# Check CORS settings
# Verify VITE_API_URL is correct
# Test backend health endpoint
```

#### 3. Build Failures
```bash
# Check build logs
railway logs --service Courtside-Bot-frontend

# Verify package.json scripts
# Check for TypeScript errors
```

### Debug Commands
```bash
# Connect to service
railway connect

# View variables
railway variables

# Check status
railway status

# Restart service
railway restart
```

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit secrets to git
- Use Railway's secure variable storage
- Rotate JWT secrets regularly

### 2. Database Security
- Use strong passwords
- Enable SSL connections
- Regular backups

### 3. API Security
- Implement rate limiting
- Add input validation
- Use HTTPS only

## 📈 Scaling Considerations

### When to Scale Up
- **100+ concurrent users**: Upgrade to Pro tier
- **1000+ bookings/day**: Consider dedicated database
- **10K+ users**: Add load balancing

### Performance Optimization
- Enable Railway's CDN
- Use database connection pooling
- Implement caching strategies

## 🎯 Success Checklist

### ✅ Deployment
- [x] Database service running
- [x] Backend API responding
- [x] Frontend loading correctly
- [x] All environment variables set
- [ ] Custom domains configured

### ✅ Functionality
- [ ] User authentication working
- [ ] Booking flow complete
- [ ] Payment processing functional
- [ ] Database migrations applied
- [ ] Telegram integration active

### ✅ Monitoring
- [x] Health checks passing
- [x] Logs accessible
- [ ] Error tracking enabled
- [ ] Performance monitoring active

## 🚀 Next Steps After Deployment

1. **Set up monitoring** (Sentry, Google Analytics)
2. **Configure backups** for database
3. **Set up alerts** for downtime
4. **Test complete user flow**
5. **Launch marketing campaign**

---

**Current Status**: 🟢 **Backend & Frontend Deployed Successfully!**

**Backend URL**: `https://practical-commitment-production.up.railway.app`
**Frontend URL**: `https://courtside-bot-frontend-production.up.railway.app`
**Database**: PostgreSQL on Railway

**Working Endpoints:**
- Health Check: `https://practical-commitment-production.up.railway.app/health` ✅
- API Test: `https://practical-commitment-production.up.railway.app/api/test` ✅
- Frontend: `https://courtside-bot-frontend-production.up.railway.app` ✅ 