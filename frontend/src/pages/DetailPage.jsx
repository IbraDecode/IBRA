import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDetail, addFavorite, removeFavorite, getHistory } from '../services/api';
import { SkeletonText } from '../components/LoadingSpinner';
import { FavoriteIcon, BackIcon, PlayIcon } from '../components/Icons';
import OptimizedImage, { HeroImage, usePrefetch } from '../components/OptimizedImage';

export default function DetailPage() {
  const { dramaId } = useParams();
  const navigate = useNavigate();
  const [drama, setDrama] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const prefetch = usePrefetch();
  const prefetchedCovers = useRef(new Set());

  const loadData = useCallback(async () => {
    try {
      const [detailRes, historyRes] = await Promise.all([
        fetchDetail(dramaId),
        getHistory()
      ]);

      if (detailRes.success) {
        const dramaData = detailRes.data;
        setDrama(dramaData);

        // Prefetch all episode covers
        if (dramaData.episodes) {
          dramaData.episodes.slice(0, 10).forEach(ep => {
            if (ep.cover && !prefetchedCovers.current.has(ep.cover)) {
              prefetchedCovers.current.add(ep.cover);
              prefetch(ep.cover, 120);
            }
          });
        }

        if (dramaData.age_gate >= 18) {
          setShowAgeGate(true);
          return;
        }

        const history = historyRes.data?.find(h => h.drama_id === dramaId);
        setHistoryItem(history);
      }

      const favsRes = await import('../services/api').then(m => m.getFavorites());
      const isFav = favsRes.data?.some(f => f.drama_id === dramaId);
      setIsFavorite(isFav);
    } catch (error) {
      console.error('Load detail error:', error);
    } finally {
      setLoading(false);
    }
  }, [dramaId, prefetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePlay = (episodeIndex = 0) => {
    if (!drama) return;
    const episode = drama.episodes[episodeIndex];
    if (episode) {
      navigate(`/player/${dramaId}/${episode.id}`);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavorite(dramaId);
        setIsFavorite(false);
      } else {
        await addFavorite({
          id: dramaId,
          title: drama.title,
          cover: drama.cover,
          totalEpisodes: drama.total_episodes
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const handleConfirmAge = () => {
    setShowAgeGate(false);
  };

  if (loading) {
    return (
      <PageContainer>
        <DetailHeader loading />
        <div style={{ padding: '16px' }}>
          <SkeletonText lines={4} />
          <div style={{ marginTop: '24px' }}>
            <SkeletonText lines={2} />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (showAgeGate) {
    return (
      <PageContainer>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '32px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(229, 9, 20, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2">
              <path d="M12 9v4M12 17h.01" />
              <path d="M12 2L1 21h22L12 2z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>
            Konten Dewasa
          </h2>
          <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '24px' }}>
            Drama ini mengandung konten yang hanya cocok untuk penonton berusia 18 tahun ke atas.
          </p>
          <button
            onClick={handleConfirmAge}
            style={{
              padding: '14px 32px',
              backgroundColor: '#e50914',
              border: 'none',
              borderRadius: '25px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#b20710';
              e.target.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#e50914';
              e.target.style.transform = 'scale(1)';
            }}
          >
            Saya berusia 18 tahun atau lebih
          </button>
        </div>
      </PageContainer>
    );
  }

  if (!drama) {
    return (
      <PageContainer>
        <DetailHeader loading />
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px'
        }}>
          <div style={{ textAlign: 'center', color: '#888' }}>
            Drama tidak ditemukan
          </div>
        </div>
      </PageContainer>
    );
  }

  const lastWatchedIndex = historyItem ? drama.episodes.findIndex(ep => ep.id === historyItem.episode_id) : -1;
  const startEpisodeIndex = lastWatchedIndex >= 0 ? lastWatchedIndex : 0;

  return (
    <PageContainer>
      <DetailHeader
        cover={drama.cover}
        title={drama.title}
        onBack={() => navigate(-1)}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
      />

      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
          {drama.title}
        </h1>

        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#888', marginBottom: '12px' }}>
          <span>{drama.total_episodes} Episode</span>
          <span>{drama.status === 'ongoing' ? ' ongoing' : 'Tamat'}</span>
        </div>

        <p style={{ fontSize: '14px', color: '#aaa', lineHeight: '1.6', marginBottom: '16px' }}>
          {drama.description || 'Tidak ada deskripsi'}
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {drama.categories?.slice(0, 4).map((cat, idx) => (
            <span key={cat.id || idx} style={{
              padding: '4px 10px',
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#e50914'
            }}>
              {cat.name}
            </span>
          ))}
        </div>

        <PlayButton
          onClick={() => handlePlay(startEpisodeIndex)}
          hasProgress={lastWatchedIndex >= 0}
        />
      </div>

      <div style={{ padding: '16px', paddingTop: 0 }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '12px' }}>
          Daftar Episode
        </h2>

        <EpisodeList
          episodes={drama.episodes}
          currentEpisodeId={historyItem?.episode_id}
          onSelect={(index) => handlePlay(index)}
          prefetch={prefetch}
        />
      </div>

      <div style={{ height: '80px' }} />
    </PageContainer>
  );
}

function DetailHeader({ cover, title, onBack, isFavorite, onToggleFavorite, loading }) {
  return (
    <div style={{ position: 'relative' }}>
      {!loading && cover && (
        <div style={{ width: '100%', height: '200px', position: 'relative' }}>
          <HeroImage
            src={cover}
            alt={title}
            width={800}
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #0a0a0a 10%, transparent)'
          }} />
        </div>
      )}
      <div style={{
        position: 'absolute',
        top: '48px',
        left: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <button onClick={onBack} style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', border: 'none', cursor: 'pointer', color: '#fff'
        }}>
          <BackIcon size={20} />
        </button>
        {!loading && (
          <button onClick={onToggleFavorite} style={{
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: isFavorite ? 'rgba(229, 9, 20, 0.2)' : 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', color: '#fff'
          }}>
            <FavoriteIcon filled={isFavorite} size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

function PlayButton({ onClick, hasProgress }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: '14px', backgroundColor: '#e50914', border: 'none',
      borderRadius: '25px', color: '#fff', fontSize: '15px', fontWeight: '600',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      transition: 'all 0.2s ease'
    }}>
      <PlayIcon size={18} />
      {hasProgress ? 'Lanjutkan Menonton' : 'Mulai Nonton'}
    </button>
  );
}

function EpisodeList({ episodes, currentEpisodeId, onSelect, prefetch }) {
  if (!episodes || episodes.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
        Episode belum tersedia
      </div>
    );
  }

  const handleMouseEnter = useCallback((cover) => {
    if (cover) prefetch(cover, 120);
  }, [prefetch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {episodes.map((episode) => {
        const isCurrent = episode.id === currentEpisodeId;
        return (
          <button key={episode.id} onClick={() => onSelect(episodes.indexOf(episode))} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
            backgroundColor: isCurrent ? 'rgba(201, 162, 39, 0.1)' : '#1a1a1a',
            border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left'
          }}>
            <div style={{ width: '60px', height: '80px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#2a2a2a', flexShrink: 0 }}>
              <OptimizedImage
                src={episode.cover}
                alt={episode.title}
                width={120}
                style={{ width: '60px', height: '80px' }}
                onMouseEnter={() => handleMouseEnter(episode.cover)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: isCurrent ? '#e50914' : '#fff', marginBottom: '4px' }}>
                Episode {episode.index}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {episode.title || `${episode.index} episode`}
              </div>
            </div>
            {isCurrent && (
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e50914' }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

function PageContainer({ children }) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
    }}>
      {children}
    </div>
  );
}
