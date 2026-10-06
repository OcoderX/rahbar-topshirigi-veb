const express = require('express');
const TaskController = require('../controllers/task.controller');
const { authenticate, authenticateDownload, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Native browser download. The form POST lets Content-Disposition control the
// filename without exposing the JWT in the URL.
router.post(
  '/export/excel/download',
  authenticateDownload,
  authorize('admin'),
  asyncHandler(TaskController.exportExcel)
);

// All task routes require authentication.
router.use(authenticate);

// POST /tasks  (admin only)
router.post(
  '/',
  authorize('admin'),
  validateBody([
    { field: 'title', required: true, type: 'string', maxLength: 200 },
    { field: 'description', type: 'string' },
    { field: 'assigned_to', required: true },
    { field: 'status', enum: ['pending', 'in_progress', 'completed'] },
  ]),
  asyncHandler(TaskController.create)
);

// GET /tasks  (admins: all tasks, employees: own tasks)
router.get('/', asyncHandler(TaskController.list));

// GET /tasks/export/excel  (admin only)
router.get('/export/excel', authorize('admin'), asyncHandler(TaskController.exportExcel));

// GET /tasks/:id
router.get('/:id', asyncHandler(TaskController.getOne));

// PUT /tasks/:id
router.put(
  '/:id',
  validateBody([
    { field: 'title', type: 'string', maxLength: 200 },
    { field: 'description', type: 'string' },
    { field: 'status', enum: ['pending', 'in_progress', 'completed'] },
  ]),
  asyncHandler(TaskController.update)
);

module.exports = router;
