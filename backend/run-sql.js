const { Pool } = require('pg')
require('dotenv').config()

// Create a connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 30000
})

async function runSqlCommands() {
  let client
  try {
    console.log('🔍 Connecting to Railway database...')
    client = await pool.connect()
    
    // 1. Count current bookings
    console.log('\n📊 Step 1: Counting current bookings...')
    const countResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const bookingCount = parseInt(countResult.rows[0].count)
    console.log(`Found ${bookingCount} bookings in the database`)
    
    if (bookingCount === 0) {
      console.log('✅ No bookings to clear!')
      return
    }
    
    // 2. Show sample bookings
    console.log('\n📋 Step 2: Showing sample bookings...')
    const sampleResult = await client.query('SELECT "id", "userId", "startTime", "status" FROM "bookings" LIMIT 5')
    console.log('Sample bookings that will be deleted:')
    sampleResult.rows.forEach((booking, index) => {
      console.log(`${index + 1}. ID: ${booking.id}, User: ${booking.userId}, Start: ${booking.startTime}, Status: ${booking.status}`)
    })
    
    if (bookingCount > 5) {
      console.log(`... and ${bookingCount - 5} more bookings`)
    }
    
    // 3. Delete all bookings
    console.log('\n🗑️  Step 3: Deleting all bookings...')
    const deleteResult = await client.query('DELETE FROM "bookings"')
    console.log(`✅ Successfully deleted ${deleteResult.rowCount} bookings!`)
    
    // 4. Verify deletion
    console.log('\n✅ Step 4: Verifying deletion...')
    const verifyResult = await client.query('SELECT COUNT(*) FROM "bookings"')
    const remainingCount = parseInt(verifyResult.rows[0].count)
    
    if (remainingCount === 0) {
      console.log('✅ Verification: All bookings have been cleared!')
    } else {
      console.log(`⚠️  Warning: ${remainingCount} bookings still remain in database`)
    }
    
    console.log('\n🎉 Database clearing completed successfully!')
    
  } catch (error) {
    console.error('❌ Error running SQL commands:', error)
  } finally {
    if (client) {
      client.release()
    }
    await pool.end()
    console.log('🔌 Database connection closed')
  }
}

// Run the function
runSqlCommands()
  .then(() => {
    console.log('🏁 Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script failed:', error)
    process.exit(1)
  }) 