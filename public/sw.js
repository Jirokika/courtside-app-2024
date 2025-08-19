const CACHE_NAME = 'courtside-v2.0.0'
const STATIC_CACHE = 'courtside-static-v2.0.0'
const DYNAMIC_CACHE = 'courtside-dynamic-v2.0.0'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v2.0.0...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('Service Worker: Skip waiting...')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Install error:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v2.0.0...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete all old caches to force fresh start
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Claiming clients...')
        return self.clients.claim()
      })
      .then(() => {
        console.log('Service Worker: Activation complete')
      })
      .catch((error) => {
        console.error('Service Worker: Activation error:', error)
      })
  )
})

// Fetch event - network first for HTML, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension requests entirely
  if (request.url && request.url.startsWith('chrome-extension://')) {
    console.log('Service Worker: Skipping chrome-extension request:', request.url)
    return
  }

  // Handle API requests differently
  if (request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle HTML requests (network first)
  if (request.destination === 'document' || request.url.endsWith('.html')) {
    event.respondWith(handleHtmlRequest(request))
    return
  }

  // Handle static assets (cache first)
  event.respondWith(handleAssetRequest(request))
})

// Handle HTML requests with network-first strategy
async function handleHtmlRequest(request) {
  try {
    // Try network first
    const response = await fetch(request)
    
    if (response.ok) {
      // Cache the fresh response
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
      return response
    }
  } catch (error) {
    console.log('Network failed for HTML, trying cache...')
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Last resort - return offline page
  return caches.match('/')
}

// Handle asset requests with cache-first strategy
async function handleAssetRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    // Fetch from network
    const response = await fetch(request)
    
    if (response.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.error('Failed to fetch asset:', request.url, error)
    // Return a basic offline response
    return new Response('', { status: 404 })
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const response = await fetch(request)
    
    // Cache successful responses (skip unsupported schemes)
    if (response.ok && request.url && !request.url.startsWith('chrome-extension://')) {
      try {
        const cache = await caches.open(DYNAMIC_CACHE)
        cache.put(request, response.clone())
      } catch (error) {
        console.warn('Failed to cache API response:', error)
      }
    }
    
    return response
  } catch (error) {
    // Fallback to cache if network fails
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ error: 'Offline - Please check your connection' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  try {
    // Sync any pending bookings or payments
    console.log('Service Worker: Background sync in progress...')
    
    // Get pending actions from IndexedDB
    const pendingActions = await getPendingActions()
    
    for (const action of pendingActions) {
      try {
        await syncAction(action)
        await removePendingAction(action.id)
      } catch (error) {
        console.error('Failed to sync action:', error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Helper functions for background sync
async function getPendingActions() {
  // This would integrate with your IndexedDB
  return []
}

async function syncAction(action) {
  // Sync booking or payment data
  console.log('Syncing action:', action)
}

async function removePendingAction(id) {
  // Remove synced action from pending list
  console.log('Removing pending action:', id)
}

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New booking update!',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiBmaWxsPSIjM2I4MmY2Ii8+Cjx0ZXh0IHg9Ijk2IiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo=',
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiBmaWxsPSIjM2I4MmY2Ii8+Cjx0ZXh0IHg9Ijk2IiB5PSIxMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI0OCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkM8L3RleHQ+Cjwvc3ZnPgo=',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Booking',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('Courtside Mini App', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
}) 