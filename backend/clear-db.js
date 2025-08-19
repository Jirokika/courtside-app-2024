// Simple script to clear all bookings from the database
// This can be run in the Railway environment

const { Pool } = require('pg')

// Create a connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 30000
})

async function clearBookings() {
  let client
  try {
    console.log('🔍 Connecting to Railway database...')
    client = await pool.connect()
    
    // Count existing bookings
    const countResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const bookingCount = parseInt(countResult.rows[0].count)
    
    console.log(`📊 Found ${bookingCount} bookings in the database`)
    
    if (bookingCount === 0) {
      console.log('✅ No bookings to clear!')
      return
    }
    
    // Show sample bookings
    const sampleResult = await client.query('SELECT "id", "userId", "startTime", "status" FROM "bookings" LIMIT 5')
    console.log('\n📋 Sample bookings that will be deleted:')
    sampleResult.rows.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking.id}, User: ${booking.userId}, Start: ${booking.startTime}, Status: ${booking.status}`)
    })
    
    if (bookingCount > 5) {
      console.log(`... and ${bookingCount - 5} more bookings`)
    }
    
    console.log('\n🗑️  Deleting all bookings...')
    
    // Delete all bookings
    const deleteResult = await client.query('DELETE FROM "bookings"')
    
    console.log(`✅ Successfully deleted ${deleteResult.rowCount} bookings!`)
    
    // Verify deletion
    const verifyResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const remainingCount = parseInt(verifyResult.rows[0].count)
    
    if (remainingCount === 0) {
      console.log('✅ Verification: All bookings have been cleared!')
    } else {
      console.log(`⚠️  Warning: ${remainingCount} bookings still remain in database`)
    }
    
  } catch (error) {
    console.error('❌ Error clearing bookings:', error)
  } finally {
    if (client) {
      client.release()
    }
    await pool.end()
    console.log('🔌 Database connection closed')
  }
}

// Run the function
clearBookings()
  .then(() => {
    console.log('🏁 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  }) 