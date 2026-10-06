/**
 * Express application setup. Kept separate from server.js so it can be
 * imported in tests without binding to a port.
 */
const path = require('path');
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
// A 25 MB file grows to roughly 33 MB when encoded as base64 JSON.
app.use(express.json({ limit: '40mb' }));
app.use(express.urlencoded({ extended: false, limit: '40mb' }));

// Static file serving for user uploads and avatars.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/avatars', express.static(path.join(__dirname, '../uploads/avatars')));

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
