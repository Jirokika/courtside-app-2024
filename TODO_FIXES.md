# 🚀 COURTSIDE APP FIXES - PHASE-BY-PHASE TODO

## 📋 **PHASE 1: IMMEDIATE DEPLOYMENT FIXES** (Priority: CRITICAL) ✅ COMPLETE

### 1.1 Fix Admin-BFF Deployment
- [x] **Fix package.json start script**
  - Change from `"start": "vite preview --host --port ${PORT:-5175}"` 
  - To `"start": "node dist/index.js"`
  - **File**: `admin-bff/package.json`
  - **Status**: ✅ ALREADY CORRECT

### 1.2 Fix Frontend Deployment
- [x] **Remove root railway.toml** (conflicts with individual service configs)
  - **File**: `railway.toml` (root directory)
  - **Status**: ✅ REMOVED - NO MORE CONFLICTS

### 1.3 Verify All Services Can Deploy
- [x] **Test admin-bff deployment** - ✅ Configuration verified
- [x] **Test frontend deployment** - ✅ Fixed start script and added serve dependency
- [x] **Test backend deployment** - ✅ Configuration verified
- [x] **Status**: 🟡 READY FOR TESTING - All configurations fixed

---

## 🏗️ **PHASE 2: CODE ARCHITECTURE CLEANUP** (Priority: HIGH) ✅ COMPLETE

### 2.1 Fix Circular Dependencies
- [x] **Resolve api.ts ↔ auth.ts circular import**
  - **Files**: `src/utils/api.ts`, `src/utils/auth.ts`
  - **Status**: ✅ RESOLVED - Created authService.ts and apiHooks.ts to break circular dependency

### 2.2 Remove Hardcoded Values
- [x] **Centralize backend URLs**
  - **Files**: Multiple files using hardcoded URLs
  - **Status**: ✅ COMPLETED - Created config.ts and updated all components to use centralized configuration

### 2.3 Clean Up Workspace Files
- [x] **Remove duplicate .code-workspace files**
  - **Files**: 20+ workspace files in root directory
  - **Status**: ✅ SKIPPED - Keeping all workspace files as requested

---

## 🔧 **PHASE 3: BACKEND MONOLITH SPLIT** (Priority: HIGH) ✅ COMPLETE

### 3.1 Create Route Structure
- [x] **Create `src/routes/` directory**
- [x] **Split endpoints by domain**:
  - [x] `bookings.ts` - All booking-related endpoints
  - [x] `users.ts` - User management endpoints  
  - [x] `payments.ts` - Payment processing endpoints
  - [x] `points.ts` - Points and rewards endpoints
  - [x] `admin.ts` - Admin-only endpoints

### 3.2 Extract Middleware
- [x] **Create `src/middleware/` directory**
- [x] **Move to separate files**:
  - [x] `cors.ts` - CORS configuration
  - [x] `auth.ts` - Authentication middleware
  - [x] `rateLimit.ts` - Rate limiting
  - [x] `validation.ts` - Request validation

### 3.3 Extract Services
- [x] **Create `src/services/` directory**
- [x] **Move business logic**:
  - [x] `bookingService.ts` - Booking business logic (integrated into routes)
  - [x] `userService.ts` - User management logic (integrated into routes)
  - [x] `paymentService.ts` - Payment processing
  - [x] `pointsService.ts` - Points system logic

### 3.4 Refactor Main Index
- [x] **Reduce `index.ts` from 5,595 lines to ~100 lines**
- [x] **Keep only**:
  - Server setup
  - Middleware registration
  - Route registration
  - Error handling
  - Server start

---

## 🐳 **PHASE 4: DEPLOYMENT CONFIGURATION** (Priority: MEDIUM) ✅ COMPLETE

### 4.1 Standardize Dockerfiles
- [x] **Simplify backend Dockerfile**
  - Remove unnecessary Prisma checks
  - Optimize build process
  - **File**: `backend/Dockerfile.new` ✅

- [x] **Verify admin-bff Dockerfile**
  - Ensure proper build and start commands
  - **File**: `admin-bff/Dockerfile.new` ✅

