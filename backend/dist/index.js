"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const newsRoutes_1 = __importDefault(require("./routes/newsRoutes"));
const scheduler_1 = require("./cron/scheduler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable Cross-Origin Resource Sharing
app.use((0, cors_1.default)());
// Parse JSON request payloads
app.use(express_1.default.json());
// Mount News and Ingestion API routes
app.use('/api/news', newsRoutes_1.default);
// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'India Reports Backend API',
        status: 'healthy',
        time: new Date().toISOString()
    });
});
// Start the 15-minute cron pipeline
(0, scheduler_1.initScheduler)();
// Start Express Listener
app.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log(` India Reports API server listening on port: ${PORT}`);
    console.log(` Endpoint: http://localhost:${PORT}`);
    console.log('----------------------------------------------------');
});
exports.default = app;
