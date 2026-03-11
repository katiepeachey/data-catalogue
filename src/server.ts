import express from 'express';
import session from 'express-session';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Extend session type
declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

import { runMigrations } from './db/migrate';
import { startSyncScheduler } from './sync/scheduler';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import syncRouter from './routes/sync';
import apiRouter from './routes/api';

// Run DB migrations on startup
runMigrations();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'changeme-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set true in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);

// Serve static files from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/admin', authRouter);
app.use('/admin', adminRouter);
app.use('/admin', syncRouter);
app.use('/api', apiRouter);

// Root redirect — handled by express.static (serves public/index.html)
// Fallback redirect if static file not found
app.get('/', (_req, res) => {
  res.redirect('/index.html');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startSyncScheduler();
});

export default app;
