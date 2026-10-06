const path = require('path');
const fs = require('fs');
const UserModel = require('../models/user.model');
const TaskModel = require('../models/task.model');
const ApiError = require('../utils/ApiError');

const UserService = {
  listUsers(opts = {}) {
    return UserModel.findAll(opts);
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

  /**
   * Allows any user (employee or admin) to update their own profile details and avatar.
   */
  async updateProfile(userId, { name, position, avatar }) {
    let avatarUrl = avatar;
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:image/')) {
      const matches = avatar.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `avatar_${userId}_${Date.now()}.${ext}`;
        const uploadsDir = path.join(__dirname, '../../uploads/avatars');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, filename);
        await fs.promises.writeFile(filePath, buffer);
        avatarUrl = `/uploads/avatars/${filename}`;

        try {
          const frontendPublicDir = path.join(__dirname, '../../../frontend/public/avatars');
          if (fs.existsSync(frontendPublicDir)) {
            await fs.promises.writeFile(path.join(frontendPublicDir, filename), buffer);
          }
        } catch (_e) {}
      }
    }

    const updated = await UserModel.updateProfile(userId, { name, position, avatar: avatarUrl });
    return updated;
  },
};

module.exports = UserService;
