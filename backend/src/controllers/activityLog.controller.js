/**
 * Activity log controller (bonus).
 */
const ActivityLogService = require('../services/activityLog.service');

const ActivityLogController = {
  // GET /activity-logs  (admin only)
  async list(req, res) {
    const logs = await ActivityLogService.listRecent(Number(req.query.limit) || 50);
    res.json({ data: logs });
  },
};

module.exports = ActivityLogController;
