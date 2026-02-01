import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLatest, fetchTrending, fetchRecommendations } from '../services/api';
import { SkeletonCard } from '../components/LoadingSpinner';
import OptimizedImage, { HeroImage, usePrefetch } from '../components/OptimizedImage';

const styles = `
  @media (min-width: 480px) {
    .drama-grid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
  }
`;

export default function HomePage() {
  const navigate = useNavigate();
  const [latest, setLatest] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const prefetch = usePrefetch();
  const containerRef = useRef(null);

  const loadContent = useCallback(async () => {
    try {
      const [latestRes, trendingRes] = await Promise.all([
        fetchLatest(),
        fetchTrending()
      ]);

      if (latestRes.success) setLatest(latestRes.data);
      if (trendingRes.success) setTrending(trendingRes.data);

      const recRes = await fetchRecommendations();
      if (recRes.success) setRecommendations(recRes.data);
    } catch (error) {
      console.error('Load content error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  // Prefetch on hover for drama cards
  const handleMouseEnter = useCallback((cover) => {
    prefetch(cover, 280);
  }, [prefetch]);

  // Prefetch hero images
  useEffect(() => {
    if (latest.length > 0) {
      latest.slice(0, 3).forEach(item => {
        prefetch(item.cover, 800);
      });
    }
  }, [latest, prefetch]);

  if (loading) {
    return (
      <PageContainer>
        <PageHeader />
        <Section title="Trending Hari Ini">
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 16px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ flexShrink: 0, width: '120px' }}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        </Section>
        <Section title="Episode Terbaru">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '0 16px', boxSizing: 'border-box', width: '100%' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </Section>
        <Section title="Rekomendasi">
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 16px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ flexShrink: 0, width: '120px' }}>
                <SkeletonCard />
              </div>
            ))}
          </div>
        </Section>
      </PageContainer>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <PageContainer>
      <PageHeader />

      <HeroCarousel items={latest} onNavigate={navigate} prefetch={prefetch} />

      <Section title="Trending Hari Ini">
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
          {trending.slice(0, 10).map(item => (
            <div key={item.id} style={{ flexShrink: 0, width: '120px' }}>
              <DramaCard 
                item={item} 
                onNavigate={navigate}
                onMouseEnter={() => handleMouseEnter(item.cover)}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Episode Terbaru">
        <div className="drama-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '8px', 
          padding: '0 16px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {latest.slice(0, 6).map(item => (
            <div key={item.id}>
              <DramaCard 
                item={item} 
                onNavigate={navigate}
                onMouseEnter={() => handleMouseEnter(item.cover)}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Rekomendasi">
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
          {recommendations.map(item => (
            <div key={item.id} style={{ flexShrink: 0, width: '120px' }}>
              <DramaCard 
                item={item} 
                onNavigate={navigate}
                onMouseEnter={() => handleMouseEnter(item.cover)}
              />
            </div>
          ))}
        </div>
      </Section>
    </PageContainer>
    </>
  );
}

function HeroCarousel({ items, onNavigate, prefetch }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  // Preload next images
  useEffect(() => {
    if (items.length > 0) {
      const nextIndex = (current + 1) % items.length;
      if (items[nextIndex]) {
        prefetch(items[nextIndex].cover, 800);
      }
    }
  }, [current, items, prefetch]);

  if (items.length === 0) return null;

  return (
    <div style={{ position: 'relative', marginBottom: '24px' }}>
      <div style={{
        position: 'relative',
        height: '220px',
        overflow: 'hidden'
      }}>
        {items.map((item, index) => (
          <div
            key={item.id}
            onClick={() => onNavigate(`/detail/${item.id}`)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: index === current ? 1 : 0,
              transition: 'opacity 0.5s ease',
              cursor: 'pointer'
            }}
          >
            <HeroImage
              src={item.cover}
              alt={item.title}
              width={800}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                inset: 0
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, #0a0a0a 0%, transparent 50%)'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '16px',
              right: '16px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#fff',
                marginBottom: '4px',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
              }}>
                {item.title}
              </h2>
              <p style={{
                fontSize: '12px',
                color: '#aaa',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '6px',
        padding: '12px'
      }}>
        {items.map((_, index) => (
          <div
            key={index}
            style={{
              width: index === current ? '20px' : '6px',
              height: '6px',
              borderRadius: '3px',
              backgroundColor: index === current ? '#e50914' : '#333',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onClick={() => setCurrent(index)}
          />
        ))}
      </div>
    </div>
  );
}

function DramaCard({ item, onNavigate, onMouseEnter }) {
  return (
    <div
      onClick={() => onNavigate(`/detail/${item.id}`)}
      onMouseEnter={onMouseEnter}
      style={{
        width: '100%',
        cursor: 'pointer'
      }}
    >
      <OptimizedImage
        src={item.cover}
        alt={item.title}
        width={120}
        style={{
          borderRadius: '8px',
          overflow: 'hidden',
          aspectRatio: '2/3',
          width: '100%'
        }}
      />
      <h3 style={{
        fontSize: '12px',
        fontWeight: '600',
        color: '#fff',
        marginTop: '6px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {item.title}
      </h3>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        marginBottom: '12px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#fff',
          margin: 0
        }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function PageContainer({ children }) {
  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      paddingBottom: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
    }}>
      {children}
    </div>
  );
}

function PageHeader() {
  const navigate = useNavigate();

  return (
    <header style={{
      padding: '16px',
      position: 'sticky',
      top: 0,
      backgroundColor: 'rgba(10, 10, 10, 0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 10,
      borderBottom: '1px solid #1a1a1a'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/logo.png"
            alt="IBRA"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px'
            }}
          />
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>BRA</h1>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif' }}>ndustri Bioskop Romansa Asia</div>
          </div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          const query = e.target.query.value.trim();
          if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
        }} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              name="query"
              type="text"
              placeholder="Cari drama..."
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '24px',
                padding: '12px 16px 12px 44px',
                color: '#fff',
                width: '100%',
                outline: 'none',
                transition: 'all 0.2s ease',
                fontSize: '14px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#e50914';
                e.target.style.boxShadow = '0 0 0 2px rgba(229, 9, 20, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#333';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </form>
      </div>
    </header>
  );
}
