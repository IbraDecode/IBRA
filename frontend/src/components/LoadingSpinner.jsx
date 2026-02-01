import React from 'react';

export default function LoadingSpinner({ fullScreen, size = 'medium' }) {
  const sizes = {
    small: 24,
    medium: 40,
    large: 56
  };

  const spinnerSize = sizes[size] || 40;

  const containerStyle = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    zIndex: 9999
  } : {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0'
  };

  return (
    <div style={containerStyle}>
      <div style={{
        width: spinnerSize,
        height: spinnerSize,
        border: '3px solid #222',
        borderTopColor: '#c9a227',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      {fullScreen && (
        <div style={{
          marginTop: '16px',
          color: '#666',
          fontSize: '14px',
          letterSpacing: '2px'
        }}>
          MEMUAT...
        </div>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div className="skeleton" style={{
        width: '100%',
        paddingTop: '140%',
        background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />
      <div style={{ padding: '12px' }}>
        <div className="skeleton" style={{
          width: '80%',
          height: '16px',
          marginBottom: '8px',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
        <div className="skeleton" style={{
          width: '50%',
          height: '12px',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonText({ lines = 2 }) {
  return (
    <div style={{ width: '100%' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{
          width: i === lines - 1 ? '60%' : '100%',
          height: '14px',
          marginBottom: i < lines - 1 ? '8px' : 0,
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      ))}
    </div>
  );
}
