#!/usr/bin/env node

/**
 * Load Testing Script for Courtside Bot
 * Tests system performance under various load conditions
 */

const https = require('https')
const { performance } = require('perf_hooks')

// Configuration
const CONFIG = {
  baseUrl: 'https://courtside-backend-production.up.railway.app',
  endpoints: [
    '/api/health',
    '/api/courts',
    '/api/points/test',
    '/api/credits/packages'
  ],
  concurrentUsers: 10,
  requestsPerUser: 20,
  delayBetweenRequests: 100, // ms
  timeout: 5000 // ms
}

// Test results
const results = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  startTime: 0,
  endTime: 0
}

// Utility functions
const makeRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const startTime = performance.now()
    
    const req = https.request(url, options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        const endTime = performance.now()
        const responseTime = endTime - startTime
        
        results.responseTimes.push(responseTime)
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          results.successfulRequests++
          resolve({ statusCode: res.statusCode, responseTime, data })
        } else {
          results.failedRequests++
          reject({ statusCode: res.statusCode, responseTime, data })
        }
      })
    })
    
    req.on('error', (error) => {
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      results.failedRequests++
      results.errors.push(error.message)
      reject({ error: error.message, responseTime })
    })
    
    req.setTimeout(CONFIG.timeout, () => {
      req.destroy()
      results.failedRequests++
      results.errors.push('Request timeout')
      reject({ error: 'Request timeout' })
    })
    
    req.end()
  })
}

const simulateUser = async (userId) => {
  console.log(`👤 User ${userId} starting...`)
  
  for (let i = 0; i < CONFIG.requestsPerUser; i++) {
    const endpoint = CONFIG.endpoints[Math.floor(Math.random() * CONFIG.endpoints.length)]
    const url = `${CONFIG.baseUrl}${endpoint}`
    
    try {
      await makeRequest(url)
      console.log(`✅ User ${userId} - Request ${i + 1}/${CONFIG.requestsPerUser} successful`)
    } catch (error) {
      console.log(`❌ User ${userId} - Request ${i + 1}/${CONFIG.requestsPerUser} failed:`, error.error || error.statusCode)
    }
    
    results.totalRequests++
    
    // Delay between requests
    if (i < CONFIG.requestsPerUser - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests))
    }
  }
  
  console.log(`👤 User ${userId} completed`)
}

const runLoadTest = async () => {
  console.log('🚀 Starting Load Test for Courtside Bot')
  console.log(`📊 Configuration:`)
  console.log(`   - Base URL: ${CONFIG.baseUrl}`)
  console.log(`   - Concurrent Users: ${CONFIG.concurrentUsers}`)
  console.log(`   - Requests per User: ${CONFIG.requestsPerUser}`)
  console.log(`   - Total Requests: ${CONFIG.concurrentUsers * CONFIG.requestsPerUser}`)
  console.log('')
  
  results.startTime = performance.now()
  
  // Create concurrent users
  const userPromises = []
  for (let i = 0; i < CONFIG.concurrentUsers; i++) {
    userPromises.push(simulateUser(i + 1))
  }
  
  // Wait for all users to complete
  await Promise.all(userPromises)
  
  results.endTime = performance.now()
  
  // Calculate statistics
  const totalTime = (results.endTime - results.startTime) / 1000
  const avgResponseTime = results.responseTimes.length > 0 
    ? results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length 
    : 0
  const minResponseTime = Math.min(...results.responseTimes)
  const maxResponseTime = Math.max(...results.responseTimes)
  const successRate = (results.successfulRequests / results.totalRequests) * 100
  
  // Display results
  console.log('')
  console.log('📊 Load Test Results:')
  console.log('=====================')
  console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}s`)
  console.log(`📈 Total Requests: ${results.totalRequests}`)
  console.log(`✅ Successful: ${results.successfulRequests}`)
  console.log(`❌ Failed: ${results.failedRequests}`)
  console.log(`📊 Success Rate: ${successRate.toFixed(2)}%`)
  console.log('')
  console.log('⏱️  Response Times:')
  console.log(`   - Average: ${avgResponseTime.toFixed(2)}ms`)
  console.log(`   - Minimum: ${minResponseTime.toFixed(2)}ms`)
  console.log(`   - Maximum: ${maxResponseTime.toFixed(2)}ms`)
  console.log('')
  console.log('🚀 Requests per Second:', (results.totalRequests / totalTime).toFixed(2))
  
  if (results.errors.length > 0) {
    console.log('')
    console.log('❌ Errors:')
    results.errors.slice(0, 10).forEach(error => {
      console.log(`   - ${error}`)
    })
    if (results.errors.length > 10) {
      console.log(`   ... and ${results.errors.length - 10} more errors`)
    }
  }
  
  // Performance assessment
  console.log('')
  console.log('🎯 Performance Assessment:')
  if (successRate >= 95 && avgResponseTime < 500) {
    console.log('🟢 EXCELLENT - System performing exceptionally well under load')
  } else if (successRate >= 90 && avgResponseTime < 1000) {
    console.log('🟡 GOOD - System performing well under load')
  } else if (successRate >= 80 && avgResponseTime < 2000) {
    console.log('🟠 ACCEPTABLE - System performing adequately under load')
  } else {
    console.log('🔴 NEEDS IMPROVEMENT - System struggling under load')
  }
}

// Run the load test
if (require.main === module) {
  runLoadTest().catch(console.error)
}

module.exports = { runLoadTest, CONFIG }
