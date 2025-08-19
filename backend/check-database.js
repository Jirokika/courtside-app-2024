import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkDatabase() {
  let client;
  try {
    console.log('🔍 Checking database...');
    client = await pool.connect();

    // Check users
    const usersResult = await client.query('SELECT id, "firstName", "lastName", "telegramId", credits, "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 10');
    console.log('\n📊 Users in database:');
    console.log(`Total users: ${usersResult.rows.length}`);
    usersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (ID: ${user.id}) - Credits: ${user.credits} - Created: ${user.createdAt}`);
    });

    // Check bookings
    const bookingsResult = await client.query(`
      SELECT 
        b.id, 
        b."userId", 
        b."courtId", 
        b."startTime", 
        b."endTime", 
        b.status, 
        b."paymentStatus", 
        b."totalPrice",
        b."createdAt",
        c.name as courtName,
        c.sport as courtSport,
        u."firstName",
        u."lastName"
      FROM bookings b
      JOIN courts c ON b."courtId" = c.id
      JOIN users u ON b."userId" = u.id
      ORDER BY b."createdAt" DESC
    `);
    
    console.log('\n📅 Bookings in database:');
    console.log(`Total bookings: ${bookingsResult.rows.length}`);
    
    if (bookingsResult.rows.length > 0) {
      bookingsResult.rows.forEach((booking, index) => {
        console.log(`${index + 1}. ${booking.firstName} ${booking.lastName} - ${booking.courtName} (${booking.courtSport})`);
        console.log(`   Date: ${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()}`);
        console.log(`   Status: ${booking.status} - Payment: ${booking.paymentStatus} - Price: $${booking.totalPrice}`);
        console.log(`   Created: ${booking.createdAt}`);
        console.log('');
      });
    } else {
      console.log('✅ No bookings found in database');
    }

    // Check courts
    const courtsResult = await client.query('SELECT id, name, sport, "pricePerHour", "isAvailable" FROM courts ORDER BY name');
    console.log('\n🏟️ Courts in database:');
    console.log(`Total courts: ${courtsResult.rows.length}`);
    courtsResult.rows.forEach(court => {
      console.log(`- ${court.name} (${court.sport}) - $${court.pricePerHour}/hour - Available: ${court.isAvailable}`);
    });

    // Check payments
    const paymentsResult = await client.query(`
      SELECT 
        p.id, 
        p."bookingId", 
        p.amount, 
        p.status, 
        p."paymentMethod",
        p."createdAt",
        b."startTime"
      FROM payments p
      JOIN bookings b ON p."bookingId" = b.id
      ORDER BY p."createdAt" DESC
    `);
    
    console.log('\n💳 Payments in database:');
    console.log(`Total payments: ${paymentsResult.rows.length}`);
    paymentsResult.rows.forEach((payment, index) => {
      console.log(`${index + 1}. Booking: ${payment.bookingId} - Amount: $${payment.amount} - Status: ${payment.status} - Method: ${payment.paymentMethod}`);
      console.log(`   Created: ${payment.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function clearTestData() {
  let client;
  try {
    console.log('🧹 Clearing test data...');
    client = await pool.connect();

    // Clear test bookings (older than 1 day or with test patterns)
    const deleteTestBookings = await client.query(`
      DELETE FROM bookings 
      WHERE "createdAt" < NOW() - INTERVAL '1 day'
      OR id LIKE 'test-%'
      OR id LIKE 'mock-%'
      OR "userId" LIKE 'test-%'
      OR "userId" LIKE 'mock-%'
    `);
    
    console.log(`🗑️ Deleted ${deleteTestBookings.rowCount} test bookings`);

    // Clear test payments
    const deleteTestPayments = await client.query(`
      DELETE FROM payments 
      WHERE "bookingId" NOT IN (SELECT id FROM bookings)
    `);
    
    console.log(`🗑️ Deleted ${deleteTestPayments.rowCount} orphaned payments`);

    // Clear test users (older than 1 day or with test patterns)
    const deleteTestUsers = await client.query(`
      DELETE FROM users 
      WHERE "createdAt" < NOW() - INTERVAL '1 day'
      OR id LIKE 'test-%'
      OR id LIKE 'mock-%'
      OR "telegramId" LIKE 'test-%'
      OR "telegramId" LIKE 'mock-%'
    `);
    
    console.log(`🗑️ Deleted ${deleteTestUsers.rowCount} test users`);

    console.log('✅ Test data cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the appropriate function based on command line argument
const command = process.argv[2];

if (command === 'clear') {
  clearTestData();
} else {
  checkDatabase();
} 