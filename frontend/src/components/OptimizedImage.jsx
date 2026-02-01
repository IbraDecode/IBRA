import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getOptimizedImageUrl } from '../services/api';

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
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer for lazy loading
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

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

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
      {/* Skeleton placeholder */}
      {placeholder && !imageLoaded && (
        <div className="skeleton" style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }} />
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={imageUrl}
          alt={alt}
          width={width}
          height={style.height || 'auto'}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
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
