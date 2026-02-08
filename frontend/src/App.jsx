import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import DetailPage from './pages/DetailPage';
import PlayerPage from './pages/PlayerPage';
import LibraryPage from './pages/LibraryPage';
import ForYouPage from './pages/ForYouPage';
import LoadingSpinner from './components/LoadingSpinner';
import { initSession, getSession, API_BASE } from './services/api';

export const AppContext = createContext(null);

function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    defaultSpeed: 1.0,
    dataSaver: false,
    autoPlay: true
  });

  useEffect(() => {
    async function init() {
      try {
        const existingSession = getSession();
        if (existingSession) {
          setSession(existingSession);
        } else {
          const newSession = await initSession();
          setSession(newSession);
        }
      } catch (error) {
        console.error('Session init error:', error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const updatePreferences = useCallback((newPrefs) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
    localStorage.setItem('ibra_preferences', JSON.stringify({ ...preferences, ...newPrefs }));
  }, [preferences]);

  useEffect(() => {
    const saved = localStorage.getItem('ibra_preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  return (
    <AppContext.Provider value={{ session, loading, preferences, updatePreferences }}>
      {children}
    </AppContext.Provider>
  );
}

function AppContent() {
  const { loading } = useContext(AppContext);
  const location = useLocation();
  const isPlayer = location.pathname.includes('/player/');

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {!isPlayer && <BottomNavigation />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '70px' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/foryou" element={<ForYouPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/detail/:dramaId" element={<DetailPage />} />
          <Route path="/player/:dramaId/:episodeId" element={<PlayerPage />} />
          <Route path="/library" element={<LibraryPage />} />
        </Routes>
      </div>
    </div>
  );
}

function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: 'home', label: 'Home' },
    { path: '/foryou', icon: 'foryou', label: 'Untuk Anda' },
    { path: '/library', icon: 'library', label: 'Library' }
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: 'rgba(10, 10, 10, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid #222',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 100
    }}>
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              color: isActive ? '#e50914' : '#666',
              transition: 'color 0.2s'
            }}
          >
            <NavIcon name={item.icon} size={22} />
            <span style={{ fontSize: '11px', marginTop: '2px' }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function NavIcon({ name, size }) {
  const icons = {
    home: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    foryou: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    library: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <path d="M8 6h8M8 12h8M8 18h4" />
      </svg>
    )
  };

  return icons[name] || null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}
