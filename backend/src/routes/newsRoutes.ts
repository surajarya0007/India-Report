import { Router } from 'express';
import { getRecentNews, getArticleById, updateArticleImage, recordArticleView } from '../controllers/newsController';
import { triggerIngestion, getIngestionStatusHandler } from '../controllers/ingestionController';

const router = Router();

// Ingestion endpoints
router.get('/ingest/status', getIngestionStatusHandler);
router.post('/ingest', triggerIngestion);

// Fetch endpoints
router.get('/', getRecentNews);
router.get('/:id', getArticleById);
router.post('/:id/view', recordArticleView);
router.patch('/:id/image', updateArticleImage);

export default router;

