import express from 'express';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const MELOLO_API_BASE = 'https://melolo-api-azure.vercel.app/api/melolo';
const CACHE_TTL = 5 * 60 * 1000;
const IMAGE_CACHE_DIR = path.join(__dirname, '../data/image_cache');

const cache = new Map();
const imageCache = new Map();

async function ensureImageCacheDir() {
  try {
    await fs.mkdir(IMAGE_CACHE_DIR, { recursive: true });
  } catch (e) {}
}

function getCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

async function fetchFromMelolo(endpoint, params = {}) {
  const url = new URL(`${MELOLO_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

function normalizeDrama(item) {
  const categories = parseCategories(item.category_info);
  const coverUrl = item.cover || item.series_cover || item.thumb_url || '';

  return {
    id: item.book_id || item.series_id || item.series_id_str,
    title: item.book_name || item.series_title || item.book_name || item.name,
    description: item.abstract || item.series_intro || item.sub_abstract || '',
    cover: coverUrl,
    author: item.author || '',
    categories: categories,
    total_episodes: item.episode_cnt || item.total_episodes || 1,
    status: item.book_status === '1' || item.series_status === 1 ? 'ongoing' : 'completed',
    age_gate: item.age_gate || 0,
    play_count: item.series_play_cnt || 0,
    digg_count: item.followed_cnt || item.digg_cnt || 0
  };
}

function parseCategories(categoryInfo) {
  if (!categoryInfo) return [];
  try {
    const parsed = JSON.parse(categoryInfo);
    return parsed.map(cat => ({
      id: cat.ObjectId,
      name: cat.Name,
      type: cat.dim_name || 'genre'
    }));
  } catch {
    return [];
  }
}

function convertHeicUrl(url) {
  if (!url) return '';
  return url.replace(/\.heic\?/i, '.webp?');
}

function generateCacheKey(url, width) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  return `${hash}_${width}.webp`;
}

async function convertHeicToWebp(imageUrl, width = 400) {
  await ensureImageCacheDir();

  const cacheKey = generateCacheKey(imageUrl, width);
  const cachedPath = path.join(IMAGE_CACHE_DIR, cacheKey);

  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.buffer;
    }
  }

  try {
    const cacheStat = await fs.stat(cachedPath).catch(() => null);
    if (cacheStat && cacheStat.size > 0) {
      const buffer = await fs.readFile(cachedPath);
      imageCache.set(cacheKey, { buffer, timestamp: Date.now() });
      return buffer;
    }

    let fetchUrl = imageUrl;
    let isHeic = imageUrl.toLowerCase().endsWith('.heic') || imageUrl.includes('.heic?');

    if (!isHeic && (imageUrl.toLowerCase().endsWith('.webp') || imageUrl.includes('.webp?'))) {
      fetchUrl = imageUrl.replace(/\.webp\?/i, '.heic?');
      isHeic = true;
    }

    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    const tempFile = path.join(IMAGE_CACHE_DIR, `temp_${Date.now()}.heic`);
    await fs.writeFile(tempFile, buffer);

    await new Promise((resolve, reject) => {
      const vips = spawn('vips', ['heifload', tempFile, cachedPath]);
      let error = '';
      vips.stdout.on('data', (data) => {});
      vips.stderr.on('data', (data) => error += data.toString());
      vips.on('close', async (code) => {
        try { await fs.unlink(tempFile); } catch (e) {}
        if (code !== 0) {
          reject(new Error(`vips failed: ${error}`));
        } else {
          resolve();
        }
      });
    });

    const webpBuffer = await fs.readFile(cachedPath);
    imageCache.set(cacheKey, { buffer: webpBuffer, timestamp: Date.now() });
    return webpBuffer;
  } catch (error) {
    console.error('Image conversion error:', error);
    throw error;
  }
}

router.get('/image', async (req, res) => {
  try {
    const { url, width = 400 } = req.query;

    if (!url) {
      return res.status(400).send('URL diperlukan');
    }

    const decodedUrl = decodeURIComponent(url);
    const widthNum = parseInt(width) || 400;

    const webpBuffer = await convertHeicToWebp(decodedUrl, widthNum);

    res.set({
      'Content-Type': 'image/webp',
      'Content-Length': webpBuffer.length,
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    });

    res.send(webpBuffer);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    const { url } = req.query;
    if (url && (error.message.includes('403') || error.message.includes('Failed to fetch'))) {
      return res.redirect(decodeURIComponent(url));
    }
    res.status(500).json({ error: 'Gagal memuat gambar' });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const cached = getCache('latest');
    if (cached) return res.json(cached);

    const response = await fetchFromMelolo('latest');
    const dramas = (response.books || []).map(normalizeDrama);

    const result = {
      success: true,
      data: dramas,
      cached_at: Date.now()
    };

    setCache('latest', result);
    res.json(result);
  } catch (error) {
    console.error('Latest error:', error);
    res.status(500).json({ error: 'Gagal memuat konten terbaru' });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const cached = getCache('trending');
    if (cached) return res.json(cached);

    const response = await fetchFromMelolo('trending');
    const dramas = (response.books || []).map(normalizeDrama);

    const result = {
      success: true,
      data: dramas,
      cached_at: Date.now()
    };

    setCache('trending', result);
    res.json(result);
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Gagal memuat konten trending' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query minimal 2 karakter' });
    }

    const cacheKey = `search_${query}_${limit}_${offset}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const response = await fetchFromMelolo('search', {
      query: query.trim(),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const books = response.data?.search_data?.[0]?.books || response.books || [];
    const dramas = books.map(normalizeDrama);

    const result = {
      success: true,
      data: dramas,
      query: query,
      has_more: response.data?.has_more || false,
      cached_at: Date.now()
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Pencarian gagal' });
  }
});

router.get('/detail/:dramaId', async (req, res) => {
  try {
    const { dramaId } = req.params;
    const cacheKey = `detail_${dramaId}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const response = await fetch(`${MELOLO_API_BASE}/detail/${dramaId}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const apiResponse = await response.json();
    const data = apiResponse.data || apiResponse;

    const videoList = (data.video_data?.video_list || []).map((video, index) => ({
      id: video.vid_id || video.video_id || `${dramaId}_${index}`,
      title: video.video_title || `Episode ${index + 1}`,
      cover: video.cover || video.video_cover || '',
      duration: video.duration || 0,
      index: index + 1
    }));

    const result = {
      success: true,
      data: {
        id: dramaId,
        title: data.video_data?.series_title || data.series_title || 'Drama',
        description: data.video_data?.series_intro || data.series_intro || '',
        cover: data.video_data?.series_cover || data.series_cover || '',
        total_episodes: data.video_data?.episode_cnt || data.episode_cnt || videoList.length,
        status: data.video_data?.series_status === 1 ? 'ongoing' : 'completed',
        age_gate: data.video_data?.age_gate_info?.age_gate || 0,
        categories: parseCategories(data.video_data?.category_schema),
        episodes: videoList
      },
      cached_at: Date.now()
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Detail error:', error);
    res.status(500).json({ error: 'Gagal memuat detail drama' });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const { history } = req.query;
    let watchedIds = [];

    try {
      if (history) {
        watchedIds = JSON.parse(history);
      }
    } catch (e) {
      watchedIds = [];
    }

    const [latest, trending] = await Promise.all([
      fetchFromMelolo('latest'),
      fetchFromMelolo('trending')
    ]);

    let recommendations = [...(latest.books || []), ...(trending.books || [])]
      .filter(item => !watchedIds.includes(item.book_id || item.series_id))
      .slice(0, 10)
      .map(normalizeDrama);

    const result = {
      success: true,
      data: recommendations,
      based_on_history: watchedIds.length > 0,
      cached_at: Date.now()
    };

    res.json(result);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Gagal memuat rekomendasi' });
  }
});

router.get('/clear-cache', (req, res) => {
  cache.clear();
  res.json({ success: true, message: 'Cache cleared' });
});

export default router;
