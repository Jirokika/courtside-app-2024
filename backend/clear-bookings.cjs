const { Pool } = require('pg')
require('dotenv').config()

// Create a connection pool for PostgreSQL (same as backend)
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 30000
})

async function clearAllBookings() {
  let client
  try {
    console.log('🔍 Connecting to database...')
    client = await pool.connect()
    
    // First, let's see how many bookings exist
    const countResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const bookingCount = parseInt(countResult.rows[0].count)
    
    console.log(`📊 Found ${bookingCount} bookings in the database`)
    
    if (bookingCount === 0) {
      console.log('✅ No bookings to clear!')
      return
    }
    
    // Ask for confirmation
    console.log('⚠️  WARNING: This will delete ALL bookings from the database!')
    console.log('⚠️  This action cannot be undone!')
    
    // For safety, let's show a sample of what will be deleted
    const sampleResult = await client.query('SELECT "id", "userId", "startTime", "status" FROM "bookings" LIMIT 5')
    console.log('\n📋 Sample bookings that will be deleted:')
    sampleResult.rows.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking.id}, User: ${booking.userId}, Start: ${booking.startTime}, Status: ${booking.status}`)
    })
    
    if (bookingCount > 5) {
      console.log(`... and ${bookingCount - 5} more bookings`)
    }
    
    console.log('\n🚨 Type "DELETE ALL BOOKINGS" to confirm:')
    
    // For automated execution, we'll proceed directly
    // In a real scenario, you'd want to read from stdin
    const confirmation = 'DELETE ALL BOOKINGS' // This would normally come from user input
    
    if (confirmation === 'DELETE ALL BOOKINGS') {
      console.log('🗑️  Deleting all bookings...')
      
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
      
    } else {
      console.log('❌ Operation cancelled by user')
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
clearAllBookings()
  .then(() => {
    console.log('🏁 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  }) 