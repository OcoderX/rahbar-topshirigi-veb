/**
 * Message Controller — handles HTTP requests for messages/chat.
 */
const MessageService = require('../services/message.service');

const MessageController = {
  // POST /messages
  async send(req, res) {
    const { receiver_id, receiver_ids, task_id, message, audio_url } = req.body;
    const result = await MessageService.sendMessage({
      senderId: req.user.id,
      receiverId: receiver_id,
      receiverIds: receiver_ids,
      taskId: task_id,
      message,
      audioUrl: audio_url,
    });
    res.status(201).json({ data: result, message: 'Xabar muvaffaqiyatli yuborildi' });
  },

  // GET /messages/inbox — overview of conversations
  async inbox(req, res) {
    const list = await MessageService.getConversationsList(req.user.id);
    res.json({ data: list });
  },

  // GET /messages/conversation/:userId — full chat with user
  async conversation(req, res) {
    const data = await MessageService.getConversation(req.user.id, Number(req.params.userId));
    res.json({ data });
  },

  // GET /messages/unread-count — total unread messages count
  async unreadCount(req, res) {
    const count = await MessageService.getUnreadCount(req.user.id);
    res.json({ count });
  },

  // POST /messages/read/:userId — mark conversation as read
  async markRead(req, res) {
    const result = await MessageService.markAsRead(req.user.id, Number(req.params.userId));
    res.json(result);
  },

  // GET /messages/task/:taskId — messages linked to a task
  async taskMessages(req, res) {
    const list = await MessageService.getTaskMessages(Number(req.params.taskId));
    res.json({ data: list });
  },

  // PUT /messages/:id — edit own message
  async edit(req, res) {
    const updated = await MessageService.editMessage(Number(req.params.id), req.body, req.user);
    res.json({ data: updated, message: 'Xabar muvaffaqiyatli tahrirlandi' });
  },

  // GET /messages/:id/history — get edit history
  async history(req, res) {
    const data = await MessageService.getEditHistory(Number(req.params.id), req.user);
    res.json({ data });
  },
};

module.exports = MessageController;
