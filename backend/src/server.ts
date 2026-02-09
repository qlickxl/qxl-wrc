import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import wrcRoutes from './routes/wrcRoutes';
import wrcSyncRoutes from './routes/wrcSyncRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4010;

const allowedOrigins = [
  'http://localhost:3010',
  'https://wrc.awagi.co.uk',
  'http://wrc.awagi.co.uk',
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy blocks origin: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wrc', wrcRoutes);
app.use('/api/wrc/sync', wrcSyncRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WRC Rally API is running' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🏁 WRC Rally API server running on port ${PORT}`);
  console.log(`📡 CORS enabled for origins: ${allowedOrigins.join(', ')}`);
});
