import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import socialRoutes from './routes/socialRoutes';

dotenv.config();

const app = express();
const PORT = Number(process.env.SOCIAL_PORT || (process.env.PORT === '5000' ? '8090' : process.env.PORT) || 8090);
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Social Server] ${req.method} ${req.originalUrl} [Status: ${res.statusCode}] - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ success: true, service: 'india-reports-social', status: 'healthy' });
});

// Mount Social Media Queue API routes
app.use('/api/social', socialRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Daily News Insights Social Posting Service',
    status: 'healthy',
    time: new Date().toISOString(),
  });
});

app.listen(PORT, HOST, () => {
  console.log('----------------------------------------------------');
  console.log(` Daily News Insights Social server listening on ${HOST}:${PORT}`);
  console.log(` Endpoint: http://${HOST}:${PORT}`);
  console.log('----------------------------------------------------');
});

export default app;
