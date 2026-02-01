import express from 'express';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../services/database.js';
import { analyzeDevice } from '../utils/security.js';

const router = express.Router();

const MELOLO_API_BASE = 'https://melolo-api-azure.vercel.app/api/melolo';

const activeStreams = new Map();

function generateSecureStreamUrl(videoUrl, sessionToken) {
  const streamId = uuidv4();
  const expiresAt = Date.now() + (45 * 1000);

  activeStreams.set(streamId, {
    originalUrl: videoUrl,
    sessionToken,
    expiresAt,
    createdAt: Date.now()
  });

  return {
    stream_id: streamId,
    url: videoUrl,
    expires_at: expiresAt,
    ttl: 45
  };
}

async function fetchStreamUrl(videoId) {
  const response = await fetch(`${MELOLO_API_BASE}/stream/${videoId}`);
  if (!response.ok) {
    throw new Error(`Stream API Error: ${response.status}`);
  }
  return response.json();
}

router.get('/episode/:episodeId', async (req, res) => {
  try {
    const { episodeId } = req.params;
    const { session_token, device_id } = req.query;

    if (!session_token) {
      return res.status(401).json({ error: 'Sesi diperlukan' });
    }

    const deviceAnalysis = analyzeDevice(req);
    if (deviceAnalysis.suspicious) {
      return res.status(403).json({ error: 'Perangkat tidak diizinkan' });
    }

    const db = getDb();
    const session = db.prepare(`
      SELECT * FROM user_preferences WHERE key = ?
    `).get(`session_${session_token}`);

    if (!session) {
      return res.status(401).json({ error: 'Sesi tidak valid' });
    }

    const sessionData = JSON.parse(session.value);
    if (sessionData.expires_at < Date.now()) {
      return res.status(401).json({ error: 'Sesi kadaluarsa' });
    }

    const streamData = await fetchStreamUrl(episodeId);
    const secureStream = generateSecureStreamUrl(streamData.url, session_token);

    db.prepare(`
      INSERT INTO analytics (event_type, drama_id, episode_id, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run('stream_request', episodeId.split('_')[0], episodeId, Date.now(), JSON.stringify({
      device_id: deviceAnalysis.deviceId,
      ip: deviceAnalysis.ip
    }));

    res.json({
      success: true,
      ...secureStream,
      quality_options: streamData.quality_options || ['auto']
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Gagal memuat stream' });
  }
});

router.get('/stream/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    const stream = activeStreams.get(streamId);

    if (!stream) {
      return res.status(404).json({ error: 'Stream tidak ditemukan atau kadaluarsa' });
    }

    if (Date.now() > stream.expiresAt) {
      activeStreams.delete(streamId);
      return res.status(410).json({ error: 'Stream kadaluarsa' });
    }

    res.json({
      success: true,
      url: stream.originalUrl,
      expires_at: stream.expiresAt
    });
  } catch (error) {
    console.error('Get stream error:', error);
    res.status(500).json({ error: 'Gagal memuat stream info' });
  }
});

router.post('/report-progress', (req, res) => {
  try {
    const { session_token, drama_id, episode_id, episode_index, progress_seconds } = req.body;

    if (!session_token || !drama_id) {
      return res.status(400).json({ error: 'Parameter tidak lengkap' });
    }

    const db = getDb();

    db.prepare(`
      INSERT OR REPLACE INTO watch_history
      (drama_id, drama_title, episode_id, episode_index, progress_seconds, last_watched, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      drama_id,
      req.body.drama_title || '',
      episode_id || '',
      episode_index || 0,
      progress_seconds || 0,
      Date.now(),
      Date.now()
    );

    db.prepare(`
      INSERT INTO analytics (event_type, drama_id, episode_id, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run('progress_update', drama_id, episode_id, Date.now(), JSON.stringify({
      progress_seconds,
      episode_index
    }));

    res.json({ success: true });
  } catch (error) {
    console.error('Report progress error:', error);
    res.status(500).json({ error: 'Gagal menyimpan progres' });
  }
});

router.get('/cleanup', (req, res) => {
  const now = Date.now();
  let cleaned = 0;

  for (const [streamId, stream] of activeStreams.entries()) {
    if (now > stream.expiresAt) {
      activeStreams.delete(streamId);
      cleaned++;
    }
  }

  res.json({ success: true, cleaned_streams: cleaned });
});

setInterval(() => {
  const now = Date.now();
  for (const [streamId, stream] of activeStreams.entries()) {
    if (now > stream.expiresAt) {
      activeStreams.delete(streamId);
    }
  }
}, 60 * 1000);

export default router;
