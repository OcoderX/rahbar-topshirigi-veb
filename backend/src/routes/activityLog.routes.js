const express = require('express');
const ActivityLogController = require('../controllers/activityLog.controller');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /activity-logs  (admin only)
router.get('/', authenticate, authorize('admin'), asyncHandler(ActivityLogController.list));

module.exports = router;
