/**
 * Message Service — business logic for 1-to-1 and task-based messaging.
 */
const MessageModel = require('../models/message.model');
const UserModel = require('../models/user.model');
const ActivityLogModel = require('../models/activityLog.model');
const TaskService = require('./task.service');
const ApiError = require('../utils/ApiError');

const MessageService = {
  /**
   * Send a direct message or voice message to another user.
   */
  async sendMessage({ senderId, receiverId, taskId, message, audioUrl }) {
    if (!receiverId) {
      throw ApiError.badRequest('Xabar oluvchi foydalanuvchi ko‘rsatilmadi');
    }

    const receiver = await UserModel.findById(receiverId);
    if (!receiver) {
      throw ApiError.notFound('Xabar yuborilayotgan foydalanuvchi topilmadi');
    }

    const trimmedMsg = typeof message === 'string' ? message.trim() : '';

    if (!trimmedMsg && !audioUrl) {
      throw ApiError.badRequest('Xabar matni yoki ovozli xabar kiritilishi shart');
    }

    let finalAudioUrl = audioUrl || null;

    // If audio is base64 data URL, save it through the attachment pipeline
    if (audioUrl && typeof audioUrl === 'string' && audioUrl.startsWith('data:audio')) {
      try {
        const saved = await TaskService.saveAttachment({
          file: audioUrl,
          name: `voice_${Date.now()}.webm`,
          type: 'audio/webm',
          size: 0,
        });
        finalAudioUrl = saved.url;
      } catch (err) {
        console.error('Audio upload failed, keeping original:', err.message);
      }
    }

    const created = await MessageModel.create({
      senderId,
      receiverId: Number(receiverId),
      taskId: taskId ? Number(taskId) : null,
      message: trimmedMsg || null,
      audioUrl: finalAudioUrl,
    });

    // Audit log
    await ActivityLogModel.create({
      userId: senderId,
      action: 'SEND_MESSAGE',
      entity: 'message',
      entityId: created.id,
      details: `Sent message to ${receiver.name} (ID: ${receiver.id})${taskId ? ` regarding Task #${taskId}` : ''}`,
    }).catch(() => {});

    return created;
  },

  /**
   * Get all conversations overview for inbox.
   */
  async getConversationsList(userId) {
    return MessageModel.getConversationsList(userId);
  },

  /**
   * Get full conversation between two users and auto-mark incoming messages as read.
   */
  async getConversation(userId, partnerId) {
    const partner = await UserModel.findById(partnerId);
    if (!partner) {
      throw ApiError.notFound('Foydalanuvchi topilmadi');
    }

    // Auto mark incoming messages as read
    await MessageModel.markAsRead(userId, partnerId);

    const messages = await MessageModel.getConversation(userId, partnerId);
    return {
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        role: partner.role,
        position: partner.position,
        avatar: partner.avatar,
        district: partner.district,
        region: partner.region,
      },
      messages,
    };
  },

  /**
   * Get total unread count for current user.
   */
  async getUnreadCount(userId) {
    return MessageModel.getUnreadCount(userId);
  },

  /**
   * Mark messages from partner as read.
   */
  async markAsRead(userId, partnerId) {
    await MessageModel.markAsRead(userId, partnerId);
    return { success: true };
  },

  /**
   * Get messages linked to a specific task.
   */
  async getTaskMessages(taskId) {
    return MessageModel.getTaskMessages(taskId);
  },

  /**
   * Edit message text (only sender can edit their own message).
   */
  async editMessage(id, { message }, user) {
    if (!message || !message.trim()) {
      throw ApiError.badRequest('Tahrirlangan xabar matni bo‘sh bo‘lishi mumkin emas');
    }

    const current = await MessageModel.findById(id);
    if (!current) {
      throw ApiError.notFound('Xabar topilmadi');
    }

    if (current.sender_id !== user.id) {
      throw ApiError.forbidden('Faqat o‘zingiz yuborgan xabarni tahrirlashingiz mumkin');
    }

    const newTrimmed = message.trim();
    if (newTrimmed === current.message) {
      return current;
    }

    const updated = await MessageModel.updateMessage(id, newTrimmed, user.id);

    // Audit log
    await ActivityLogModel.create({
      userId: user.id,
      action: 'EDIT_MESSAGE',
      entity: 'message',
      entityId: id,
      details: `Edited message #${id}`,
    }).catch(() => {});

    return updated;
  },

  /**
   * Get version history of an edited message.
   */
  async getEditHistory(id, user) {
    const current = await MessageModel.findById(id);
    if (!current) {
      throw ApiError.notFound('Xabar topilmadi');
    }

    // Ensure user is participant in conversation
    if (current.sender_id !== user.id && current.receiver_id !== user.id && user.role !== 'admin') {
      throw ApiError.forbidden('Ushbu xabar tarixini ko‘rish huquqi yo‘q');
    }

    const history = await MessageModel.getEditHistory(id);
    return {
      messageId: id,
      currentMessage: current.message,
      isEdited: Boolean(current.is_edited),
      editedAt: current.edited_at,
      history,
    };
  },
};

module.exports = MessageService;
