import React from 'react'

interface SimpleSportScreenProps {
  navigateTo: (screen: string) => void
  updateBookingState: (updates: any) => void
  appState: any
}

export const SimpleSportScreen: React.FC<SimpleSportScreenProps> = ({
  navigateTo,
  updateBookingState,
  appState,
}) => {
  const handleBack = () => {
    navigateTo('home')
  }

  const handleSportSelect = (sport: string) => {
    updateBookingState({ selectedSport: sport })
    navigateTo('date-selection')
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      color: 'white'
    }}>

      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '32px' }}>
        <button
          onClick={handleBack}
          style={{
            position: 'absolute',
            left: '16px',
            top: '32px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          Choose Your Sport
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          Select your preferred sport
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          width: '100%', 
          height: '8px', 
          backgroundColor: 'rgba(255, 255, 255, 0.2)', 
          borderRadius: '4px' 
        }}>
          <div style={{ 
            width: '16%', 
            height: '100%', 
            backgroundColor: '#10b981', 
            borderRadius: '4px' 
          }}></div>
        </div>
      </div>

      {/* Sport Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Badminton */}
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '16px', 
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '32px'
              }}>
                🏸
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Badminton
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>
                  Professional badminton courts
                </p>
                <p style={{ color: '#4ade80', fontWeight: '600' }}>
                  $12/hour
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSportSelect('badminton')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Select
            </button>
          </div>
        </div>

        {/* Pickleball */}
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '16px', 
          padding: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '32px'
              }}>
                🏓
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Pickleball
                </h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>
                  Professional pickleball courts
                </p>
                <p style={{ color: '#4ade80', fontWeight: '600' }}>
                  $14/hour
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSportSelect('pickleball')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Select
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '16px',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '20px' }}>🏠</span>
            <span style={{ fontSize: '12px' }}>Home</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '20px' }}>📅</span>
            <span style={{ fontSize: '12px' }}>Bookings</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '20px' }}>➕</span>
            <span style={{ fontSize: '12px' }}>Book</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '20px' }}>👤</span>
            <span style={{ fontSize: '12px' }}>Profile</span>
          </div>
        </div>
      </div>
    </div>
  )
} 