import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../services/database.js';
import { analyzeDevice } from '../utils/security.js';

const router = express.Router();

router.post('/handshake', async (req, res) => {
  try {
    const { device_fingerprint, timestamp, app_version } = req.body;

    if (!device_fingerprint || !timestamp) {
      return res.status(400).json({ error: 'Parameter tidak lengkap' });
    }

    const deviceAnalysis = analyzeDevice(req);

    const sessionToken = uuidv4();
    const now = Date.now();
    const expiresAt = now + (10 * 60 * 1000);

    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_preferences (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    const sessionData = {
      token: sessionToken,
      device_fingerprint: device_fingerprint.substring(0, 16) + '***',
      app_version,
      ip: deviceAnalysis.ip,
      is_trusted: !deviceAnalysis.suspicious,
      created_at: now,
      expires_at: expiresAt
    };

    stmt.run(`session_${sessionToken}`, JSON.stringify(sessionData), now);

    res.json({
      success: true,
      session_token: sessionToken,
      expires_in: 600,
      server_time: now
    });
  } catch (error) {
    console.error('Handshake error:', error);
    res.status(500).json({ error: 'Gagal membuat sesi' });
  }
});

router.post('/validate', (req, res) => {
  const { session_token } = req.body;

  if (!session_token) {
    return res.status(400).json({ valid: false, error: 'Token diperlukan' });
  }

  try {
    const db = getDb();
    const session = db.prepare(`
      SELECT * FROM user_preferences WHERE key = ?
    `).get(`session_${session_token}`);

    if (!session) {
      return res.json({ valid: false, error: 'Sesi tidak ditemukan' });
    }

    const sessionData = JSON.parse(session.value);

    if (sessionData.expires_at < Date.now()) {
      return res.json({ valid: false, error: 'Sesi kadaluarsa' });
    }

    res.json({ valid: true, is_trusted: sessionData.is_trusted });
  } catch (error) {
    res.status(500).json({ valid: false, error: 'Validasi gagal' });
  }
});

router.post('/refresh', (req, res) => {
  const { session_token } = req.body;

  if (!session_token) {
    return res.status(400).json({ error: 'Token diperlukan' });
  }

  try {
    const db = getDb();
    const session = db.prepare(`
      SELECT * FROM user_preferences WHERE key = ?
    `).get(`session_${session_token}`);

    if (!session) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    }

    const sessionData = JSON.parse(session.value);
    const newExpiresAt = Date.now() + (10 * 60 * 1000);
    sessionData.expires_at = newExpiresAt;

    db.prepare(`
      UPDATE user_preferences SET value = ?, updated_at = ?
      WHERE key = ?
    `).run(JSON.stringify(sessionData), Date.now(), `session_${session_token}`);

    res.json({
      success: true,
      expires_in: 600,
      expires_at: newExpiresAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Refresh gagal' });
  }
});

export default router;
