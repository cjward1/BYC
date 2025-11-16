import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import { config } from './config.js';
import { initDatabase, closeDatabase } from './database/db.js';

// Import routes
import authRoutes from './routes/auth.js';
import seasonRoutes from './routes/seasons.js';
import applicationRoutes from './routes/applications.js';
import dockPlanningRoutes from './routes/dockPlanning.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Ensure data directory exists
mkdirSync(dirname(config.database.path), { recursive: true });

// Initialize database
initDatabase();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: config.isProduction ? 'none' : 'lax'
  }
}));

// Serve static files from webapp
app.use(express.static(join(__dirname, '../webapp')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/dock-planning', dockPlanningRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main webapp for root
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../webapp/index.html'));
});

// Serve member portal
app.get('/member', (req, res) => {
  res.sendFile(join(__dirname, '../webapp/member.html'));
});

// Serve rear commodore portal
app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, '../webapp/admin.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Bordentown Yacht Club Dock Management System             ║
║                                                           ║
║  Server running on: http://localhost:${PORT}              ║
║                                                           ║
║  Available routes:                                        ║
║  - Main Portal:     http://localhost:${PORT}/             ║
║  - Member Portal:   http://localhost:${PORT}/member       ║
║  - Admin Portal:    http://localhost:${PORT}/admin        ║
║                                                           ║
║  API endpoints available at /api/*                        ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
