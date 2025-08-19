#!/bin/bash

# Courtside Railway Deployment Setup Script
# This script helps you set up your Railway deployment

echo "🚀 Courtside Railway Deployment Setup"
echo "====================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway..."
    railway login
fi

echo ""
echo "📋 Prerequisites Check:"
echo "======================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: Backend directory not found"
    exit 1
fi

echo "✅ Project structure looks good"

echo ""
echo "🔧 Environment Setup:"
echo "==================="

# Create .env.example files
echo "📝 Creating environment variable templates..."

# Frontend .env.example
cat > .env.example << EOF
# Frontend Environment Variables
NODE_ENV=production
VITE_API_URL=https://courtside-backend-production.up.railway.app
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
EOF

# Backend .env.example
cat > backend/.env.example << EOF
# Backend Environment Variables
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-this
DATABASE_URL=postgresql://postgres:password@localhost:5432/courtside
CORS_ORIGIN=https://courtside-frontend-production.up.railway.app
EOF

echo "✅ Environment templates created"

echo ""
echo "🚀 Railway Deployment Steps:"
echo "==========================="
echo ""
echo "1. 📊 Create Railway Project:"
echo "   - Go to https://railway.app"
echo "   - Click 'New Project'"
echo "   - Select 'Deploy from GitHub repo'"
echo "   - Choose your Courtside repository"
echo ""
echo "2. 🗄️ Add Database Service:"
echo "   - In your Railway project, click 'New Service'"
echo "   - Select 'Database' → 'PostgreSQL'"
echo "   - Name it: courtside-database"
echo ""
echo "3. 🔧 Add Backend Service:"
echo "   - Click 'New Service' → 'GitHub Repo'"
echo "   - Select your repository"
echo "   - Set source directory to: backend"
echo "   - Add environment variables from backend/.env.example"
echo ""
echo "4. 🌐 Add Frontend Service:"
echo "   - Click 'New Service' → 'GitHub Repo'"
echo "   - Select your repository again"
echo "   - Set source directory to: / (root)"
echo "   - Add environment variables from .env.example"
echo "   - Set build command: npm run build"
echo "   - Set output directory: dist"
echo ""
echo "5. 🔗 Configure Domains:"
echo "   - Go to each service's Settings → Domains"
echo "   - Add custom domains (optional)"
echo ""
echo "6. 🗄️ Setup Database:"
echo "   - Run: railway connect"
echo "   - Run: npx prisma migrate deploy"
echo "   - Run: npx prisma generate"
echo ""
echo "7. 📱 Configure Telegram:"
echo "   - Message @BotFather"
echo "   - Send /myapps"
echo "   - Set web app URL to your frontend Railway URL"
echo ""

echo "🔍 Testing Commands:"
echo "==================="
echo ""
echo "# Test backend health"
echo "curl https://courtside-backend-production.up.railway.app/health"
echo ""
echo "# Test frontend"
echo "curl https://courtside-frontend-production.up.railway.app/"
echo ""
echo "# View logs"
echo "railway logs --service courtside-backend"
echo "railway logs --service courtside-frontend"
echo ""

echo "📊 Monitoring URLs:"
echo "=================="
echo ""
echo "Frontend: https://courtside-frontend-production.up.railway.app"
echo "Backend:  https://courtside-backend-production.up.railway.app"
echo "Health:   https://courtside-backend-production.up.railway.app/health"
echo ""

echo "🎉 Setup complete! Follow the steps above to deploy your app."
echo ""
echo "💡 Tips:"
echo "- Use Railway's free tier for MVP (3 services, 500 hours/month)"
echo "- Set up monitoring with Sentry and Google Analytics"
echo "- Test the complete booking flow after deployment"
echo "- Configure backups for your database"
echo "" 