/**
 * Activity log service (bonus).
 */
const ActivityLogModel = require('../models/activityLog.model');

const ActivityLogService = {
  listRecent(limit) {
    return ActivityLogModel.findRecent(limit);
  },
};

module.exports = ActivityLogService;
