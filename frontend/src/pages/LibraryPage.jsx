import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, getFavorites, deleteFromHistory, removeFavorite, clearLocalData } from '../services/api';
import { SkeletonCard } from '../components/LoadingSpinner';
import TrashIcon from '../components/Icons';
import OptimizedImage from '../components/OptimizedImage';

export default function LibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('continue');
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, favoritesRes] = await Promise.all([
        getHistory(),
        getFavorites()
      ]);

      if (historyRes.success) setHistory(historyRes.data || []);
      if (favoritesRes.success) setFavorites(favoritesRes.data || []);
    } catch (error) {
      console.error('Load library error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteHistory = async (dramaId) => {
    try {
      await deleteFromHistory(dramaId);
      setHistory(prev => prev.filter(h => h.drama_id !== dramaId));
    } catch (error) {
      console.error('Delete history error:', error);
    }
  };

  const handleDeleteFavorite = async (dramaId) => {
    try {
      await removeFavorite(dramaId);
      setFavorites(prev => prev.filter(f => f.drama_id !== dramaId));
    } catch (error) {
      console.error('Delete favorite error:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearLocalData();
      setHistory([]);
      setFavorites([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Clear all error:', error);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader />
        <Tabs active={activeTab} onChange={setActiveTab} />
        <div style={{ padding: '16px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px',
            boxSizing: 'border-box',
            minWidth: 0
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ minWidth: 0 }}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader onClear={() => setShowClearConfirm(true)} />
      <Tabs active={activeTab} onChange={setActiveTab} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {activeTab === 'continue' && (
          <ContentList
            items={history}
            emptyMessage="Belum ada riwayat menonton"
            onItemClick={(item) => navigate(`/detail/${item.drama_id}`)}
            onDelete={(id) => handleDeleteHistory(id)}
            showProgress
            progress={item => {
              const total = item.total_episodes || 1;
              const progress = ((item.episode_index + 1) / total) * 100;
              return progress;
            }}
          />
        )}

        {activeTab === 'favorites' && (
          <ContentList
            items={favorites}
            emptyMessage="Belum ada favorit"
            onItemClick={(item) => navigate(`/detail/${item.drama_id}`)}
            onDelete={(id) => handleDeleteFavorite(id)}
          />
        )}
      </div>

      {showClearConfirm && (
        <ConfirmDialog
          title="Hapus Semua Data?"
          message="Tindakan ini akan menghapus riwayat menonton dan favorit. Data tidak dapat dikembalikan."
          confirmText="Hapus"
          cancelText="Batal"
          onConfirm={handleClearAll}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </PageContainer>
  );
}

function PageContainer({ children }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0a0a0a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
    }}>
      {children}
    </div>
  );
}

function PageHeader({ onClear }) {
  const hasData = true;

  return (
    <header style={{
      padding: '16px',
      paddingTop: '48px',
      backgroundColor: '#0a0a0a',
      borderBottom: '1px solid #1a1a1a'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Library</h1>
          <p style={{ fontSize: '12px', color: '#666' }}>Riwayat & Favorit</p>
        </div>
        {hasData && (
          <button
            onClick={onClear}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#888',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Bersihkan
          </button>
        )}
      </div>
    </header>
  );
}

function Tabs({ active, onChange }) {
  const tabs = [
    { id: 'continue', label: 'Lanjutkan' },
    { id: 'favorites', label: 'Favorit' }
  ];

  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid #1a1a1a',
      backgroundColor: '#0a0a0a'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            borderBottom: active === tab.id ? '2px solid #e50914' : '2px solid transparent',
            color: active === tab.id ? '#e50914' : '#666',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ContentList({
  items,
  emptyMessage,
  onItemClick,
  onDelete,
  showProgress = false,
  progress = () => 0
}) {
  if (items.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '40px'
      }}>
        <LibraryIcon size={48} />
        <p style={{ color: '#666', marginTop: '16px', textAlign: 'center' }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map(item => (
        <LibraryItem
          key={item.drama_id || item.id}
          item={item}
          onClick={() => onItemClick(item)}
          onDelete={() => onDelete(item.drama_id || item.id)}
          showProgress={showProgress}
          progress={progress(item)}
        />
      ))}
    </div>
  );
}

function LibraryItem({ item, onClick, onDelete, showProgress, progress }) {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '12px',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      cursor: 'pointer'
    }}>
      <div style={{
        position: 'relative',
        width: '80px',
        height: '110px',
        borderRadius: '6px',
        overflow: 'hidden',
        backgroundColor: '#2a2a2a',
        flexShrink: 0
      }}>
        <OptimizedImage
          src={item.poster_url || item.cover}
          alt={item.drama_title || item.title}
          width={160}
          style={{ width: '80px', height: '110px' }}
        />
        {showProgress && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            backgroundColor: 'rgba(255,255,255,0.2)'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#e50914'
            }} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#fff',
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {item.drama_title || item.title}
        </h3>
        <p style={{ fontSize: '12px', color: '#888' }}>
          {item.total_episodes ? `${item.total_episodes} Episode` : ''}
          {item.last_watched ? ` • ${formatTime(item.last_watched)}` : ''}
        </p>
        {showProgress && (
          <p style={{ fontSize: '11px', color: '#e50914', marginTop: '4px' }}>
            Episode {item.episode_index + 1} • {Math.round(progress)}%
          </p>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{
          padding: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          alignSelf: 'center'
        }}
      >
        <TrashIcon size={18} />
      </button>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '320px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '12px' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '24px', lineHeight: '1.5' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#e50914',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function LibraryIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M8 6h8M8 12h8M8 18h4" />
    </svg>
  );
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 86400000) {
    return 'Hari ini';
  } else if (diff < 172800000) {
    return 'Kemarin';
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)} hari lalu`;
  } else {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
}
