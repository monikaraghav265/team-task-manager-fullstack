import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import dashboardRoutes from './routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin(origin, callback) {
    const allowed = [process.env.CLIENT_URL, process.env.APP_URL].filter(Boolean);
    if (!origin || allowed.length === 0 || allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Team Task Manager API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API route not found.' });
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'Team Task Manager API is running. Build the client with npm run build to serve the UI.'
    });
  });
}

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: error.errors?.[0]?.message || 'Invalid input.',
      details: error.flatten()
    });
  }

  if (error?.code === 'P2025') {
    return res.status(404).json({ message: 'Requested record was not found.' });
  }

  if (!isProduction) {
    console.error(error);
  }

  return res.status(error.status || 500).json({
    message: error.message || 'Something went wrong.'
  });
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Team Task Manager running on port ${port}`);
});
