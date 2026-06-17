import { Router } from 'express';
import { getRecentNews, getArticleById } from '../controllers/newsController';
import { triggerIngestion } from '../controllers/ingestionController';

const router = Router();

// Retrieve news articles (cached-first)
router.get('/', getRecentNews);

// Retrieve a single article by ID
router.get('/:id', getArticleById);

// Trigger ingestion manually
router.post('/ingest', triggerIngestion);

export default router;
