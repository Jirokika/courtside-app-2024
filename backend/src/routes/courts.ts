import { Router } from 'express'
import { pool } from '../services/database'

const router = Router()

// Get all courts
router.get('/', async (req, res) => {
  try {
    const { sport } = req.query
    
    let query = `
      SELECT id, name, sport, is_available, created_at, updated_at
      FROM courts
    `
    const params: any[] = []
    
    if (sport) {
      query += ` WHERE sport = $1`
      params.push(sport)
    }
    
    query += ` ORDER BY name`
    
    const result = await pool.query(query, params)
    
    res.json({
      success: true,
      data: result.rows
    })
  } catch (error) {
    console.error('Error fetching courts:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courts'
    })
  }
})

// Get courts with availability for a specific date and time
router.get('/availability', async (req, res) => {
  try {
    const { date, time, sport } = req.query
    
    if (!date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Date and time are required'
      })
    }
    
    // Get all courts for the sport
    let courtsQuery = `
      SELECT id, name, sport, is_available
      FROM courts
    `
    const courtsParams: any[] = []
    
    if (sport) {
      courtsQuery += ` WHERE sport = $1`
      courtsParams.push(sport)
    }
    
    const courtsResult = await pool.query(courtsQuery, courtsParams)
    const courts = courtsResult.rows
    
    // Check availability for each court
    const availabilityResult = await pool.query(`
      SELECT court_id, COUNT(*) as booking_count
      FROM bookings
      WHERE date = $1 AND time = $2 AND status IN ('confirmed', 'pending')
      GROUP BY court_id
    `, [date, time])
    
    const bookedCourts = new Map()
    availabilityResult.rows.forEach(row => {
      bookedCourts.set(row.court_id, row.booking_count)
    })
    
    // Add availability info to courts
    const courtsWithAvailability = courts.map(court => ({
      ...court,
      isAvailable: !bookedCourts.has(court.id),
      currentBookings: bookedCourts.get(court.id) || 0
    }))
    
    res.json({
      success: true,
      data: courtsWithAvailability
    })
  } catch (error) {
    console.error('Error fetching court availability:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch court availability'
    })
  }
})

// Get time slots for a court on a specific date
router.get('/:courtId/timeslots', async (req, res) => {
  try {
    const { courtId } = req.params
    const { date } = req.query
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required'
      })
    }
    
    // Get all possible time slots (assuming 1-hour slots from 6 AM to 10 PM)
    const timeSlots = []
    for (let hour = 6; hour <= 22; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`
      timeSlots.push(time)
    }
    
    // Get booked time slots
    const bookedResult = await pool.query(`
      SELECT time
      FROM bookings
      WHERE court_id = $1 AND date = $2 AND status IN ('confirmed', 'pending')
    `, [courtId, date])
    
    const bookedTimes = new Set(bookedResult.rows.map(row => row.time))
    
    // Mark time slots as available/unavailable
    const availability = timeSlots.map(time => ({
      time,
      isAvailable: !bookedTimes.has(time)
    }))
    
    res.json({
      success: true,
      data: availability
    })
  } catch (error) {
    console.error('Error fetching time slots:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time slots'
    })
  }
})

// Create a new court (admin only)
router.post('/', async (req, res) => {
  try {
    const { name, sport, isAvailable = true } = req.body
    
    if (!name || !sport) {
      return res.status(400).json({
        success: false,
        error: 'Name and sport are required'
      })
    }
    
    const result = await pool.query(`
      INSERT INTO courts (name, sport, is_available)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, sport, isAvailable])
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error creating court:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create court'
    })
  }
})

// Update court
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, sport, isAvailable } = req.body
    
    const result = await pool.query(`
      UPDATE courts 
      SET name = COALESCE($1, name),
          sport = COALESCE($2, sport),
          is_available = COALESCE($3, is_available),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [name, sport, isAvailable, id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Court not found'
      })
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error updating court:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update court'
    })
  }
})

export default router
