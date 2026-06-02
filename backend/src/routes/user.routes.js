const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// All user routes require authentication.
router.use(authenticate);

// GET /users  (admin only)
router.get('/', authorize('admin'), asyncHandler(UserController.list));

// GET /users/:id/tasks  (admin, or the employee themselves)
router.get('/:id/tasks', asyncHandler(UserController.tasks));

module.exports = router;
