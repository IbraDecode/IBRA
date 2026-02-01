import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../data/ibra.db');

let db;

export function initDatabase() {
  const dataDir = join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drama_id TEXT UNIQUE,
      drama_title TEXT,
      poster_url TEXT,
      episode_id TEXT,
      episode_index INTEGER,
      progress_seconds INTEGER DEFAULT 0,
      last_watched INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drama_id TEXT UNIQUE,
      drama_title TEXT,
      poster_url TEXT,
      total_episodes INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT,
      drama_id TEXT,
      episode_id TEXT,
      timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_history_drama ON watch_history(drama_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_drama ON favorites(drama_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type, timestamp);
  `);

  console.log('Database initialized successfully');
  return db;
}

export function getDb() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
