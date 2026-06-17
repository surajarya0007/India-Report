import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import newsRoutes from './routes/newsRoutes';
import { initScheduler } from './cron/scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse JSON request payloads
app.use(express.json());

// Mount News and Ingestion API routes
app.use('/api/news', newsRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'India Reports Backend API',
    status: 'healthy',
    time: new Date().toISOString()
  });
});

// Start the 15-minute cron pipeline
initScheduler();

// Start Express Listener
app.listen(PORT, () => {
  console.log('----------------------------------------------------');
  console.log(` India Reports API server listening on port: ${PORT}`);
  console.log(` Endpoint: http://localhost:${PORT}`);
  console.log('----------------------------------------------------');
});
export default app;
