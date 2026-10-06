const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// All user routes require authentication.
router.use(authenticate);

// GET /users  (admin only)
router.get('/', authorize('admin'), asyncHandler(UserController.list));

// PUT /users/profile  (any authenticated user can update their own profile and avatar)
router.put('/profile', asyncHandler(UserController.updateProfile));

// GET /users/:id/tasks  (admin, or the employee themselves)
router.get('/:id/tasks', asyncHandler(UserController.tasks));

module.exports = router;
