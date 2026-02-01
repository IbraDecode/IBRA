export const API_BASE = 'https://api.ibra.biz.id/api';

export function getOptimizedImageUrl(url, width = 400) {
  if (!url) return '';
  return `${API_BASE}/content/image?url=${encodeURIComponent(url)}&width=${width}`;
}

export function getSession() {
  try {
    const saved = localStorage.getItem('ibra_session');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem('ibra_session', JSON.stringify(session));
}

export async function initSession() {
  const deviceId = generateDeviceId();
  const timestamp = Date.now();

  try {
    const response = await fetch(`${API_BASE}/client/handshake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_fingerprint: deviceId,
        timestamp,
        app_version: '1.0.0'
      })
    });

    const data = await response.json();

    if (data.session_token) {
      const session = {
        token: data.session_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        deviceId
      };
      saveSession(session);
      return session;
    }

    throw new Error('No session token');
  } catch (error) {
    console.error('Session init failed:', error);
    return { token: null, expiresAt: null, deviceId };
  }
}

function generateDeviceId() {
  const components = [
    navigator?.userAgent || '',
    navigator?.language || '',
    screen?.colorDepth || 0,
    (screen?.width || 0) + 'x' + (screen?.height || 0),
    new Date().getTimezoneOffset(),
    navigator?.hardwareConcurrency || 0
  ];

  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const str = String(components[i]);
    for (let j = 0; j < str.length; j++) {
      const char = str.charCodeAt(j);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
  }
  return Math.abs(hash).toString(16);
}

async function withSession(fn) {
  let session = getSession();

  if (!session?.token || Date.now() > session.expiresAt) {
    session = await initSession();
  }

  return fn(session.token);
}

export async function fetchAPI(endpoint, options = {}, retryCount = 0) {
  return withSession(async (token) => {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': token,
        'X-Device-Id': getSession()?.deviceId || '',
        ...options.headers
      }
    });

    if (response.status === 401 && retryCount < 2) {
      const newSession = await initSession();
      if (newSession?.token) {
        return fetchAPI(endpoint, options, retryCount + 1);
      }
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  });
}

async function fetchPublicAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export function fetchLatest() {
  return fetchPublicAPI('/content/latest');
}

export function fetchTrending() {
  return fetchPublicAPI('/content/trending');
}

export function fetchSearch(query, limit = 20, offset = 0) {
  return fetchPublicAPI(`/content/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
}

export function fetchDetail(dramaId) {
  return fetchPublicAPI(`/content/detail/${dramaId}`);
}

export function fetchRecommendations(historyIds = []) {
  const query = historyIds.length > 0 ? `?history=${encodeURIComponent(JSON.stringify(historyIds))}` : '';
  return fetchPublicAPI(`/content/recommendations${query}`);
}

export function fetchStream(episodeId) {
  return fetchAPI(`/stream/episode/${episodeId}`);
}

export function reportProgress(dramaId, episodeId, progress, episodeIndex = 0) {
  return fetchAPI('/stream/report-progress', {
    method: 'POST',
    body: JSON.stringify({
      drama_id: dramaId,
      episode_id: episodeId,
      episode_index: episodeIndex,
      progress_seconds: Math.floor(progress)
    })
  });
}

export function saveToHistory(drama) {
  return fetchAPI('/local/history', {
    method: 'POST',
    body: JSON.stringify({
      drama_id: drama.id,
      drama_title: drama.title,
      poster_url: drama.cover,
      episode_id: drama.currentEpisodeId,
      episode_index: drama.currentEpisodeIndex,
      progress_seconds: drama.progress || 0
    })
  });
}

export function getHistory() {
  return fetchAPI('/local/history');
}

export function deleteFromHistory(dramaId) {
  return fetchAPI(`/local/history/${dramaId}`, { method: 'DELETE' });
}

export function addFavorite(drama) {
  return fetchAPI('/local/favorite', {
    method: 'POST',
    body: JSON.stringify({
      drama_id: drama.id,
      drama_title: drama.title,
      poster_url: drama.cover,
      total_episodes: drama.totalEpisodes
    })
  });
}

export function removeFavorite(dramaId) {
  return fetchAPI(`/local/favorite/${dramaId}`, { method: 'DELETE' });
}

export function getFavorites() {
  return fetchAPI('/local/favorites');
}

export function getPreferences() {
  return fetchAPI('/local/preferences');
}

export function savePreference(key, value) {
  return fetchAPI('/local/preferences', {
    method: 'POST',
    body: JSON.stringify({ key, value })
  });
}

export function clearLocalData() {
  return fetchAPI('/local/clear-all', { method: 'POST' });
}
