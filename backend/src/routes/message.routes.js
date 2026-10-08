const express = require('express');
const MessageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

// POST /messages — send a message (text or voice)
router.post('/', asyncHandler(MessageController.send));

// GET /messages/inbox — conversations list with latest message and unread count
router.get('/inbox', asyncHandler(MessageController.inbox));

// GET /messages/unread-count — total unread messages count
router.get('/unread-count', asyncHandler(MessageController.unreadCount));

// GET /messages/conversation/:userId — conversation history with partner
router.get('/conversation/:userId', asyncHandler(MessageController.conversation));

// POST /messages/read/:userId — mark partner messages as read
router.post('/read/:userId', asyncHandler(MessageController.markRead));

// GET /messages/task/:taskId — messages linked to a specific task
router.get('/task/:taskId', asyncHandler(MessageController.taskMessages));

// PUT /messages/:id — edit own message
router.put('/:id', asyncHandler(MessageController.edit));

// GET /messages/:id/history — get edit history
router.get('/:id/history', asyncHandler(MessageController.history));

module.exports = router;
