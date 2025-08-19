# Courtside Backend API

Express.js backend API for the Courtside Mini App with PostgreSQL database, JWT authentication, and credit-based payment system.

## 🚀 Features

- **Express.js** with TypeScript
- **PostgreSQL** database with native pg client
- **JWT Authentication** for secure user sessions
- **Telegram Integration** for user authentication
- **Credit-based Payment** system
- **URL Shortening** for shared bookings
- **Rate Limiting** and security middleware
- **Railway Deployment** ready

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- Telegram Bot token

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Variables
Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/courtside_db"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-here"

# Telegram Bot
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
PORT=3001
```

### 3. Database Setup
```bash
# Build the application
npm run build

# Start the server and run database migration
npm start
```

The database tables will be created automatically when you first access the `/api/migrate` endpoint.

### 4. Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🚀 Railway Deployment

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize Project
```bash
railway init
```

### 4. Set Environment Variables
In Railway dashboard, add all the environment variables from the `.env` file.

### 5. Deploy
```bash
railway up
```

## 📚 API Endpoints

### Health & Test
- `GET /health` - API health status
- `GET /api/test` - Test endpoint

### Database Migration
- `POST /api/migrate` - Create database tables and sample data

### Authentication
- `POST /api/auth/telegram` - Authenticate with Telegram
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Bookings
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get specific booking
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Users
- `GET /api/users/profile` - Get user profile
- `GET /api/users/credits` - Get user credits

### Payments
- `POST /api/payments/add-credits` - Add credits to user account
- `GET /api/payments/history` - Get payment history

### Short URLs
- `POST /api/short-urls` - Create short URL for booking
- `GET /api/short-urls/:shortCode` - Get booking data by short code
- `GET /api/short-urls` - Get user's short URLs
- `DELETE /api/short-urls/:shortCode` - Delete short URL

## 🔧 Database Schema

### Users
- Telegram integration
- Credits and points system
- Profile information

### Courts
- Court information and pricing
- Sport type and availability

### Time Slots
- Available time slots for courts
- Pricing and availability

### Bookings
- Sport, date, time, duration
- Court assignment
- Payment tracking
- Modification limits

### Payments
- Credit-based system
- Credit purchases
- Refund handling

### Short URLs
- Booking sharing
- 7-day expiration
- User association

## 🛡️ Security Features

- JWT token authentication
- Rate limiting (100 requests per 15 minutes)
- CORS configuration
- Helmet security headers
- Input validation with Zod
- SQL injection protection via parameterized queries

## 📊 Health Check

- `GET /health` - API health status

## 🧪 Testing

```bash
npm test
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Yes |
| `FRONTEND_URL` | Frontend application URL | No |
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No |

## 📦 Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 🚨 Error Handling

All endpoints include comprehensive error handling:
- Input validation errors
- Database errors
- Authentication errors
- Payment processing errors
- Rate limiting errors

## 📈 Monitoring

- Request logging with Morgan
- Error logging
- Performance monitoring
- Health check endpoint

## 🔐 Security Considerations

- JWT tokens expire after 7 days
- Rate limiting prevents abuse
- CORS configured for frontend only
- Input sanitization with Zod
- SQL injection protection via parameterized queries
- Secure headers with Helmet 