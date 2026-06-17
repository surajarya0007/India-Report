"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const newsController_1 = require("../controllers/newsController");
const ingestionController_1 = require("../controllers/ingestionController");
const router = (0, express_1.Router)();
// Retrieve news articles (cached-first)
router.get('/', newsController_1.getRecentNews);
// Trigger ingestion manually
router.post('/ingest', ingestionController_1.triggerIngestion);
exports.default = router;
