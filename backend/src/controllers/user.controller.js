/**
 * User controller.
 */
const UserService = require('../services/user.service');

const UserController = {
  // GET /users  (admin only) — optional ?role=employee or ?excludeRole=admin
  async list(req, res) {
    const { role, excludeRole } = req.query;
    const users = await UserService.listUsers({ role, excludeRole });
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

  // PUT /users/profile — update current authenticated user's profile and avatar
  async updateProfile(req, res) {
    const { name, position, avatar } = req.body;
    const updated = await UserService.updateProfile(req.user.id, { name, position, avatar });
    res.json({
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        position: updated.position,
        hierarchy_rank: updated.hierarchy_rank,
        territory_type: updated.territory_type,
        region: updated.region,
        district: updated.district,
        avatar: updated.avatar,
      },
      message: 'Profil muvaffaqiyatli yangilandi',
    });
  },
};

module.exports = UserController;
