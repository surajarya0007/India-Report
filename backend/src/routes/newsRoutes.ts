import { Router } from 'express';
import { getRecentNews, getArticleById, enrichArticleOnDemand } from '../controllers/newsController';
import { triggerIngestion, getIngestionStatusHandler } from '../controllers/ingestionController';

const router = Router();

router.get('/ingest/status', getIngestionStatusHandler);
router.post('/ingest', triggerIngestion);
router.get('/', getRecentNews);
router.get('/:id', getArticleById);
router.post('/:id/enrich', enrichArticleOnDemand);

export default router;