### 4.2 Standardize Railway Configs
- [x] **Ensure each service has proper railway.json**
  - [x] `admin-bff/railway.json` ✅ Updated to use Dockerfile
  - [x] `admin-frontend/railway.json` ✅ Already properly configured
  - [x] `backend/railway.json` ✅ Updated to use Dockerfile

### 4.3 Environment Variables
- [x] **Centralize environment configuration**
  - [x] Create `env.example` files for all services
  - [x] Document required variables in DEPLOYMENT_CONFIGURATION.md
  - [x] Verify Railway environment setup configuration

---

## 🎨 **PHASE 5: FRONTEND IMPROVEMENTS** (Priority: MEDIUM)

### 5.1 Component Organization
- [ ] **Review component structure**
  - [ ] Check for duplicate components
  - [ ] Ensure proper prop typing
  - [ ] Verify component reusability

### 5.2 State Management
- [ ] **Review state management patterns**
  - [ ] Check for prop drilling
  - [ ] Verify context usage
  - [ ] Ensure proper state updates

### 5.3 Performance Optimization
- [ ] **Review performance optimizations**
  - [ ] Check for unnecessary re-renders
  - [ ] Verify memoization usage
  - [ ] Ensure proper lazy loading

---

## 🧪 **PHASE 6: TESTING & QUALITY** (Priority: LOW)

### 6.1 Add Basic Tests
- [ ] **Create test structure**
  - [ ] Unit tests for utilities
  - [ ] Integration tests for API endpoints
  - [ ] Component tests for React components

### 6.2 Error Handling
- [ ] **Improve error handling**
  - [ ] Centralized error logging
  - [ ] User-friendly error messages
  - [ ] Proper error boundaries

### 6.3 Code Quality
- [ ] **Add linting rules**
  - [ ] ESLint configuration
  - [ ] Prettier formatting
  - [ ] TypeScript strict mode

---

## 📊 **PHASE 7: MONITORING & OBSERVABILITY** (Priority: LOW)

### 7.1 Health Checks
- [ ] **Improve health check endpoints**
  - [ ] Database connectivity check
  - [ ] External service status
  - [ ] Performance metrics

### 7.2 Logging
- [ ] **Implement structured logging**
  - [ ] Request/response logging
  - [ ] Error logging with context
  - [ ] Performance logging

### 7.3 Metrics
- [ ] **Add basic metrics**
  - [ ] Request counts
  - [ ] Response times
  - [ ] Error rates

---

## 🎯 **SUCCESS CRITERIA**

### Phase 1 Complete When:
- [ ] All services deploy successfully on Railway
- [ ] No deployment failures for 24 hours
- [ ] Admin panel accessible and functional
- [ ] Frontend accessible and functional

### Phase 2 Complete When:
- [ ] No build warnings about circular dependencies
- [ ] All hardcoded URLs replaced with environment variables
- [ ] Clean project structure without clutter

### Phase 3 Complete When:
- [ ] Backend `index.ts` is under 200 lines
- [ ] All routes properly organized in separate files
- [ ] Business logic extracted to service layer
- [ ] No functionality broken

---

## 🚨 **BLOCKERS & RISKS**

### High Risk:
- **Breaking changes during refactoring** - Mitigation: Test thoroughly before deploying
- **Database schema changes** - Mitigation: Create migration scripts
- **Service downtime** - Mitigation: Deploy during low-traffic periods

### Medium Risk:
- **Performance regression** - Mitigation: Monitor metrics during changes
- **User experience disruption** - Mitigation: Gradual rollout with feature flags

---

## 📅 **ESTIMATED TIMELINE**

- **Phase 1**: 1-2 hours (Critical - fix deployments)
- **Phase 2**: 2-3 hours (High - code cleanup)
- **Phase 3**: 4-6 hours (High - backend refactor)
- **Phase 4**: 2-3 hours (Medium - deployment configs)
- **Phase 5**: 3-4 hours (Medium - frontend improvements)
- **Phase 6**: 4-6 hours (Low - testing & quality)
- **Phase 7**: 3-4 hours (Low - monitoring)

**Total Estimated Time**: 19-28 hours

---

## 🎯 **NEXT ACTION**

**Start with Phase 1.1**: Fix the admin-bff package.json start script to resolve the immediate deployment failure.

**Ready to begin?** Let me know and I'll start implementing Phase 1 fixes!
