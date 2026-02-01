import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSearch } from '../services/api';
import OptimizedImage from '../components/OptimizedImage';

export default function SearchPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('ibra_recent_searches');
    return saved ? JSON.parse(saved) : [];
  });
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await fetchSearch(searchQuery);
      if (response.success) {
        setResults(response.data);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery.length >= 2) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        handleSearch(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setHasSearched(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      addToRecentSearches(query.trim());
      setSearchParams({ q: query.trim() });
      handleSearch(query.trim());
    }
  };

  const addToRecentSearches = (term) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('ibra_recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('ibra_recent_searches');
  };

  const selectSuggestion = (term) => {
    setQuery(term);
    addToRecentSearches(term);
    setSearchParams({ q: term });
    handleSearch(term);
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0a0a0a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
    }}>
      <header style={{
        padding: '16px',
        paddingTop: '48px',
        backgroundColor: '#0a0a0a',
        borderBottom: '1px solid #1a1a1a'
      }}>
        <form onSubmit={handleSubmit} style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <div style={{
            position: 'absolute',
            left: '16px',
            color: isInputFocused ? '#e50914' : '#666',
            transition: 'color 0.2s ease'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Cari drama..."
            style={{
              flex: 1,
              background: '#1a1a1a',
              border: `2px solid ${isInputFocused ? '#e50914' : '#333'}`,
              borderRadius: '24px',
              padding: '14px 44px 14px 48px',
              fontSize: '16px',
              color: '#fff',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                padding: '6px',
                borderRadius: '50%',
                backgroundColor: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#444'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#333'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
            </button>
          )}
        </form>
      </header>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 0'
      }}>
        {!hasSearched && query.length < 2 && (
          <RecentSearches
            searches={recentSearches}
            onSelect={selectSuggestion}
            onClear={clearRecentSearches}
          />
        )}

        {loading && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '60px 16px' 
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #1a1a1a',
              borderTopColor: '#e50914',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ color: '#666', marginTop: '16px', fontSize: '14px' }}>
              Sedang mencari...
            </p>
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && query.length >= 2 && (
          <div style={{
            padding: '60px 16px',
            textAlign: 'center'
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
              <path d="M8 8l6 6M14 8l-6 6" />
            </svg>
            <p style={{ color: '#888', marginBottom: '8px', fontSize: '16px' }}>
              Tidak ditemukan "{query}"
            </p>
            <p style={{ color: '#555', fontSize: '13px' }}>
              Coba gunakan kata kunci lain
            </p>
          </div>
        )}

        {!loading && hasSearched && results.length > 0 && (
          <div>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px', padding: '0 16px' }}>
              {results.length} hasil untuk "{query}"
            </p>
            <div className="drama-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              padding: '0 16px',
              boxSizing: 'border-box',
              minWidth: 0
            }}>
              {results.map(item => (
                <div key={item.id} style={{ minWidth: 0 }}>
                  <SearchResultCard
                    item={item}
                    onClick={() => navigate(`/detail/${item.id}`)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (min-width: 480px) {
          .drama-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

function RecentSearches({ searches, onSelect, onClear }) {
  if (searches.length === 0) return null;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#888' }}>
          Pencarian Terbaru
        </span>
        <button
          onClick={onClear}
          style={{
            fontSize: '12px',
            color: '#e50914',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Hapus Semua
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {searches.map((term, index) => (
          <button
            key={index}
            onClick={() => onSelect(term)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '20px',
              color: '#ddd',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#e50914';
              e.target.style.color = '#e50914';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#333';
              e.target.style.color = '#ddd';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchResultCard({ item, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        aspectRatio: '2/3',
        minWidth: 0,
        position: 'relative',
        transition: 'transform 0.2s ease'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <OptimizedImage
        src={item.cover}
        alt={item.title}
        width={280}
        style={{ width: '100%', height: '100%' }}
      />
      {item.age_gate >= 18 && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: 'rgba(200, 0, 0, 0.9)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '600',
          color: '#fff'
        }}>
          18+
        </div>
      )}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)'
      }}>
        <p style={{
          fontSize: '13px',
          fontWeight: '500',
          color: '#fff',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {item.title}
        </p>
      </div>
    </div>
  );
}
