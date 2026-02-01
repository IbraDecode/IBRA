import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDetail, fetchStream, reportProgress, saveToHistory, getHistory } from '../services/api';
import { AppContext } from '../App';

export default function PlayerPage() {
  const { dramaId, episodeId } = useParams();
  const navigate = useNavigate();
  const { preferences } = useContext(AppContext);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [drama, setDrama] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [buffering, setBuffering] = useState(false);

  const controlsTimeoutRef = useRef(null);
  const progressReportRef = useRef(null);

  useEffect(() => {
    loadContent();
  }, [dramaId, episodeId]);

  useEffect(() => {
    if (videoRef.current && streamUrl) {
      videoRef.current.src = streamUrl;
      videoRef.current.playbackRate = playbackRate;
    }
  }, [streamUrl, playbackRate]);

  useEffect(() => {
    if (preferences.autoPlay) {
      handlePlay();
    }
  }, [episodeId]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const [detailRes, streamRes, historyRes] = await Promise.all([
        fetchDetail(dramaId),
        fetchStream(episodeId),
        getHistory()
      ]);

      if (detailRes.success) {
        setDrama(detailRes.data);
        const ep = detailRes.data.episodes?.find(e => e.id === episodeId);
        setEpisode(ep);

        if (historyRes.data) {
          const history = historyRes.data.find(h => h.drama_id === dramaId);
          if (history?.progress_seconds) {
            setCurrentTime(history.progress_seconds);
          }
        }
      }

      if (streamRes.success) {
        setStreamUrl(streamRes.url);
      }
    } catch (err) {
      console.error('Load content error:', err);
      setError('Gagal memuat video');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (!videoRef.current) return;

    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    clearTimeout(progressReportRef.current);
    progressReportRef.current = setTimeout(() => {
      reportProgress(dramaId, episodeId, time, episode?.index || 0);
    }, 5000);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;

    setDuration(videoRef.current.duration);
    if (currentTime > 0) {
      videoRef.current.currentTime = currentTime;
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    autoNextEpisode();
  };

  const autoNextEpisode = async () => {
    if (!drama || !episode) return;

    const currentIndex = drama.episodes.findIndex(ep => ep.id === episodeId);
    if (currentIndex < drama.episodes.length - 1) {
      const nextEpisode = drama.episodes[currentIndex + 1];
      await saveToHistory({
        id: dramaId,
        title: drama.title,
        cover: drama.cover,
        currentEpisodeId: nextEpisode.id,
        currentEpisodeIndex: nextEpisode.index,
        progress: 0
      });

      setTimeout(() => {
        navigate(`/player/${dramaId}/${nextEpisode.id}`, { replace: true });
      }, 2000);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleDoubleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const middle = rect.width / 2;

    if (videoRef.current) {
      if (clickX > middle) {
        videoRef.current.currentTime += 10;
      } else {
        videoRef.current.currentTime -= 10;
      }
    }
  };

  const handleHold = (direction) => {
    if (!videoRef.current) return;

    const step = direction === 'right' ? 0.1 : -0.1;
    const targetRate = direction === 'right' ? 2.0 : 0.5;

    if (playbackRate === targetRate) {
      setPlaybackRate(1.0);
    } else {
      setPlaybackRate(targetRate);
    }
  };

  const handleSwipe = (e, type) => {
    if (!videoRef.current) return;

    const delta = e.deltaY || 0;
    if (Math.abs(delta) < 10) return;

    if (type === 'volume') {
      const newVolume = Math.max(0, Math.min(1, volume - delta / 200));
      setVolume(newVolume);
      videoRef.current.volume = newVolume;
    } else if (type === 'brightness') {
      const newBrightness = Math.max(0.2, Math.min(1, brightness - delta / 200));
      setBrightness(newBrightness);
      document.documentElement.style.filter = `brightness(${newBrightness})`;
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    resetControlsTimeout();
  };

  const resetControlsTimeout = () => {
    clearTimeout(controlsTimeoutRef.current);
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const handlePrevious = () => {
    if (!drama || !episode) return;

    const currentIndex = drama.episodes.findIndex(ep => ep.id === episodeId);
    if (currentIndex > 0) {
      const prevEpisode = drama.episodes[currentIndex - 1];
      navigate(`/player/${dramaId}/${prevEpisode.id}`, { replace: true });
    }
  };

  const handleNext = () => {
    if (!drama || !episode) return;

    const currentIndex = drama.episodes.findIndex(ep => ep.id === episodeId);
    if (currentIndex < drama.episodes.length - 1) {
      const nextEpisode = drama.episodes[currentIndex + 1];
      navigate(`/player/${dramaId}/${nextEpisode.id}`, { replace: true });
    }
  };

  useEffect(() => {
    return () => {
      if (currentTime > 5) {
        reportProgress(dramaId, episodeId, currentTime, episode?.index || 0);
      }
      document.documentElement.style.filter = 'none';
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
      }}>
        <div className="spinner" style={{
          width: '48px',
          height: '48px',
          border: '3px solid #333',
          borderTopColor: '#e50914',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#666', marginTop: '16px' }}>Memuat video...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '32px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
      }}>
        <p style={{ color: '#ff4444', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={() => navigate(`/detail/${dramaId}`)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#e50914',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Kembali ke Detail
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={toggleControls}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <video
        ref={videoRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onClick={handlePlay}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
        playsInline
        preload="metadata"
      />

      <Watermark />

      {buffering && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '48px',
          height: '48px',
          border: '3px solid rgba(255,255,255,0.2)',
          borderTopColor: '#e50914',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      )}

      <PlayerControls
        show={showControls}
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        playbackRate={playbackRate}
        showSpeedMenu={showSpeedMenu}
        dramaTitle={drama?.title}
        episodeTitle={episode?.title}
        episodeIndex={episode?.index}
        totalEpisodes={drama?.total_episodes}
        onPlay={handlePlay}
        onSeek={handleSeek}
        onSeekForward={() => videoRef.current && (videoRef.current.currentTime += 10)}
        onSeekBackward={() => videoRef.current && (videoRef.current.currentTime -= 10)}
        onSpeed={() => setShowSpeedMenu(!showSpeedMenu)}
        onSpeedChange={handleSpeedChange}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onClose={() => navigate(`/detail/${dramaId}`)}
        formatTime={formatTime}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Watermark() {
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      opacity: 0.6,
      zIndex: 50,
      pointerEvents: 'none'
    }}>
      <img src="/logo.png" alt="IBRA" style={{ width: '32px', height: '32px' }} />
    </div>
  );
}

function PlayerControls({
  show,
  playing,
  currentTime,
  duration,
  playbackRate,
  showSpeedMenu,
  dramaTitle,
  episodeTitle,
  episodeIndex,
  totalEpisodes,
  onPlay,
  onSeek,
  onSeekForward,
  onSeekBackward,
  onSpeed,
  onSpeedChange,
  onPrevious,
  onNext,
  onClose,
  formatTime
}) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: show ? 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.8) 100%)' : 'none',
      transition: 'background 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px',
      zIndex: 100
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        <button onClick={onClose} style={{ padding: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div style={{ textAlign: 'center', flex: 1, padding: '0 16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{dramaTitle}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>Episode {episodeIndex} / {totalEpisodes}</div>
        </div>
        <div style={{ width: '40px' }} />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        <button onClick={onPrevious} style={{ padding: '8px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>
        <button onClick={onSeekBackward} style={{ padding: '8px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            <text x="12" y="15" fontSize="7" textAnchor="middle" fill="#fff">10</text>
          </svg>
        </button>
        <button onClick={onPlay} style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#e50914',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {playing ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#000">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#000">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <button onClick={onSeekForward} style={{ padding: '8px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff">
            <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            <text x="12" y="15" fontSize="7" textAnchor="middle" fill="#fff">10</text>
          </svg>
        </button>
        <button onClick={onNext} style={{ padding: '8px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      <div style={{
        opacity: show ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '12px', color: '#aaa', minWidth: '45px' }}>{formatTime(currentTime)}</span>
          <div
            onClick={onSeek}
            style={{
              flex: 1,
              height: '4px',
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: '2px',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progress}%`,
              backgroundColor: '#e50914',
              borderRadius: '2px'
            }} />
            <div style={{
              position: 'absolute',
              left: `${progress}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              backgroundColor: '#e50914',
              borderRadius: '50%'
            }} />
          </div>
          <span style={{ fontSize: '12px', color: '#aaa', minWidth: '45px' }}>{formatTime(duration)}</span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={onSpeed}
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            {playbackRate}x
          </button>
          <span style={{ fontSize: '12px', color: '#888' }}>{episodeTitle || `Episode ${episodeIndex}`}</span>
          <div style={{ width: '50px' }} />
        </div>
      </div>

      {showSpeedMenu && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.9)',
          borderRadius: '8px',
          padding: '8px 0',
          minWidth: '120px'
        }}>
          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: playbackRate === speed ? 'rgba(201, 162, 39, 0.2)' : 'transparent',
                border: 'none',
                color: playbackRate === speed ? '#e50914' : '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
