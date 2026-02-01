import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStream, reportProgress, fetchDetail } from '../services/api';

export default function PlayerPage() {
  const { dramaId, episodeId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);
  const fastForwardRef = useRef(null);
  const isVideoEndedRef = useRef(false);

  const [drama, setDrama] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streamUrl, setStreamUrl] = useState('');
  const [error, setError] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const touchStartTime = useRef(null);
  const lastTapTime = useRef(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isNavigating) setShowUI(false);
    }, 3000);
  }, [isNavigating]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (fastForwardRef.current) clearTimeout(fastForwardRef.current);
    };
  }, [scheduleHide]);

  useEffect(() => {
    isVideoEndedRef.current = false;
    setIsNavigating(false);
    setShowUI(true);
    setStreamUrl('');
    setError(null);

    const loadEpisodeData = async () => {
      try {
        const detailRes = await fetchDetail(dramaId);
        if (detailRes.success) {
          setDrama(detailRes.data);
          const idx = detailRes.data.episodes?.findIndex(e => e.id === episodeId);
          if (idx >= 0) {
            setCurrentIndex(idx);
            try {
              const streamRes = await fetchStream(episodeId);
              if (streamRes.success && streamRes.url) {
                setStreamUrl(streamRes.url);
              } else {
                setError('Video tidak tersedia');
              }
            } catch {
              setError('Gagal memuat video');
            }
          } else {
            setError('Episode tidak ditemukan');
          }
        } else {
          setError('Gagal memuat detail');
        }
      } catch {
        setError('Gagal memuat episode');
      }
    };

    loadEpisodeData();
  }, [dramaId, episodeId]);

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = streamUrl;
      videoRef.current.load();
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [streamUrl]);

  const handleVideoEnded = useCallback(() => {
    if (!drama || isVideoEndedRef.current) return;
    isVideoEndedRef.current = true;

    setIsPlaying(false);

    if (currentIndex < drama.episodes.length - 1) {
      setIsNavigating(true);
      const nextEp = drama.episodes[currentIndex + 1];

      setTimeout(() => {
        navigate(`/player/${dramaId}/${nextEp.id}`, { replace: true });
      }, 500);
    }
  }, [drama, currentIndex, navigate, dramaId]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
      setShowUI(true);
      scheduleHide();
    }
  }, [isPlaying, scheduleHide]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      if (total > 0) {
        setProgress((curr / total) * 100);
        reportProgress(dramaId, episodeId, curr, currentIndex);
      }
    }
  }, [dramaId, episodeId, currentIndex]);

  const handleSeek = useCallback((e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pct * videoRef.current.duration;
      setShowUI(true);
      scheduleHide();
    }
  }, [scheduleHide]);

  const changeSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
    setShowUI(true);
    scheduleHide();
  }, [scheduleHide]);

  const goToEpisode = useCallback((index) => {
    if (drama && drama.episodes[index] && !isNavigating) {
      isVideoEndedRef.current = true;
      setIsNavigating(true);
      navigate(`/player/${dramaId}/${drama.episodes[index].id}`, { replace: true });
    }
  }, [drama, navigate, dramaId, isNavigating]);

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      touchStartTime.current = Date.now();
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length > 1) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartY.current;
    const deltaX = currentX - touchStartX.current;
    const deltaTime = Date.now() - touchStartTime.current;

    const screenHeight = window.innerHeight;

    if (Math.abs(deltaY) > screenHeight * 0.05 && deltaTime < 400) {
      if (deltaY < 0 && currentIndex < drama?.episodes?.length - 1) {
        goToEpisode(currentIndex + 1);
      } else if (deltaY > 0 && currentIndex > 0) {
        goToEpisode(currentIndex - 1);
      }
      touchStartY.current = null;
      touchStartX.current = null;
      return;
    }

    if (Math.abs(deltaY) > 30 && Math.abs(deltaY) > Math.abs(deltaX * 0.5)) {
      if (e.touches[0].clientX > window.innerWidth * 0.4) {
        const newVol = Math.max(0, Math.min(1, volume - deltaY / 150));
        setVolume(newVol);
        if (videoRef.current) videoRef.current.volume = newVol;
      }
      setShowUI(true);
      scheduleHide();
    }
  };

  const onTouchEnd = () => {
    touchStartY.current = null;
    touchStartX.current = null;
    touchStartTime.current = null;
    if (fastForwardRef.current) {
      clearTimeout(fastForwardRef.current);
      if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
    }
  };

  const onClick = (e) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const screenW = rect.width;
    const third = screenW / 3;

    if (now - lastTapTime.current < 250) {
      if (x < third || x > third * 2) {
        if (videoRef.current) {
          const speed = x < third ? 0.5 : 2;
          if (videoRef.current.playbackRate !== speed) {
            videoRef.current.playbackRate = speed;
            setShowUI(true);
            fastForwardRef.current = setTimeout(() => {
              if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
            }, 300);
          }
        }
      } else {
        togglePlay();
      }
    } else {
      setShowUI(prev => !prev);
      if (!showUI) scheduleHide();
    }
    lastTapTime.current = now;
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryBtn} onClick={() => navigate(-1)}>Kembali</button>
        </div>
      </div>
    );
  }

  if (!drama || !streamUrl) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  const episode = drama?.episodes?.[currentIndex];

  return (
    <div style={styles.container} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={onClick}>
      <video
        ref={videoRef}
        style={styles.video}
        playsInline
        onEnded={handleVideoEnded}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsPlaying(false)}
        onPlaying={() => setIsPlaying(true)}
      />

      {isNavigating && (
        <div style={styles.transitionOverlay}>
          <div style={styles.loadingSpinner} />
          <div style={styles.transitionText}>Memuat Episode...</div>
        </div>
      )}

      <div style={styles.watermarkCenter}>
        <span style={styles.watermarkText}>IBRA</span>
        <span style={styles.watermarkSub}>By Ibra Decode</span>
      </div>

      <img src="/logo.png" alt="IBRA" style={styles.logoCorner} />

      {!isPlaying && !isNavigating && (
        <div style={styles.centerContent}>
          <div style={styles.playBtnCircle}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 4 }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {showUI && (
        <>
          <div style={styles.topBar}>
            <button style={styles.backBtn} onClick={(e) => { e.stopPropagation(); navigate(-1); }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </button>
            <div style={styles.epInfo}>
              <div style={styles.epTitle}>{episode?.title || `Episode ${currentIndex + 1}`}</div>
              <div style={styles.epMeta}>{currentIndex + 1} / {drama?.episodes?.length || 0}</div>
            </div>
            <button style={styles.moreBtn} onClick={(e) => { e.stopPropagation(); navigate(`/detail/${dramaId}`); }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>

          <div style={styles.bottomBar}>
            <div style={styles.progressRow} onClick={handleSeek}>
              <div style={styles.progressBg}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
            </div>

            <div style={styles.controlsRow}>
              <button style={styles.speedBtn} onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); setShowUI(true); scheduleHide(); }}>
                {playbackSpeed}x
              </button>

              <div style={styles.episodeIndicator}>
                <span style={styles.episodeCurrent}>{currentIndex + 1}</span>
                <span style={styles.episodeDivider}>/</span>
                <span style={styles.episodeTotal}>{drama?.episodes?.length}</span>
              </div>

              <div style={styles.volumeControl}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
                <div style={styles.volumeBar}>
                  <div style={{ ...styles.volumeFill, width: `${volume * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showSpeedMenu && (
        <div style={styles.speedMenu} onClick={() => setShowSpeedMenu(false)}>
          <div style={styles.speedMenuInner} onClick={e => e.stopPropagation()}>
            <div style={styles.speedMenuHeader}>Kecepatan</div>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
              <button key={s} style={{ ...styles.speedOption, backgroundColor: playbackSpeed === s ? 'rgba(229,9,20,0.4)' : 'transparent', color: playbackSpeed === s ? '#e50914' : '#fff' }} onClick={() => changeSpeed(s)}>
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
    touchAction: 'none',
    WebkitTouchCallout: 'none',
    userSelect: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#e50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  transitionOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 10,
  },
  transitionText: {
    color: '#fff',
    fontSize: 14,
  },
  centerContent: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnCircle: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 16,
    textAlign: 'center',
    padding: '0 32px',
  },
  retryBtn: {
    padding: '12px 32px',
    backgroundColor: '#e50914',
    border: 'none',
    borderRadius: 24,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  watermarkCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    opacity: 0.05,
    pointerEvents: 'none',
  },
  watermarkText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 12,
  },
  watermarkSub: {
    fontSize: 16,
    color: '#fff',
    marginTop: 4,
    letterSpacing: 3,
  },
  logoCorner: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    objectFit: 'contain',
    zIndex: 10,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '16px 20px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
    display: 'flex',
    alignItems: 'center',
    zIndex: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  epInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  epTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
  },
  epMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 4,
  },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px 24px 28px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
    zIndex: 20,
  },
  progressRow: {
    marginBottom: 20,
  },
  progressBg: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    cursor: 'pointer',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e50914',
    borderRadius: 3,
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  episodeIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  episodeCurrent: {
    color: '#e50914',
    fontSize: 20,
    fontWeight: 700,
  },
  episodeDivider: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  },
  episodeTotal: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  volumeControl: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  volumeBar: {
    width: 70,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  speedMenu: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  speedMenuInner: {
    backgroundColor: 'rgba(25,25,25,0.95)',
    borderRadius: 16,
    padding: '8px 8px',
    minWidth: 160,
  },
  speedMenuHeader: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  speedOption: {
    border: 'none',
    padding: '14px 24px',
    fontSize: 16,
    cursor: 'pointer',
    textAlign: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
};
