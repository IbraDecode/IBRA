import express from 'express';
import cors from 'cors';
import clientRoutes from './routes/client.js';
import contentRoutes from './routes/content.js';
import streamRoutes from './routes/stream.js';
import localRoutes from './routes/local.js';
import { initDatabase } from './services/database.js';

const app = express();
const PORT = 8124;

app.use(cors({
  origin: ['https://ibra.biz.id', 'http://localhost:5173', 'http://localhost:8123'],
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} - ${Date.now() - start}ms`);
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/client', clientRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/local', localRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Terjadi kesalahan internal' });
});

initDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`IBRA Backend running on https://api.ibra.biz.id:${PORT}`);
  console.log(`API Health: https://api.ibra.biz.id:${PORT}/api/health`);
});
