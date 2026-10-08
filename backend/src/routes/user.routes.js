const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// All user routes require authentication.
router.use(authenticate);

// POST /users  (admin only — creates new user)
router.post(
  '/',
  authorize('admin'),
  validateBody([
    { field: 'name', required: true, type: 'string', maxLength: 100 },
    { field: 'email', required: true, type: 'email' },
    { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 128 },
    { field: 'role', enum: ['admin', 'employee'] },
  ]),
  asyncHandler(UserController.create)
);

// GET /users  (admin only)
router.get('/', authorize('admin'), asyncHandler(UserController.list));

// PUT /users/profile  (any authenticated user can update their own profile and avatar)
router.put('/profile', asyncHandler(UserController.updateProfile));

// GET /users/:id  (admin, or the employee themselves)
router.get('/:id', asyncHandler(UserController.getById));

// GET /users/:id/tasks  (admin, or the employee themselves)
router.get('/:id/tasks', asyncHandler(UserController.tasks));

module.exports = router;
