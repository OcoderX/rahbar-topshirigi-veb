/**
 * User service — read operations on users.
 */
const UserModel = require('../models/user.model');
const TaskModel = require('../models/task.model');
const ApiError = require('../utils/ApiError');

const UserService = {
  listUsers({ role } = {}) {
    return UserModel.findAll({ role });
  },

  async getUserById(id) {
    const user = await UserModel.findById(id);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
    return user;
  },

  /**
   * Tasks belonging to a specific employee (paginated/filterable).
   * Admins may query anyone; employees may only query themselves.
   */
  async getTasksForUser(userId, opts = {}, actor) {
    if (actor && actor.role !== 'admin' && actor.id !== userId) {
      throw ApiError.forbidden('Faqat o‘zingizning vazifalaringizni ko‘ra olasiz');
    }
    const user = await UserModel.findById(userId);
    if (!user) throw ApiError.notFound('Foydalanuvchi topilmadi');
    return TaskModel.findAll({ ...opts, assignedTo: userId });
  },
};

module.exports = UserService;
