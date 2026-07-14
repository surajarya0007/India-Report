import { Router } from 'express';
import { publishArticleToSocials, handleFalWebhook } from '../controllers/socialController';

const router = Router();

// Endpoint triggered by Google Cloud Tasks or local simulation queue
router.post('/publish-article', publishArticleToSocials);

// Webhook endpoint called by Fal.ai when video rendering is complete
router.post('/fal-webhook', handleFalWebhook);

export default router;
