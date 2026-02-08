import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLatest, fetchTrending, fetchDetail, fetchStream } from '../services/api';
import { getOptimizedImageUrl } from '../services/api';

export default function ForYouPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);

  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [latestRes, trendingRes] = await Promise.all([
          fetchLatest(),
          fetchTrending()
        ]);

        const allItems = [
          ...(latestRes.data || []),
          ...(trendingRes.data || [])
        ];

        const uniqueItems = allItems.reduce((acc, item) => {
          if (!acc.find(i => i.id === item.id)) {
            acc.push(item);
          }
          return acc;
        }, []);

        setItems(uniqueItems);
      } catch (error) {
        console.error('Load for you content error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, []);

  const handleScroll = useCallback((e) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const cardHeight = window.innerHeight;
    const index = Math.round(scrollTop / cardHeight);

    if (index !== currentIndex && index >= 0 && index < items.length) {
      setCurrentIndex(index);
    }
  }, [currentIndex, items.length]);

  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const onTouchMove = (e) => {
    if (touchStartY.current === null || touchStartTime.current === null) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;
    const screenHeight = window.innerHeight;

    if (Math.abs(deltaY) > screenHeight * 0.15 && deltaTime < 400) {
      touchStartY.current = null;
      touchStartTime.current = null;
    }
  };

  const onTouchEnd = () => {
    touchStartY.current = null;
    touchStartTime.current = null;
  };

  const handleNavigateToDetail = (dramaId) => {
    navigate(`/detail/${dramaId}`);
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader />
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>Memuat konten...</p>
        </div>
      </PageContainer>
    );
  }

  if (items.length === 0) {
    return (
      <PageContainer>
        <PageHeader />
        <div style={styles.emptyContainer}>
          <p style={styles.emptyText}>Tidak ada konten tersedia</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader />

      <div
        ref={scrollContainerRef}
        style={styles.scrollContainer}
        onScroll={handleScroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {items.map((item, index) => (
          <ForYouCard
            key={item.id}
            item={item}
            index={index}
            isActive={index === currentIndex}
            onNavigateToDetail={handleNavigateToDetail}
          />
        ))}
      </div>

      <div style={styles.indicatorContainer}>
        <div style={styles.indicatorText}>
          {currentIndex + 1} / {items.length}
        </div>
      </div>
    </PageContainer>
  );
}

function ForYouCard({ item, index, isActive, onNavigateToDetail }) {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState(null);
  const [firstEpisodeId, setFirstEpisodeId] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const videoTimeoutRef = useRef(null);

  useEffect(() => {
    const loadVideo = async () => {
      if (!isActive || videoUrl || videoError) return;

      try {
        const detailRes = await fetchDetail(item.id);
        if (detailRes.success && detailRes.data) {
          if (detailRes.data.episodes?.length > 0) {
            const firstEpisode = detailRes.data.episodes[0];
            setFirstEpisodeId(firstEpisode.id);
            const streamRes = await fetchStream(firstEpisode.id);
            if (streamRes.success && streamRes.url) {
              setVideoUrl(streamRes.url);
            } else {
              setVideoError(true);
            }
          } else {
            setVideoError(true);
          }
        } else {
          setVideoError(true);
        }
      } catch (err) {
        console.error('Load video error:', err);
        setVideoError(true);
      }
    };

    loadVideo();
  }, [isActive, item.id, videoUrl, videoError]);

  useEffect(() => {
    if (isActive && videoUrl && videoRef.current && !videoError) {
      videoTimeoutRef.current = setTimeout(() => {
        try {
          videoRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('Auto-play prevented:', err);
        }
      }, 500);
    }

    return () => {
      if (videoTimeoutRef.current) {
        clearTimeout(videoTimeoutRef.current);
      }
    };
  }, [isActive, videoUrl, videoError]);

  useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  const handleCardClick = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (firstEpisodeId) {
      navigate(`/player/${item.id}/${firstEpisodeId}`);
    } else {
      onNavigateToDetail(item.id);
    }
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const badge = item.source === 'trending' 
    ? { text: '🔥 Hot', color: '#e50914' }
    : { text: 'Baru', color: '#22c55e' };

  return (
    <div ref={cardRef} style={styles.cardContainer} onClick={handleCardClick}>
      <div style={styles.mediaContainer}>
        {videoUrl && !videoError ? (
          <video
            ref={videoRef}
            src={videoUrl}
            style={styles.media}
            poster={getOptimizedImageUrl(item.cover, 600)}
            loop
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <img
            src={getOptimizedImageUrl(item.cover, 600)}
            alt={item.title}
            style={{
              ...styles.media,
              opacity: videoLoaded ? 1 : 0,
            }}
            onLoad={() => setVideoLoaded(true)}
          />
        )}

        {!videoLoaded && (
          <div style={styles.imagePlaceholder}>
            <div style={styles.imagePlaceholderSpinner} />
          </div>
        )}

        <div style={styles.overlay} />
        <div style={styles.gradientOverlay} />

        {!isPlaying && (
          <div style={styles.playButtonContainer} onClick={togglePlay}>
            <div style={styles.playButton}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>
        )}

        <div style={styles.mediaBadge}>
          <span style={{ ...styles.mediaBadgeText, backgroundColor: badge.color }}>
            {badge.text}
          </span>
        </div>

        <div style={styles.rightActions}>
          <div style={styles.actionIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
            </svg>
            <span style={styles.actionCount}>{formatNumber(item.play_count || 0)}</span>
          </div>

          <div style={styles.actionIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={styles.actionCount}>{formatNumber(item.digg_count || 0)}</span>
          </div>

          <div style={styles.actionIcon} onClick={() => navigator.share?.({ title: item.title, url: window.location.href })}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
            </svg>
            <span style={styles.actionCount}>Share</span>
          </div>
        </div>

        <div style={styles.swipeHint}>
          <div style={styles.swipeLine} />
        </div>
      </div>

      <div style={styles.contentContainer}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>{item.title}</h1>
          <div style={styles.metaRow}>
            <span style={styles.metaItem}>{item.total_episodes || 0} Episode</span>
            <span style={styles.metaDot}>•</span>
            <span style={styles.metaItem}>{item.categories?.[0]?.name || 'Drama'}</span>
          </div>
        </div>

        <div style={styles.descriptionSection}>
          <p style={styles.description}>
            {item.description || 'Nikmati cerita drama yang menarik.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function PageContainer({ children }) {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>Untuk Anda</span>
        </div>
        <button
          onClick={() => navigate('/search')}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>
    </header>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 16,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#e50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  scrollContainer: {
    height: '100vh',
    overflowY: 'scroll',
    scrollSnapType: 'y mandatory',
    scrollBehavior: 'smooth',
  },
  cardContainer: {
    height: '100vh',
    width: '100%',
    scrollSnapAlign: 'start',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  indicatorContainer: {
    position: 'fixed',
    bottom: '200px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 50,
    pointerEvents: 'none',
  },
  indicatorText: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: '6px 16px',
    borderRadius: 20,
    fontSize: 12,
    color: '#fff',
    fontWeight: 500,
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  media: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease',
  },
  imagePlaceholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  imagePlaceholderSpinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#e50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gradientOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, rgba(0,0,0,0.4) 100%)',
  },
  playButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 20,
    cursor: 'pointer',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
  mediaBadge: {
    position: 'absolute',
    top: '80px',
    left: 16,
    zIndex: 10,
  },
  mediaBadgeText: {
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
  },
  rightActions: {
    position: 'absolute',
    bottom: '160px',
    right: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    zIndex: 20,
  },
  actionIcon: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    opacity: 0.9,
  },
  actionCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 600,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
  },
  swipeLine: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
  contentContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px 20px 40px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)',
    zIndex: 30,
  },
  titleSection: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 6px',
    lineHeight: 1.2,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  descriptionSection: {
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 1.5,
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 24px',
    backgroundColor: '#e50914',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    cursor: 'pointer',
  },
};

const globalStyles = document.createElement('style');
globalStyles.innerHTML = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  * {
    -webkit-tap-highlight-color: transparent;
  }
  ::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(globalStyles);
