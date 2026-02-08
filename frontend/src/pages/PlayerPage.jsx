import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStream, reportProgress, fetchDetail, getOptimizedImageUrl } from '../services/api';
import { usePrefetch } from '../components/OptimizedImage';

function useThrottledCallback(callback, delay) {
  const lastCallRef = useRef(0);
  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      callback(...args);
      lastCallRef.current = now;
    }
  }, [callback, delay]);
}

function updateSEO({ title, description, image, episode, drama }) {
  if (!drama) return;

  const fullTitle = `${drama.title} - Episode ${episode?.index || 1} | IBRA`;
  const fullDesc = description || drama.description?.slice(0, 160) || `Nonton ${drama.title} episode ${episode?.index || 1} secara gratis di IBRA. Drama Asia berkualitas tinggi dengan subtitle Indonesia.`;
  const shareImage = image || episode?.cover || drama.cover || '';
  const pageUrl = window.location.href;

  document.title = fullTitle;

  const metaTags = {
    description: fullDesc,
    'og:title': fullTitle,
    'og:description': fullDesc,
    'og:image': shareImage,
    'og:image:width': '800',
    'og:image:height': '450',
    'og:image:alt': `${drama.title} - Episode ${episode?.index || 1}`,
    'og:url': pageUrl,
    'og:type': 'video.episode',
    'og:site_name': 'IBRA',
    'og:locale': 'id_ID',
    'twitter:card': 'summary_large_image',
    'twitter:site': '@ibradecode',
    'twitter:creator': '@ibradecode',
    'twitter:title': fullTitle,
    'twitter:description': fullDesc,
    'twitter:image': shareImage,
    'twitter:image:alt': `${drama.title} Episode`,
  };

  Object.entries(metaTags).forEach(([name, content]) => {
    if (!content) return;
    let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      if (name.startsWith('og:') || name.startsWith('twitter:')) {
        meta.setAttribute('property', name);
      } else {
        meta.setAttribute('name', name);
      }
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  });

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', pageUrl);
  }
}

function generateStructuredData({ drama, episode, currentIndex }) {
  if (!drama) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: `${drama.title} - Episode ${episode?.index || 1}`,
    alternativeHeadline: `${drama.title} Episode ${episode?.index || 1}`,
    description: drama.description?.slice(0, 500) || `Episode ${episode?.index || 1} dari drama ${drama.title}`,
    thumbnailUrl: episode?.cover || drama.cover || '',
    duration: episode?.duration ? `PT${Math.floor(episode.duration / 60)}M${episode.duration % 60}S` : '',
    uploadDate: new Date().toISOString(),
    contentUrl: window.location.href,
    embedUrl: window.location.href,
    accessibleForFree: 'https://schema.org/True',
    interactionType: {
      '@type': 'WatchAction',
      name: 'Watch Episode',
    },
    partOfSeries: {
      '@type': 'TVSeries',
      '@id': `https://ibra.biz.id/detail/${drama.id}`,
      name: drama.title,
      description: drama.description?.slice(0, 300) || '',
      numberOfEpisodes: drama.total_episodes,
      episodeNumber: episode?.index || 1,
      image: drama.cover || '',
    },
    creator: {
      '@type': 'Organization',
      name: 'IBRA Decode',
      url: 'https://ibra.biz.id',
    },
    producer: {
      '@type': 'Organization',
      name: 'IBRA',
      url: 'https://ibra.biz.id',
    },
    genre: drama.categories?.map(c => c.name) || ['Drama Asia'],
    keywords: `${drama.title}, episode ${episode?.index || 1}, drama ${drama.categories?.[0]?.name || 'asia'}, streaming gratis`,
  };
}

