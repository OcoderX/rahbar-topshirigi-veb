const path = require('path');
const fs = require('fs');
const UserModel = require('../models/user.model');
const TaskModel = require('../models/task.model');
const ApiError = require('../utils/ApiError');
const AuthService = require('./auth.service');

const UserService = {
  createUser(data) {
    return AuthService.register(data).then((r) => r.user);
  },

  listUsers(opts = {}) {
    return UserModel.findAll(opts);
  },

  async getUserById(id, actor) {
    if (actor && actor.role !== 'admin' && actor.id !== id) {
      throw ApiError.forbidden('Faqat o‘z profilingiz ma’lumotlarini ko‘ra olasiz');
    }
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
      const matches = avatar.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches) {
        const rawType = matches[1].toLowerCase();
        const ALLOWED_IMAGE_FORMATS = {
          jpeg: 'jpg',
          jpg: 'jpg',
          png: 'png',
          webp: 'webp',
        };

        const ext = ALLOWED_IMAGE_FORMATS[rawType];
        if (!ext) {
          throw ApiError.badRequest('Profil rasmi faqat jpg, png yoki webp formatda bo‘lishi kerak');
        }

        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 5 * 1024 * 1024) {
          throw ApiError.badRequest('Profil rasmi hajmi 5MB dan oshmasligi kerak');
        }

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
    } else if (avatar === '' || avatar === null) {
      avatarUrl = null;
    }

    const updated = await UserModel.updateProfile(userId, { name, position, avatar: avatarUrl });
    return updated;
  },
};

module.exports = UserService;
