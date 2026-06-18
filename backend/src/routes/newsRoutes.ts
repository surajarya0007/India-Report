import { Router } from 'express';
import { getRecentNews, getArticleById } from '../controllers/newsController';
import { triggerIngestion, getIngestionStatusHandler } from '../controllers/ingestionController';

const router = Router();

router.get('/ingest/status', getIngestionStatusHandler);
router.post('/ingest', triggerIngestion);
router.get('/', getRecentNews);
router.get('/:id', getArticleById);

export default router;
