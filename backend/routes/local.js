import express from 'express';
import { getDb } from '../services/database.js';

const router = express.Router();

function validateSession(req, res, next) {
  const session_token = req.headers['x-session-token'];
  if (!session_token) {
    return res.status(401).json({ error: 'Sesi diperlukan' });
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

  req.db = db;
  next();
}

router.post('/history', validateSession, (req, res) => {
  try {
    const { drama_id, drama_title, poster_url, episode_id, episode_index, progress_seconds } = req.body;

    const db = req.db;

    db.prepare(`
      INSERT OR REPLACE INTO watch_history
      (drama_id, drama_title, poster_url, episode_id, episode_index, progress_seconds, last_watched, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      drama_id,
      drama_title || '',
      poster_url || '',
      episode_id || '',
      episode_index || 0,
      progress_seconds || 0,
      Date.now(),
      Date.now()
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Save history error:', error);
    res.status(500).json({ error: 'Gagal menyimpan riwayat' });
  }
});

router.get('/history', validateSession, (req, res) => {
  try {
    const db = req.db;

    const history = db.prepare(`
      SELECT * FROM watch_history
      ORDER BY last_watched DESC
      LIMIT 50
    `).all();

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Gagal memuat riwayat' });
  }
});

router.delete('/history/:dramaId', validateSession, (req, res) => {
  try {
    const { dramaId } = req.params;
    const db = req.db;

    db.prepare('DELETE FROM watch_history WHERE drama_id = ?').run(dramaId);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete history error:', error);
    res.status(500).json({ error: 'Gagal menghapus riwayat' });
  }
});

router.post('/favorite', validateSession, (req, res) => {
  try {
    const { drama_id, drama_title, poster_url, total_episodes } = req.body;

    const db = req.db;

    db.prepare(`
      INSERT OR REPLACE INTO favorites
      (drama_id, drama_title, poster_url, total_episodes, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      drama_id,
      drama_title || '',
      poster_url || '',
      total_episodes || 0,
      Date.now()
    );

    res.json({ success: true, is_favorite: true });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Gagal menambah favorit' });
  }
});

router.delete('/favorite/:dramaId', validateSession, (req, res) => {
  try {
    const { dramaId } = req.params;
    const db = req.db;

    db.prepare('DELETE FROM favorites WHERE drama_id = ?').run(dramaId);

    res.json({ success: true, is_favorite: false });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Gagal menghapus favorit' });
  }
});

router.get('/favorites', validateSession, (req, res) => {
  try {
    const db = req.db;

    const favorites = db.prepare(`
      SELECT * FROM favorites ORDER BY created_at DESC
    `).all();

    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Gagal memuat favorit' });
  }
});

router.post('/preferences', validateSession, (req, res) => {
  try {
    const { key, value } = req.body;
    const db = req.db;

    db.prepare(`
      INSERT OR REPLACE INTO user_preferences (key, value, updated_at)
      VALUES (?, ?, ?)
    `).run(`pref_${key}`, JSON.stringify(value), Date.now());

    res.json({ success: true });
  } catch (error) {
    console.error('Save preference error:', error);
    res.status(500).json({ error: 'Gagal menyimpan preferensi' });
  }
});

router.get('/preferences', validateSession, (req, res) => {
  try {
    const db = req.db;
    const prefs = db.prepare(`
      SELECT * FROM user_preferences WHERE key LIKE 'pref_%'
    `).all();

    const result = {};
    prefs.forEach(p => {
      const key = p.key.replace('pref_', '');
      try {
        result[key] = JSON.parse(p.value);
      } catch {
        result[key] = p.value;
      }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Gagal memuat preferensi' });
  }
});

router.post('/clear-all', validateSession, (req, res) => {
  try {
    const db = req.db;

    db.prepare('DELETE FROM watch_history').run();
    db.prepare('DELETE FROM favorites').run();

    res.json({ success: true, message: 'Data lokal dibersihkan' });
  } catch (error) {
    console.error('Clear all error:', error);
    res.status(500).json({ error: 'Gagal membersihkan data' });
  }
});

router.get('/stats', validateSession, (req, res) => {
  try {
    const db = req.db;

    const historyCount = db.prepare('SELECT COUNT(*) as count FROM watch_history').get().count;
    const favoritesCount = db.prepare('SELECT COUNT(*) as count FROM favorites').get().count;

    res.json({
      success: true,
      data: {
        watch_history_count: historyCount,
        favorites_count: favoritesCount
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Gagal memuat statistik' });
  }
});

export default router;
