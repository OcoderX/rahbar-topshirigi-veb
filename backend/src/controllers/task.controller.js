/**
 * Task controller.
 */
const TaskService = require('../services/task.service');

const TaskController = {
  // POST /tasks  (admin only)
  async create(req, res) {
    const { title, description, assigned_to, status, due_date, audio_url, attachments } = req.body;
    const task = await TaskService.createTask(
      {
        title,
        description,
        assignedTo: assigned_to,
        status,
        dueDate: due_date,
        audioUrl: audio_url,
        attachments,
      },
      req.user
    );
    res.status(201).json({ data: task });
  },

  // GET /tasks  — admins see all, employees see their own.
  async list(req, res) {
    const { status, dueBefore, dueAfter, page, limit, sortBy, order } = req.query;
    const result = await TaskService.listTasks(
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

  // GET /tasks/:id
  async getOne(req, res) {
    const task = await TaskService.getTaskById(Number(req.params.id), req.user);
    res.json({ data: task });
  },

  // POST /tasks/:id/view — marks task viewed / in_progress by employee
  async markViewed(req, res) {
    const task = await TaskService.markViewed(Number(req.params.id), req.user);
    res.json({ data: task, message: 'Topshiriq qabul qilindi' });
  },

  // POST /tasks/:id/complete — employee completes with execution report
  async complete(req, res) {
    const { note, audio_url, attachments } = req.body;
    const task = await TaskService.completeTask(
      Number(req.params.id),
      { note, audioUrl: audio_url, attachments },
      req.user
    );
    res.json({ data: task, message: 'Topshiriq rahbar tasdig‘iga yuborildi' });
  },

  // POST /tasks/:id/approve — admin accepts and completes the task
  async approve(req, res) {
    const task = await TaskService.approveTask(Number(req.params.id), req.user);
    res.json({ data: task, message: 'Topshiriq tasdiqlandi va yakunlandi' });
  },

  // POST /tasks/:id/rework — admin rejects a result and requests corrections
  async sendToRework(req, res) {
    const task = await TaskService.sendToRework(
      Number(req.params.id),
      req.body.reason,
      req.user
    );
    res.json({ data: task, message: 'Topshiriq qayta ishlashga yuborildi' });
  },

  // PUT /tasks/:id
  async update(req, res) {
    const task = await TaskService.updateTask(Number(req.params.id), req.body, req.user);
    res.json({ data: task });
  },

  // POST /tasks/upload — upload file, image, audio, video
  async upload(req, res) {
    const { file, name, type, size } = req.body;
    const attachment = await TaskService.saveAttachment({ file, name, type, size });
    res.status(201).json({ data: attachment });
  },

  // GET /tasks/export/excel (admin only)
  async exportExcel(req, res) {
    const { buffer, filename } = await TaskService.exportExcel(req.user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  },

  // GET /tasks/download — stream/download file with correct filename & Content-Disposition
  async downloadAttachment(req, res) {
    const path = require('path');
    const fs = require('fs');

    const { url, name } = req.query;
    if (!url) {
      return res.status(400).json({ error: { message: 'Fayl manzili ko‘rsatilmadi' } });
    }

    let cleanUrl = String(url).split('?')[0];
    cleanUrl = cleanUrl.replace(/^[/\\]+/, '');
    if (cleanUrl.startsWith('uploads/')) {
      cleanUrl = cleanUrl.slice('uploads/'.length);
    }
    const safePath = path.normalize(cleanUrl).replace(/^(\.\.[/\\])+/, '');
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const fullPath = path.resolve(uploadsDir, safePath);

    // Prevent directory traversal
    if (!fullPath.startsWith(uploadsDir) || !fs.existsSync(fullPath)) {
      return res.status(404).json({ error: { message: 'Fayl topilmadi' } });
    }

    const rawName = name || path.basename(fullPath);
    const downloadName = String(rawName).replace(/[\r\n"']/g, '_').trim();
    res.download(fullPath, downloadName);
  },
};

module.exports = TaskController;
