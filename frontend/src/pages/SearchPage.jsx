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
  const [suggestions, setSuggestions] = useState([]);

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
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0a0a0a'
    }}>
      <header style={{
        padding: '16px',
        paddingTop: '48px',
        backgroundColor: '#0a0a0a',
        borderBottom: '1px solid #1a1a1a'
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: '12px 16px'
        }}>
          <SearchIcon size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Cari drama..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: '#fff',
              caretColor: '#c9a227'
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ padding: '4px' }}
            >
              <CloseIcon size={18} />
            </button>
          )}
        </form>
      </header>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 0'
      }}>
        {!hasSearched && query.length < 2 && (
          <RecentSearches
            searches={recentSearches}
            onSelect={selectSuggestion}
            onClear={clearRecentSearches}
          />
        )}

        {loading && (
          <div style={{ padding: '16px', textAlign: 'center', color: '#666' }}>
            Sedang mencari...
          </div>
        )}

        {!loading && hasSearched && results.length === 0 && query.length >= 2 && (
          <div style={{
            padding: '40px 16px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Tidak ditemukan "{query}"
            </p>
            <p style={{ color: '#444', fontSize: '12px' }}>
              Coba gunakan kata kunci lain
            </p>
          </div>
        )}

        {!loading && hasSearched && results.length > 0 && (
          <div>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '16px', padding: '0 16px' }}>
              Hasil pencarian "{query}"
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
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
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#888' }}>
          Pencarian Terbaru
        </span>
        <button
          onClick={onClear}
          style={{
            fontSize: '12px',
            color: '#c9a227',
            background: 'none',
            border: 'none'
          }}
        >
          Hapus
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {searches.map((term, index) => (
          <button
            key={index}
            onClick={() => onSelect(term)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1a1a1a',
              border: 'none',
              borderRadius: '20px',
              color: '#ddd',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
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
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        aspectRatio: '2/3',
        minWidth: 0,
        position: 'relative'
      }}
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
          top: '4px',
          right: '4px',
          backgroundColor: 'rgba(200, 0, 0, 0.8)',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '9px',
          fontWeight: '600',
          color: '#fff'
        }}>
          18+
        </div>
      )}
    </div>
  );
}

function SearchIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CloseIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  );
}
