import { Pool } from 'pg'

// Database connection pool
export const createDatabasePool = () => {
  const pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    query_timeout: 30000, // Return an error after 30 seconds if query could not be completed
    // Set timezone to Cambodia for all connections
    options: `-c timezone=Asia/Phnom_Penh`
  })

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err)
    process.exit(-1)
  })

  return pool
}

export const pool = createDatabasePool()

// Database utility functions
export const query = (text: string, params?: any[]) => pool.query(text, params)

export const getClient = () => pool.connect()

export const closePool = async () => {
  await pool.end()
}
