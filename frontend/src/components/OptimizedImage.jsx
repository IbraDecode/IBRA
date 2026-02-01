import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getOptimizedImageUrl } from '../services/api';
import heic2any from 'heic2any';

export default function OptimizedImage({ 
  src, 
  alt, 
  width = 280, 
  style = {}, 
  className, 
  onClick,
  priority = false,
  placeholder = true
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const [useOriginalUrl, setUseOriginalUrl] = useState(false);
  const [useHeicBlob, setUseHeicBlob] = useState(false);
  const [heicBlobUrl, setHeicBlobUrl] = useState(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (priority || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority]);

  const imageUrl = getOptimizedImageUrl(src, width);
  const isHeic = src?.toLowerCase().endsWith('.heic') || src?.toLowerCase().includes('.heic?');

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const convertHeicToBlob = useCallback(async () => {
    if (!src || !isHeic) return null;
    try {
      const response = await fetch(src);
      if (!response.ok) return null;
      const blob = await response.blob();
      const convertedBlob = await heic2any({ blob, toType: 'image/jpeg', quality: 0.8 });
      return URL.createObjectURL(convertedBlob);
    } catch (err) {
      console.error('HEIC conversion error:', err);
      return null;
    }
  }, [src, isHeic]);

  const handleError = useCallback(async () => {
    if (!useOriginalUrl && !useHeicBlob) {
      setUseOriginalUrl(true);
      setError(false);
    } else if (useOriginalUrl && isHeic && !useHeicBlob) {
      setUseHeicBlob(true);
      const blobUrl = await convertHeicToBlob();
      if (blobUrl) {
        setHeicBlobUrl(blobUrl);
        setError(false);
      } else {
        setError(true);
      }
    } else {
      setError(true);
    }
  }, [useOriginalUrl, useHeicBlob, isHeic, convertHeicToBlob]);

  const finalUrl = useHeicBlob ? heicBlobUrl : (useOriginalUrl ? src : imageUrl);

  return (
    <div
      ref={imgRef}
      style={{
        position: 'relative',
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
        ...style
      }}
      className={className}
      onClick={onClick}
    >
      {placeholder && !imageLoaded && !error && (
        <div className="skeleton" style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2a2a2a',
          color: '#666',
          fontSize: '12px'
        }}>
          Gambar tidak tersedia
        </div>
      )}

      {isInView && !error && (
        <img
          src={finalUrl}
          alt={alt}
          width={width}
          height={style.height || 'auto'}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            display: 'block'
          }}
        />
      )}
    </div>
  );
}

// Hook for preloading images on hover
export function usePrefetch() {
  const prefetchTimeoutRef = useRef(null);

  return useCallback((url, width = 280) => {
    if (!url) return;
    
    const imageUrl = getOptimizedImageUrl(url, width);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = imageUrl;
    document.head.appendChild(link);
  }, []);
}

// Component for hero images with priority loading
export function HeroImage({ src, alt, width = 800, style = {}, className }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      style={style}
      className={className}
      priority={true}
      placeholder={true}
    />
  );
}