function generateBreadcrumbSchema({ drama, episode, currentIndex }) {
  if (!drama) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://ibra.biz.id/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: drama.title.length > 30 ? drama.title.slice(0, 30) + '...' : drama.title,
        item: `https://ibra.biz.id/detail/${drama.id}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `Episode ${episode?.index || currentIndex + 1}`,
        item: window.location.href,
      },
    ],
  };
}

function updateStructuredData({ drama, episode, currentIndex }) {
  const existingScript = document.querySelector('script[type="application/ld+json"].dynamic-seo');
  
  const videoSchema = generateStructuredData({ drama, episode, currentIndex });
  const breadcrumbSchema = generateBreadcrumbSchema({ drama, episode, currentIndex });

  const combinedSchema = {
    '@graph': [videoSchema, breadcrumbSchema].filter(Boolean),
  };

  if (existingScript) {
    existingScript.textContent = JSON.stringify(combinedSchema, null, 2);
  } else {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.className = 'dynamic-seo';
    script.textContent = JSON.stringify(combinedSchema, null, 2);
    document.head.appendChild(script);
  }
}

export default function PlayerPage() {
  const { dramaId, episodeId } = useParams();
  const navigate = useNavigate();
  const prefetchImage = usePrefetch();

  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);
  const isVideoEndedRef = useRef(false);
  const styleSheetRef = useRef(null);
  const prefetchedThumbnails = useRef(new Set());
  const episodeThumbnails = useRef({});
  const videoEndedTimeoutRef = useRef(null);

  const [drama, setDrama] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streamUrl, setStreamUrl] = useState('');
  const [error, setError] = useState(null);
  const [currentThumbnail, setCurrentThumbnail] = useState(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [initialThumbError, setInitialThumbError] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [isHoldingSpeed, setIsHoldingSpeed] = useState(false);
  const [showTapHint, setShowTapHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
  const touchStartTime = useRef(null);
  const lastTapTime = useRef(0);
  const holdTimerRef = useRef(null);
  const originalSpeedRef = useRef(1);
  const isHoldTriggeredRef = useRef(false);
  const isSpeedChangedRef = useRef(false);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(styleSheet);
    styleSheetRef.current = styleSheet;

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (styleSheetRef.current) {
        document.head.removeChild(styleSheetRef.current);
      }
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (videoEndedTimeoutRef.current) clearTimeout(videoEndedTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (showEpisodeList || showSpeedMenu) {
      document.body.style.overflow = 'hidden';
    }
  }, [showEpisodeList, showSpeedMenu]);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isNavigating && !showSpeedMenu && !showEpisodeList && !isDragging && isPlaying) {
        setShowUI(false);
      }
    }, 3000);
  }, [isNavigating, showSpeedMenu, showEpisodeList, isDragging, isPlaying]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [scheduleHide]);

  useEffect(() => {
    isVideoEndedRef.current = false;
    setIsNavigating(false);
    setShowUI(true);
    setStreamUrl('');
    setError(null);
    setPlaybackFailed(false);
    setThumbnailError(false);
    setInitialThumbError(false);

    const loadEpisodeData = async () => {
      try {
        const detailRes = await fetchDetail(dramaId);
        if (detailRes.success) {
          const dramaData = detailRes.data;
          setDrama(dramaData);

          const idx = dramaData.episodes?.findIndex(e => e.id === episodeId);
          if (idx >= 0) {
            setCurrentIndex(idx);

            const currentEp = dramaData.episodes[idx];
            if (currentEp?.cover && !initialThumbError) {
              setCurrentThumbnail(currentEp.cover);
            }

            dramaData.episodes.forEach((ep, epIdx) => {
              episodeThumbnails.current[epIdx] = ep.cover || null;
              if (ep.cover && !prefetchedThumbnails.current.has(ep.cover)) {
                prefetchedThumbnails.current.add(ep.cover);
                prefetchImage(ep.cover, 400);
              }
            });

            updateSEO({
              title: null,
              description: null,
              image: null,
              episode: currentEp,
              drama: dramaData,
            });

            updateStructuredData({
              drama: dramaData,
              episode: currentEp,
              currentIndex: idx,
            });

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
  }, [dramaId, episodeId, prefetchImage]);

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setPlaybackFailed(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setPlaybackFailed(true);
          showToast('Tap untuk memutar');
        });
    }
  }, [streamUrl]);

  const throttledReportProgress = useThrottledCallback((dramaId, episodeId, curr, currentIndex) => {
    reportProgress(dramaId, episodeId, curr, currentIndex);
  }, 5000);

  const handleVideoEnded = useCallback(() => {
    if (!drama || isVideoEndedRef.current) return;
    isVideoEndedRef.current = true;

    setIsPlaying(false);

    if (currentIndex < drama.episodes.length - 1) {
      setIsNavigating(true);
      const nextEp = drama.episodes[currentIndex + 1];

      if (nextEp?.cover) {
        setCurrentThumbnail(nextEp.cover);
        setThumbnailError(false);
      }

      videoEndedTimeoutRef.current = setTimeout(() => {
        navigate(`/player/${dramaId}/${nextEp.id}`, { replace: true });
      }, 300);
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
        throttledReportProgress(dramaId, episodeId, curr, currentIndex);
      }
    }
  }, [dramaId, episodeId, currentIndex, throttledReportProgress]);

  useEffect(() => {
    if (drama && drama.episodes[currentIndex]) {
      const currentEp = drama.episodes[currentIndex];
      updateSEO({
        title: null,
        description: null,
        image: null,
        episode: currentEp,
        drama: drama,
      });
      updateStructuredData({
        drama: drama,
        episode: currentEp,
        currentIndex: currentIndex,
      });
    }
  }, [drama, currentIndex]);

  const handleSeek = useCallback((e) => {
    if (videoRef.current && videoRef.current.duration) {
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
      const nextEp = drama.episodes[index];
      if (nextEp?.cover) {
        setCurrentThumbnail(nextEp.cover);
        setThumbnailError(false);
      }
      isVideoEndedRef.current = true;
      setIsNavigating(true);
      navigate(`/player/${dramaId}/${drama.episodes[index].id}`, { replace: true });
    }
  }, [drama, navigate, dramaId, isNavigating]);

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const screenW = window.innerWidth;
      const touchX = e.touches[0].clientX;
      
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = touchX;
      touchStartTime.current = Date.now();
      isHoldTriggeredRef.current = false;
      isSpeedChangedRef.current = false;
      setIsDragging(false);

      if (touchX > screenW * 0.65) {
        holdTimerRef.current = setTimeout(() => {
          if (videoRef.current) {
            originalSpeedRef.current = playbackSpeed;
            videoRef.current.playbackRate = 2;
          }
          isHoldTriggeredRef.current = true;
          isSpeedChangedRef.current = true;
          setIsHoldingSpeed(true);
          showToast('2x CEPAT');
        }, 300);
      }
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length > 1) return;

    if (touchStartY.current === null || touchStartTime.current === null) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);

    const screenHeight = window.innerHeight;

    if (deltaX > 40) {
      touchStartY.current = null;
      touchStartTime.current = null;
      return;
    }

    if (Math.abs(deltaY) > screenHeight * 0.04 && deltaTime < 400) {
      setIsDragging(true);
      if (deltaY < 0 && currentIndex < drama?.episodes?.length - 1) {
        goToEpisode(currentIndex + 1);
      } else if (deltaY > 0 && currentIndex > 0) {
        goToEpisode(currentIndex - 1);
      }
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      touchStartY.current = null;
      touchStartTime.current = null;
    }
  };

  const onTouchEnd = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    if (isSpeedChangedRef.current && videoRef.current) {
      videoRef.current.playbackRate = originalSpeedRef.current;
    }
    setIsHoldingSpeed(false);
    touchStartY.current = null;
    touchStartX.current = null;
    touchStartTime.current = null;
    isHoldTriggeredRef.current = false;
    isSpeedChangedRef.current = false;
    setIsDragging(false);
  };

  const onClick = (e) => {
    if (isHoldTriggeredRef.current || isDragging) return;

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const screenW = rect.width;
    const isInHoldZone = x > screenW * 0.65;
    const isInLeftZone = x < screenW * 0.35;
    const isInCenterZone = !isInLeftZone && !isInHoldZone;

    const timeSinceLastTap = now - lastTapTime.current;

    if (timeSinceLastTap < 300) {
      if (videoRef.current) {
        if (isInLeftZone) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          showToast('<< 10s');
        } else if (isInHoldZone) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          showToast('10s >>');
        } else if (isInCenterZone && isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
          showToast('PAUSED');
        }
      }
    } else {
      if (isInHoldZone) {
        if (now - touchStartTime.current < 300) {
          setShowTapHint(true);
          showToast('Hold: 2x');
          setTimeout(() => setShowTapHint(false), 1000);
        }
        return;
      }
      togglePlay();
      setShowUI(true);
      scheduleHide();
    }
    lastTapTime.current = now;
  };

  const showToast = (message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(message);
    toastTimeoutRef.current = setTimeout(() => setToastMsg(''), 800);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryBtn} onClick={() => navigate(-1)}>Kembali</button>
        </div>
      </div>
    );
  }

  if (!drama) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingScreen}>
          <div style={styles.imagePlaceholder}>
            <div style={styles.imagePlaceholderSpinner} />
          </div>
        </div>
      </div>
    );
  }

  if (!streamUrl) {
    const thumbToShow = currentThumbnail || drama?.episodes?.[currentIndex]?.cover;
    return (
      <div style={styles.container}>
        <div style={styles.loadingScreen}>
          {thumbToShow ? (
            <>
              <img
                src={getOptimizedImageUrl(thumbToShow, 800)}
                alt=""
                style={styles.media}
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
              <div style={styles.overlay} />
              <div style={styles.playButtonOverlay}>
                <div style={styles.playButtonCircle}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div style={styles.imagePlaceholder}>
              <div style={styles.imagePlaceholderSpinner} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const episode = drama?.episodes?.[currentIndex];

  return (
    <div style={styles.container} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={onClick}>
      <video
        ref={videoRef}
        src={streamUrl || undefined}
        style={styles.video}
        playsInline
        onEnded={handleVideoEnded}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsPlaying(false)}
        onPlaying={() => setIsPlaying(true)}
        onError={() => {
          setPlaybackFailed(true);
          setError('Video tidak dapat diputar');
        }}
      />

      {isNavigating && (
        <div style={styles.transitionOverlay}>
          {currentThumbnail && !thumbnailError ? (
            <img 
              src={getOptimizedImageUrl(currentThumbnail, 600)} 
              alt="Next episode"
              style={styles.transitionImg}
            />
          ) : (
            <div style={styles.loadingSpinner} />
          )}
          <div style={styles.transitionText}>Episode {currentIndex + 2}</div>
        </div>
      )}

      <div style={styles.watermarkCenter}>
        <span style={styles.watermarkText}>IBRA</span>
        <span style={styles.watermarkSub}>By Ibra Decode</span>
      </div>

      {toastMsg && !isHoldingSpeed && (
        <div style={styles.toast}>{toastMsg}</div>
      )}

      {isHoldingSpeed && (
        <div style={styles.speedBadge}>2x</div>
      )}

      {showTapHint && (
        <div style={styles.tapHint}>Hold: 2x</div>
      )}

      {showUI && (
        <>
          <button style={styles.backButton} onClick={(e) => { e.stopPropagation(); navigate(-1); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>

          {!isPlaying && (
            <div style={styles.playButtonOverlay}>
              <div style={styles.playButtonCircle}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
          </div>
          )}

          <div style={styles.rightActions}>
            <div style={styles.actionIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
              </svg>
              <span style={styles.actionCount}>{formatNumber(drama?.play_count || 0)}</span>
            </div>

            <div style={styles.actionIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={styles.actionCount}>{formatNumber(drama?.digg_count || 0)}</span>
            </div>

            <div style={styles.actionIcon} onClick={(e) => { e.stopPropagation(); navigator.share?.({ title: drama?.title, url: window.location.href }); }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
              </svg>
              <span style={styles.actionCount}>Share</span>
            </div>

            <div style={styles.actionIcon} onClick={(e) => { e.stopPropagation(); navigate(`/detail/${dramaId}`); }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
              </svg>
              <span style={styles.actionCount}>Daftar</span>
            </div>
          </div>

          <div style={styles.contentContainer}>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>{drama?.title}</h1>
              <div style={styles.metaRow}>
                <span style={styles.metaItem}>{episode?.title || `Episode ${currentIndex + 1}`}</span>
                <span style={styles.metaDot}>•</span>
                <span style={styles.metaItem}>{drama?.categories?.[0]?.name || 'Drama'}</span>
              </div>
            </div>

            <div style={styles.descriptionSection}>
              <p style={styles.description}>
                {drama?.description?.slice(0, 120) || 'Nikmati cerita drama yang menarik dan mengharukan.'}
                {(drama?.description?.length || 0) > 120 && '...'}
              </p>
            </div>

            <div style={styles.progressSection} onClick={handleSeek}>
              <div style={styles.progressBg}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
            </div>

            <div style={styles.controlsSection}>
              <button style={styles.speedButton} onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(true); setShowUI(true); scheduleHide(); }}>
                {playbackSpeed}x
              </button>
              
              <button style={styles.episodeButton} onClick={(e) => { e.stopPropagation(); setShowEpisodeList(true); setShowUI(true); scheduleHide(); }}>
                <span style={styles.episodeCurrent}>{currentIndex + 1}</span>
                <span style={styles.episodeDivider}>/</span>
                <span style={styles.episodeTotal}>{drama?.episodes?.length}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {showSpeedMenu && (
        <div style={styles.speedMenu} onClick={() => setShowSpeedMenu(false)}>
          <div style={styles.speedMenuInner} onClick={e => e.stopPropagation()}>
            <div style={styles.speedMenuHeader}>Kecepatan</div>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
              <button key={s} style={{ 
                ...styles.speedOption, 
                backgroundColor: playbackSpeed === s ? 'rgba(229,9,20,0.4)' : 'transparent', 
                color: playbackSpeed === s ? '#e50914' : '#fff' 
              }} onClick={() => changeSpeed(s)}>
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}

      {showEpisodeList && (
        <div style={styles.episodeListOverlay} onClick={(e) => { e.stopPropagation(); setShowEpisodeList(false); }}>
          <div style={styles.episodeListPanel} onClick={e => e.stopPropagation()}>
            <div style={styles.episodeListHeader}>
              <span style={styles.episodeListTitle}>Daftar Episode</span>
              <button style={styles.episodeListClose} onClick={() => setShowEpisodeList(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={styles.episodeListGrid}>
              {drama?.episodes?.map((ep, idx) => (
                <button
                  key={ep.id}
                  style={{
                    ...styles.episodeItem,
                    backgroundColor: idx === currentIndex ? 'rgba(229,9,20,0.25)' : 'rgba(255,255,255,0.05)',
                  }}
                  onClick={() => {
                    setShowEpisodeList(false);
                    goToEpisode(idx);
                  }}
                >
                  <div style={styles.episodeThumbContainer}>
                    {ep.cover ? (
                      <img src={getOptimizedImageUrl(ep.cover, 100)} alt="" style={styles.episodeThumb} loading="lazy" />
                    ) : (
                      <div style={styles.episodeThumbPlaceholder}>{idx + 1}</div>
                    )}
                  </div>
                  <div style={styles.episodeInfo}>
                    <span style={{ ...styles.episodeNum, color: idx === currentIndex ? '#e50914' : 'rgba(255,255,255,0.6)' }}>{idx + 1}</span>
                    <span style={{ ...styles.episodeName, color: idx === currentIndex ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                      {ep.title || `Episode ${idx + 1}`}
                    </span>
                  </div>
                  {idx === currentIndex && <span style={styles.nowPlaying}>Sedang Diputar</span>}
                </button>
              ))}
            </div>
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
    userSelect: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  loadingScreen: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
  },
  media: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  playButtonCircle: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: 'rgba(229,9,20,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    animation: 'pulse 2s infinite',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#e50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  centerContent: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  errorContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff6b6b',
    marginBottom: 20,
    fontSize: 15,
  },
  retryBtn: {
    padding: '12px 28px',
    backgroundColor: '#e50914',
    border: 'none',
    borderRadius: 20,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  transitionOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  transitionImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  transitionText: {
    position: 'absolute',
    bottom: '40%',
    color: '#fff',
    fontSize: 18,
    fontWeight: 600,
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  },
  watermarkCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    opacity: 0.06,
    pointerEvents: 'none',
  },
  watermarkText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 6,
  },
  watermarkSub: {
    fontSize: 12,
    color: '#fff',
    marginTop: 2,
    letterSpacing: 2,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 20,
  },
  toast: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    zIndex: 100,
  },
  speedBadge: {
    position: 'absolute',
    top: '50%',
    left: '75%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(229,9,20,0.9)',
    color: '#fff',
    padding: '14px 24px',
    borderRadius: '10px',
    fontSize: '20px',
    fontWeight: 'bold',
    zIndex: 100,
  },
  tapHint: {
    position: 'absolute',
    top: '50%',
    left: '75%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(255,255,255,0.95)',
    color: '#000',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    zIndex: 100,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 15,
  },
  playButtonCircle: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: 'rgba(229,9,20,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    animation: 'pulse 2s infinite',
  },
  mediaBadge: {
    position: 'absolute',
    top: 80,
    left: 16,
    zIndex: 15,
  },
  badgeText: {
    backgroundColor: 'rgba(229,9,20,0.9)',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  rightActions: {
    position: 'absolute',
    bottom: '200px',
    right: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    zIndex: 15,
  },
  actionIcon: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  actionCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 600,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 15,
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
    zIndex: 20,
  },
  titleSection: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
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
  },
  progressSection: {
    marginBottom: 14,
  },
  progressBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    cursor: 'pointer',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e50914',
    borderRadius: 2,
    transition: 'width 0.1s linear',
  },
  controlsSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  episodeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 8,
  },
  episodeCurrent: {
    color: '#e50914',
    fontSize: 18,
    fontWeight: 700,
  },
  episodeDivider: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  episodeTotal: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  speedMenu: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  speedMenuInner: {
    backgroundColor: 'rgba(25,25,25,0.95)',
    borderRadius: 14,
    padding: '8px 8px',
    minWidth: 150,
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
    padding: '12px 24px',
    fontSize: 15,
    cursor: 'pointer',
    textAlign: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  episodeListOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
  },
  episodeListPanel: {
    backgroundColor: 'rgba(18,18,18,0.98)',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: 500,
    maxHeight: '75vh',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    animation: 'slideUp 0.3s ease-out',
  },
  episodeListHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  episodeListTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 600,
  },
  episodeListClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    color: 'rgba(255,255,255,0.6)',
  },
  episodeListGrid: {
    padding: '8px 16px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  episodeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid transparent',
    cursor: 'pointer',
    textAlign: 'left',
  },
  episodeThumbContainer: {
    width: 48,
    height: 64,
    borderRadius: 6,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#2a2a2a',
  },
  episodeThumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  episodeThumbPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 16,
    fontWeight: 600,
  },
  episodeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  episodeNum: {
    fontSize: 13,
    fontWeight: 600,
    minWidth: 22,
  },
  episodeName: {
    fontSize: 13,
    flex: 1,
  },
  nowPlaying: {
    fontSize: 10,
    color: '#e50914',
    backgroundColor: 'rgba(229,9,20,0.2)',
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 600,
  },
};
