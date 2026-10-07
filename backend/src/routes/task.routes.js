const express = require('express');
const TaskController = require('../controllers/task.controller');
const { authenticate, authenticateDownload, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Native browser download
router.post(
  '/export/excel/download',
  authenticateDownload,
  authorize('admin'),
  asyncHandler(TaskController.exportExcel)
);

// All task routes require authentication.
router.use(authenticate);

// POST /tasks/upload — upload media/files/audio/video
router.post('/upload', asyncHandler(TaskController.upload));

// POST /tasks  (admin only)
router.post(
  '/',
  authorize('admin'),
  validateBody([
    { field: 'title', required: true, type: 'string', maxLength: 200 },
    { field: 'description', type: 'string' },
    { field: 'assigned_to', required: true },
  ]),
  asyncHandler(TaskController.create)
);

// GET /tasks  (admins: all tasks, employees: own tasks)
router.get('/', asyncHandler(TaskController.list));

// GET /tasks/export/excel  (admin only)
router.get('/export/excel', authorize('admin'), asyncHandler(TaskController.exportExcel));

// GET /tasks/download — download file attachment with original filename
router.get('/download', asyncHandler(TaskController.downloadAttachment));

// GET /tasks/:id
router.get('/:id', asyncHandler(TaskController.getOne));

// POST /tasks/:id/view — employee opens/accepts task
router.post('/:id/view', asyncHandler(TaskController.markViewed));

// POST /tasks/:id/complete — employee completes with execution report
router.post('/:id/complete', asyncHandler(TaskController.complete));

// POST /tasks/:id/approve — admin accepts a submitted result
router.post('/:id/approve', authorize('admin'), asyncHandler(TaskController.approve));

// POST /tasks/:id/rework — admin returns a completed task for correction
router.post(
  '/:id/rework',
  authorize('admin'),
  validateBody([
    { field: 'reason', required: true, type: 'string', maxLength: 2000 },
  ]),
  asyncHandler(TaskController.sendToRework)
);

// PUT /tasks/:id
router.put(
  '/:id',
  validateBody([
    { field: 'title', type: 'string', maxLength: 200 },
    { field: 'description', type: 'string' },
    { field: 'status', enum: ['pending', 'in_progress', 'submitted', 'completed'] },
  ]),
  asyncHandler(TaskController.update)
);

module.exports = router;
