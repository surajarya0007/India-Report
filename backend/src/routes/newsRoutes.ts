import { Router } from 'express';
import { getRecentNews } from '../controllers/newsController';
import { triggerIngestion } from '../controllers/ingestionController';

const router = Router();

// Retrieve news articles (cached-first)
router.get('/', getRecentNews);

// Trigger ingestion manually
router.post('/ingest', triggerIngestion);

export default router;
