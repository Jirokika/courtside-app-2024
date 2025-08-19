# 🎯 Points System Comprehensive Test Plan

## 📋 **Test Overview**
This document outlines comprehensive testing procedures for the Courtside Points System to ensure all functionality works correctly.

## 🧪 **Test Categories**

### **1. Database Schema Tests**
- [ ] Verify all points tables exist
- [ ] Verify sample tasks are loaded
- [ ] Verify sample rewards are loaded
- [ ] Verify user points column exists

### **2. Backend API Tests**
- [ ] Test `/api/points/tasks/:userId` endpoint
- [ ] Test `/api/points/tasks/:taskId/complete` endpoint
- [ ] Test `/api/points/rewards` endpoint
- [ ] Test `/api/points/rewards/:rewardId/purchase` endpoint
- [ ] Test `/api/points/transactions/:userId` endpoint
- [ ] Test `/api/points/purchases/:userId` endpoint

### **3. Automatic Points Awarding Tests**
- [ ] Test first booking points (100 points)
- [ ] Test regular booking points (25 points)
- [ ] Test milestone booking points (5, 10, 25 bookings)
- [ ] Test early bird booking points (6-9 AM)
- [ ] Test peak hour booking points (6-9 PM)
- [ ] Test first credit purchase points (150 points)
- [ ] Test credit purchase bonus points

### **4. Frontend Integration Tests**
- [ ] Test PointsScreen loads real data
- [ ] Test task completion from frontend
- [ ] Test reward purchasing from frontend
- [ ] Test transaction history display
- [ ] Test points balance display

### **5. User Experience Tests**
- [ ] Test points are awarded immediately
- [ ] Test task progress updates
- [ ] Test reward purchasing flow
- [ ] Test error handling
- [ ] Test loading states

## 🚀 **Test Execution Commands**

### **Backend Health Check**
```bash
curl -X GET "https://courtside-backend-production.up.railway.app/api/health"
```

### **Test Points Endpoints**
```bash
# Test rewards endpoint
curl -X GET "https://courtside-backend-production.up.railway.app/api/points/rewards"

# Test tasks endpoint (replace USER_ID)
curl -X GET "https://courtside-backend-production.up.railway.app/api/points/tasks/USER_ID"

# Test transactions endpoint (replace USER_ID)
curl -X GET "https://courtside-backend-production.up.railway.app/api/points/transactions/USER_ID"
```

### **Test Task Completion**
```bash
# Complete a task (replace USER_ID and TASK_ID)
curl -X POST "https://courtside-backend-production.up.railway.app/api/points/tasks/TASK_ID/complete" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID"}'
```

### **Test Reward Purchase**
```bash
# Purchase a reward (replace USER_ID and REWARD_ID)
curl -X POST "https://courtside-backend-production.up.railway.app/api/points/rewards/REWARD_ID/purchase" \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID"}'
```

## 📊 **Expected Results**

### **Points Awarding Rules**
- **First Booking**: 100 points + 25 points = 125 total
- **Regular Booking**: 25 points
- **5 Bookings Milestone**: 200 points
- **10 Bookings Milestone**: 500 points
- **25 Bookings Milestone**: 1000 points
- **Early Bird (6-9 AM)**: 35 points
- **Peak Hour (6-9 PM)**: 20 points
- **First Credit Purchase**: 150 points
- **Credit Purchase Bonus**: 25-100 points based on amount

### **Available Tasks**
- [ ] Make Your First Booking (100 points)
- [ ] Complete a Booking (25 points, repeatable)
- [ ] Make 5 Bookings (200 points)
- [ ] Complete 10 Bookings (500 points)
- [ ] Complete 25 Bookings (1000 points)
- [ ] Early Bird (35 points, repeatable)
- [ ] Peak Hour Player (20 points, repeatable)
- [ ] Complete Profile (75 points)
- [ ] Credit Buyer (150 points)
- [ ] Weekly Active (50 points, weekly)
- [ ] Share the App (25 points, repeatable)
- [ ] Refer a Friend (200 points, repeatable)
- [ ] Write a Review (30 points, repeatable)
- [ ] Explore Courts (5 points, daily)

### **Available Rewards**
- [ ] $2 Booking Discount (200 points)
- [ ] $5 Booking Discount (450 points)
- [ ] $10 Booking Discount (850 points)
- [ ] Free 1-Hour Booking (1200 points)
- [ ] 25% Off Weekend Booking (600 points)
- [ ] 24h Priority Booking (400 points)
- [ ] Free Court Upgrade (500 points)
- [ ] No Cancellation Fee (300 points)
- [ ] Free Weekend Booking (800 points)
- [ ] Priority Access Pass (600 points)
- [ ] Early Access Pass (500 points)
- [ ] Free Coach Session (2000 points)
- [ ] Free Equipment Rental (300 points)
- [ ] Premium Locker Access (200 points)
- [ ] Refreshment Voucher (400 points)
- [ ] Sticker Pack (250 points)
- [ ] Water Bottle (800 points)
- [ ] T-Shirt (1500 points)

## 🔍 **Test Scenarios**

### **Scenario 1: New User Journey**
1. User creates account
2. User makes first booking
3. Verify 125 points awarded (100 + 25)
4. User completes profile
5. Verify 75 points awarded
6. User purchases credits
7. Verify 150 points awarded
8. User purchases reward
9. Verify points deducted correctly

### **Scenario 2: Milestone Testing**
1. User makes 5 bookings
2. Verify 200 milestone points awarded
3. User makes 10 bookings
4. Verify 500 milestone points awarded
5. User makes 25 bookings
6. Verify 1000 milestone points awarded

### **Scenario 3: Special Booking Times**
1. User books 7:00 AM slot
2. Verify 35 early bird points awarded
3. User books 8:00 PM slot
4. Verify 20 peak hour points awarded

### **Scenario 4: Reward System**
1. User accumulates 500 points
2. User purchases $5 discount reward
3. Verify 450 points deducted
4. Verify reward appears in purchases
5. Verify transaction history updated

## 🐛 **Error Handling Tests**
- [ ] Test insufficient points for reward purchase
- [ ] Test invalid task completion
- [ ] Test network errors
- [ ] Test database connection issues
- [ ] Test malformed requests

## 📈 **Performance Tests**
- [ ] Test points awarding speed
- [ ] Test API response times
- [ ] Test concurrent user scenarios
- [ ] Test database query performance

## ✅ **Success Criteria**
- [ ] All endpoints return correct data
- [ ] Points are awarded accurately
- [ ] Tasks complete correctly
- [ ] Rewards can be purchased
- [ ] Transaction history is accurate
- [ ] Frontend displays real data
- [ ] No errors in console
- [ ] User experience is smooth

## 🚨 **Known Issues to Monitor**
- [ ] Points endpoints deployment status
- [ ] Database timezone consistency
- [ ] Frontend-backend data synchronization
- [ ] Real-time updates for points balance

## 📝 **Test Results Log**
```
Date: _______________
Tester: _______________
Backend Status: _______________
Frontend Status: _______________
Points System Status: _______________
Issues Found: _______________
Recommendations: _______________
``` 