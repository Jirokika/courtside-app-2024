interface WebSocketMessage {
  type: string
  data?: any
  courtId?: string
  timestamp?: string
  message?: string
}

interface CourtUpdate {
  type: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'BOOKING_UPDATED'
  booking: {
    id: string
    sport: string
    startTime: string
    endTime: string
    status: string
  }
  courtId: string
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private isConnecting = false

  constructor() {
    this.connect()
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_BACKEND_URL?.replace(/^https?:\/\//, '') || 'courtside-backend-production.up.railway.app'
    return `${protocol}//${host}`
  }

  private connect(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true
    const wsUrl = this.getWebSocketUrl()
    
    try {
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.emit('connected', { message: 'Connected to real-time server' })
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('📨 Received WebSocket message:', message.type)
          
          switch (message.type) {
            case 'CONNECTION_ESTABLISHED':
              this.emit('connected', message)
              break
              
            case 'COURT_UPDATE':
              this.emit('courtUpdate', message)
              break
              
            case 'COURT_SUBSCRIPTION':
              this.emit('subscription', message)
              break
              
            case 'PONG':
              this.emit('pong', message)
              break
              
            default:
              console.log('❓ Unknown WebSocket message type:', message.type)
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason)
        this.isConnecting = false
        this.emit('disconnected', { code: event.code, reason: event.reason })
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++
            this.connect()
          }, this.reconnectDelay * this.reconnectAttempts)
        }
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        this.isConnecting = false
        this.emit('error', error)
      }
      
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error)
      this.isConnecting = false
    }
  }

  public subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        eventListeners.delete(callback)
        if (eventListeners.size === 0) {
          this.listeners.delete(event)
        }
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('❌ Error in WebSocket listener:', error)
        }
      })
    }
  }

  public subscribeToCourt(courtId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SUBSCRIBE_COURT',
        courtId
      }))
    }
  }

  public ping(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'PING' }))
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService()

// Export for use in components
export const useWebSocket = () => {
  return {
    subscribe: webSocketService.subscribe.bind(webSocketService),
    subscribeToCourt: webSocketService.subscribeToCourt.bind(webSocketService),
    ping: webSocketService.ping.bind(webSocketService),
    disconnect: webSocketService.disconnect.bind(webSocketService),
    isConnected: webSocketService.isConnected.bind(webSocketService)
  }
} 