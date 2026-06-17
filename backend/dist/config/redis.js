"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    console.warn('Warning: REDIS_URL is not set. Caching will be disabled.');
}
const redis = redisUrl ? new ioredis_1.default(redisUrl) : null;
if (redis) {
    redis.on('connect', () => {
        console.log('Successfully connected to Redis.');
    });
    redis.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });
}
exports.default = redis;
