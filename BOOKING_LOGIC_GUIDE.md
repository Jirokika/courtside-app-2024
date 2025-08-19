# Booking Logic & Pricing Strategy Guide

## Overview

This guide explains the booking logic and pricing calculations for the Courtside Booking App, addressing the complex scenarios when users select multiple dates and times.

## Current Pricing Structure

- **Badminton**: $12/hour
- **Pickleball**: $16/hour
- **Available Courts**: 8 Badminton, 4 Pickleball
- **Time Slots**: 07:00-21:00 (excluding 22:00)
- **Duration Options**: 1-5 hours

## Booking Logic Approaches

### 1. Simple Mode: Same Time for All Dates (Default)

**How it works:**
- User selects multiple dates (e.g., 15th, 16th, 17th)
- System shows only time slots available for ALL selected dates
- Same time slot is booked for all dates
- One time selection covers all dates

**Pricing Formula:**
```
Total = PricePerHour × Duration × NumberOfDates × NumberOfCourts
```

**Example Scenario:**
- User selects: July 15 (today), July 16 (tomorrow)
- Today available: 12:00-21:00 (past times filtered)
- Tomorrow available: 07:00-21:00 (all times available)
- **System shows**: 12:00-21:00 (intersection of both days)
- **If user selects 14:00**: Books 14:00 on both July 15 and July 16

**Pros:**
- Simple and intuitive
- Easy pricing calculation
- Consistent booking experience
- Most users want same time across dates

**Cons:**
- Restricts options when "today" is included
- May eliminate preferred times for future dates

### 2. Advanced Mode: Different Times per Date

**How it works:**
- User selects multiple dates
- System allows different time selection for each date
- Maximum flexibility for complex schedules
- Each date handled independently

**Pricing Formula:**
```
Total = Σ(PricePerHour × Duration × NumberOfCourts) for each date
```

**Example Scenario:**
- User selects: July 15, July 16, July 17
- July 15: Books 14:00-15:00 (available from 12:00)
- July 16: Books 07:00-08:00 (all times available)
- July 17: Books 19:00-20:00 (all times available)
- **Different times for each date**

**Pros:**
- Maximum flexibility
- No artificial time restrictions
- Optimal for complex schedules
- Future dates not limited by today's restrictions

**Cons:**
- More complex UI/UX
- Longer booking process
- More confusing pricing
- Potential for user errors

## Implementation Details

### Time Slot Filtering Logic

```typescript
// Simple Mode (Same time for all dates)
const availableForAllDates = timeSlots.filter(slot => {
  return selectedDates.every(date => {
    if (isToday(date)) {
      return isFutureTime(slot.startTime);
    }
    return true; // Future dates have all times available
  });
});

// Advanced Mode (Different times per date)
const availableForCurrentDate = timeSlots.filter(slot => {
  if (isToday(currentDate)) {
    return isFutureTime(slot.startTime);
  }
  return true;
});
```

### Pricing Calculation Examples

#### Simple Mode Examples:

**Example 1: Single Date**
- Date: July 16
- Time: 14:00-16:00 (2 hours)
- Sport: Badminton ($12/hour)
- Courts: 2 courts
- **Total**: $12 × 2 × 1 × 2 = $48

**Example 2: Multiple Dates, Same Time**
- Dates: July 15, 16, 17 (3 dates)
- Time: 14:00-15:00 (1 hour) for all dates
- Sport: Pickleball ($16/hour)
- Courts: 1 court
- **Total**: $16 × 1 × 3 × 1 = $48

**Example 3: Multiple Dates, Multiple Courts**
- Dates: July 15, 16 (2 dates)
- Time: 19:00-21:00 (2 hours) for all dates
- Sport: Badminton ($12/hour)
- Courts: 3 courts
- **Total**: $12 × 2 × 2 × 3 = $144

#### Advanced Mode Examples:

**Example 1: Different Times per Date**
- July 15: 14:00-15:00 (1h), 2 courts, Badminton = $12 × 1 × 2 = $24
- July 16: 07:00-09:00 (2h), 1 court, Badminton = $12 × 2 × 1 = $24
- July 17: 19:00-20:00 (1h), 1 court, Badminton = $12 × 1 × 1 = $12
- **Total**: $24 + $24 + $12 = $60

## Edge Cases & Solutions

### 1. Today + Future Dates Problem
**Problem**: Today (12:00+ available) + Tomorrow (07:00+ available) = Only 12:00+ shown
**Solution**: Booking mode toggle allows users to choose flexibility vs simplicity

### 2. No Available Time Slots
**Problem**: No time slots available for all selected dates
**Solution**: Suggest switching to Advanced mode or selecting different dates

### 3. Time Zone Handling
**Problem**: UTC vs local time conversion issues
**Solution**: All date/time handling uses local timezone consistently

### 4. Multiple Court Availability
**Problem**: Different courts may have different availability
**Solution**: Check each court's availability independently

## User Experience Considerations

### When to Use Simple Mode:
- Regular recurring bookings
- Users want consistency
- Simple scheduling needs
- Most common use case

### When to Use Advanced Mode:
- Complex schedules
- Today + future dates with different needs
- Maximum flexibility required
- Power users

### UI/UX Guidelines:
1. **Default to Simple Mode** - Most users prefer consistency
2. **Clear Mode Explanation** - Explain what each mode does
3. **Smart Suggestions** - Suggest Advanced mode when Simple mode has no options
4. **Visual Feedback** - Show which dates/times are being booked
5. **Confirmation Summary** - Clear breakdown of what's being booked

## Technical Implementation

### Data Structure:

```typescript
// Simple Mode
interface SimpleBooking {
  dates: Date[];
  timeSlot: string;
  duration: number;
  courts: string[];
}

// Advanced Mode
interface AdvancedBooking {
  bookings: {
    date: Date;
    timeSlot: string;
    duration: number;
    courts: string[];
  }[];
}
```

### API Endpoints:

```typescript
// Simple Mode: Create multiple bookings with same time
POST /api/bookings/batch
{
  dates: ['2025-07-15', '2025-07-16'],
  timeSlot: '14:00',
  duration: 2,
  courts: ['court1', 'court2']
}

// Advanced Mode: Create multiple bookings with different times
POST /api/bookings/advanced
{
  bookings: [
    { date: '2025-07-15', timeSlot: '14:00', duration: 1, courts: ['court1'] },
    { date: '2025-07-16', timeSlot: '07:00', duration: 2, courts: ['court1'] }
  ]
}
```

## Summary

The hybrid approach provides the best user experience by:
1. **Defaulting to simple** - Most users want consistency
2. **Providing flexibility** - Advanced users can optimize their schedule
3. **Clear communication** - Users understand the tradeoffs
4. **Graceful degradation** - Falls back to advanced mode when simple fails

This solution addresses your concern about "crazy users" who want different times for different dates while maintaining simplicity for the majority of users. 