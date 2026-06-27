import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatWithArticles, indexArticle, searchRagArticles } from './controllers/ragController';
import { getRagStatus, startRagBackfill } from './controllers/adminController';
import { requireAdmin } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'india-reports-rag', status: 'healthy' });
});

app.get('/api/rag/search', searchRagArticles);
app.post('/api/rag/chat', chatWithArticles);
app.post('/api/rag/index', indexArticle);

app.get('/api/admin/rag/status', requireAdmin, getRagStatus);
app.post('/api/admin/rag/backfill', requireAdmin, startRagBackfill);

app.get('/', (_req, res) => {
  res.json({
    name: 'India Reports RAG Service',
    status: 'healthy',
    time: new Date().toISOString(),
  });
});

app.listen(PORT, HOST, () => {
  console.log('----------------------------------------------------');
  console.log(` India Reports RAG server listening on ${HOST}:${PORT}`);
  console.log(` Endpoint: http://${HOST}:${PORT}`);
  console.log('----------------------------------------------------');
});

export default app;
