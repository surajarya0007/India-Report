import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import newsRoutes from './routes/newsRoutes';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import socialRoutes from './routes/socialRoutes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse JSON request payloads
app.use(express.json());

// Proxy endpoint for IP geolocation to avoid frontend CORS issues
app.get('/api/location', async (req, res) => {
  try {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (Array.isArray(clientIp)) {
      clientIp = clientIp[0];
    }
    clientIp = clientIp.split(',')[0].trim();

    // Check if loopback/local IP
    const isLocal = !clientIp || clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.includes('127.0.0.1');

    // 1. Try ip-api.com first (higher accuracy for dynamic Indian IPs)
    try {
      const ipApiUrl = isLocal
        ? 'http://ip-api.com/json'
        : `http://ip-api.com/json/${clientIp}`;

      const apiRes = await fetch(ipApiUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.status === 'success') {
          return res.json({
            success: true,
            city: data.city || 'New Delhi',
            latitude: data.lat || 28.6139,
            longitude: data.lon || 77.2090,
          });
        }
      }
    } catch (ipApiErr: any) {
      console.error('IP-API proxy error:', ipApiErr.message);
    }

    // 2. Fallback to freeipapi.com
    try {
      const freeIpUrl = isLocal
        ? 'https://freeipapi.com/api/json'
        : `https://freeipapi.com/api/json/${clientIp}`;

      const apiRes = await fetch(freeIpUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        return res.json({
          success: true,
          city: data.cityName || 'New Delhi',
          latitude: data.latitude || 28.6139,
          longitude: data.longitude || 77.2090,
        });
      }
    } catch (freeIpErr: any) {
      console.error('FreeIPAPI fallback error:', freeIpErr.message);
    }

    // 3. Absolute fallback to New Delhi
    res.json({
      success: false,
      city: 'New Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
    });
  } catch (err: any) {
    console.error('General geolocation proxy error:', err.message);
    res.json({
      success: false,
      city: 'New Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
    });
  }
});

// Mount News and Ingestion API routes
app.use('/api/news', newsRoutes);

// Mount Auth and Admin API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Mount Social Media Queue API routes
app.use('/api/social', socialRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Daily News Insights Backend API',
    status: 'healthy',
    time: new Date().toISOString()
  });
});

// Start Express Listener
app.listen(PORT, HOST, () => {
  console.log('----------------------------------------------------');
  console.log(` Daily News Insights API server listening on ${HOST}:${PORT}`);
  console.log(` Endpoint: http://${HOST}:${PORT}`);
  console.log('----------------------------------------------------');
});
export default app;
