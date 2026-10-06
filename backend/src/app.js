/**
 * Express application setup. Kept separate from server.js so it can be
 * imported in tests without binding to a port.
 */
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const taskRoutes = require('./routes/task.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check.
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// API routes.
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);
app.use('/activity-logs', activityLogRoutes);

// 404 + central error handler (must be last).
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
