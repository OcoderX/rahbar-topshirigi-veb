/**
 * User controller.
 */
const UserService = require('../services/user.service');

const UserController = {
  // GET /users  (admin only) — optional ?role=employee filter
  async list(req, res) {
    const { role } = req.query;
    const users = await UserService.listUsers({ role });
    res.json({ data: users });
  },

  // GET /users/:id/tasks — tasks for a specific employee (paginated/filterable)
  async tasks(req, res) {
    const { id } = req.params;
    const { status, dueBefore, dueAfter, page, limit, sortBy, order } = req.query;
    const result = await UserService.getTasksForUser(
      Number(id),
      {
        status,
        dueBefore,
        dueAfter,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        sortBy,
        order,
      },
      req.user
    );
    res.json(result);
  },
};

module.exports = UserController;
