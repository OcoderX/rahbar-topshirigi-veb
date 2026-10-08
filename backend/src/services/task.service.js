/**
 * Task service — task business logic, media handling, and role-aware rules.
 */
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const TaskModel = require('../models/task.model');
const UserModel = require('../models/user.model');
const ActivityLogModel = require('../models/activityLog.model');
const ApiError = require('../utils/ApiError');

const VALID_STATUS = ['pending', 'in_progress', 'submitted', 'completed'];

const TaskService = {
  async createTask(
    { title, description, assignedTo, status, dueDate, audioUrl, attachments },
    actor
  ) {
    const finalStatus = status || 'pending';
    if (!VALID_STATUS.includes(finalStatus)) {
      throw ApiError.badRequest(`Holat quyidagilardan biri bo'lishi kerak: ${VALID_STATUS.join(', ')}`);
    }

    // Ensure the assignee exists
    const assignee = await UserModel.findById(assignedTo);
    if (!assignee) throw ApiError.badRequest('Biriktirilgan xodim tizimda topilmadi');

    const task = await TaskModel.create({
      title,
      description: description || null,
      assignedTo,
      status: finalStatus,
      dueDate: dueDate || null,
      audioUrl: audioUrl || null,
      attachments: attachments || [],
    });

    await ActivityLogModel.create({
      userId: actor.id,
      action: 'CREATE_TASK',
      entity: 'task',
      entityId: task.id,
      details: `Created "${task.title}" for ${assignee.name}`,
    });

    return task;
  },

  /**
   * List tasks. Admins see everything; employees are scoped to their own tasks.
   */
  listTasks(opts, actor) {
    if (actor.role === 'employee') {
      return TaskModel.findAll({ ...opts, assignedTo: actor.id });
    }
    return TaskModel.findAll(opts);
  },

  async getTaskById(id, actor) {
    let task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Vazifa topilmadi');

    // Employees can only view their own tasks.
    if (actor.role === 'employee' && task.assigned_to !== actor.id) {
      throw ApiError.forbidden('Faqat o‘zingizga biriktirilgan vazifalarni ko‘ra olasiz');
    }

    // When an employee opens/reads a task that is currently 'pending',
    // automatically transition status to 'in_progress' and set viewed_at timestamp!
    if (actor.role === 'employee' && task.status === 'pending') {
      task = await TaskModel.markViewed(id, actor.id);
      await ActivityLogModel.create({
        userId: actor.id,
        action: 'VIEW_TASK',
        entity: 'task',
        entityId: id,
        details: `Employee opened task #${id} (status transitioned to in_progress)`,
      });
    }

    return task;
  },

  /**
   * Explicitly mark task as viewed / accepted by employee.
   */
  async markViewed(id, actor) {
    const task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Vazifa topilmadi');
    if (actor.role === 'employee' && task.assigned_to !== actor.id) {
      throw ApiError.forbidden('Faqat o‘zingizga biriktirilgan vazifalarni qabul qila olasiz');
    }

    const updated = await TaskModel.markViewed(id, actor.id);
    return updated;
  },

  /** Employee submits the result for manager approval. */
  async completeTask(id, { note, audioUrl, attachments }, actor) {
    const task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Vazifa topilmadi');
    if (actor.role !== 'employee' || task.assigned_to !== actor.id) {
      throw ApiError.forbidden('Faqat o‘zingizga biriktirilgan vazifalarni bajara olasiz');
    }
    if (task.status !== 'in_progress') {
      throw ApiError.badRequest('Faqat ko‘rilgan topshiriqni rahbar tasdig‘iga yuborish mumkin');
    }

    const updated = await TaskModel.complete(id, { note, audioUrl, attachments });

    await ActivityLogModel.create({
      userId: actor.id,
      action: 'COMPLETE_TASK',
      entity: 'task',
      entityId: id,
      details: `Completed task #${id} with report`,
    });

    return updated;
  },

  /** Manager accepts a submitted result and marks the task completed. */
  async approveTask(id, actor) {
    const task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Vazifa topilmadi');
    if (task.status !== 'submitted') {
      throw ApiError.badRequest('Faqat rahbar tasdig‘idagi topshiriqni tasdiqlash mumkin');
    }

    const updated = await TaskModel.approve(id, actor.id);
    await ActivityLogModel.create({
      userId: actor.id,
      action: 'APPROVE_TASK',
      entity: 'task',
      entityId: id,
      details: `Task #${id} approved and completed`,
    });
    return updated;
  },

  /**
   * Admin rejects a submitted result and returns the task to in-progress.
   * The previous report remains available as context for the correction.
   */
  async sendToRework(id, reason, actor) {
    const task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Vazifa topilmadi');
    if (task.status !== 'submitted') {
      throw ApiError.badRequest('Faqat rahbar tasdig‘idagi topshiriqni qayta ishlashga yuborish mumkin');
    }

    const cleanReason = String(reason || '').trim();
    if (!cleanReason) {
      throw ApiError.badRequest('Qayta ishlash sababini kiriting');
    }

    const updated = await TaskModel.sendToRework(id, {
      reason: cleanReason,
      requestedBy: actor.id,
    });

    await ActivityLogModel.create({
      userId: actor.id,
      action: 'SEND_TO_REWORK',
      entity: 'task',
      entityId: id,
      details: `Task #${id} returned for rework: ${cleanReason}`.slice(0, 500),
    });

    return updated;
  },

  async updateTask(id, fields, actor) {
    const task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Vazifa topilmadi');

    if (fields.status && !VALID_STATUS.includes(fields.status)) {
      throw ApiError.badRequest(`Holat quyidagilardan biri bo'lishi kerak: ${VALID_STATUS.join(', ')}`);
    }

    const updates = {};

    if (actor.role === 'admin') {
      // Admins may edit any field
      if (fields.title !== undefined) updates.title = fields.title;
      if (fields.description !== undefined) updates.description = fields.description;
      if (fields.status !== undefined) {
        updates.status = fields.status;
        if (fields.status === 'completed' && !task.completed_at) {
          updates.completed_at = new Date();
          updates.approved_by = actor.id;
        }
      }
      if (fields.due_date !== undefined) updates.due_date = fields.due_date;
      if (fields.assigned_to !== undefined) updates.assigned_to = fields.assigned_to;
      if (fields.audio_url !== undefined) updates.audio_url = fields.audio_url;
      if (fields.attachments !== undefined) updates.attachments = fields.attachments;
    } else {
      // Employees: only their own task, cannot mark 'completed' directly
      if (task.assigned_to !== actor.id) {
        throw ApiError.forbidden('Faqat o‘zingizga biriktirilgan vazifalarni o‘zgartira olasiz');
      }
      if (fields.status === 'completed') {
        throw ApiError.forbidden(
          'Topshiriqni to‘g‘ridan-to‘g‘ri yakunlash (bajarildi qilish) taqiqlangan. Hisobot yuboring, uni faqat rahbar tasdiqlaydi'
        );
      }
      if (fields.status && fields.status !== 'in_progress' && fields.status !== 'submitted') {
        throw ApiError.badRequest('Xodim faqat jarayonda yoki tasdiqqa yuborish holatini o‘rnatishi mumkin');
      }
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.completion_note !== undefined) updates.completion_note = fields.completion_note;
      if (fields.completion_audio !== undefined) updates.completion_audio = fields.completion_audio;
      if (fields.completion_attachments !== undefined) updates.completion_attachments = fields.completion_attachments;
      if (fields.status === 'submitted' && !task.submitted_at) {
        updates.submitted_at = new Date();
      }
    }

    const updated = await TaskModel.update(id, updates);

    await ActivityLogModel.create({
      userId: actor.id,
      action: 'UPDATE_TASK',
      entity: 'task',
      entityId: id,
      details: `Updated task #${id}`,
    });

    return updated;
  },

  /**
   * Save uploaded file or voice recording from base64 string.
   * Whitelist enforced: jpg, png, xls, xlsx, pdf, doc, docx, ogg, mp3, mp4 (+ webp, wav, webm, txt).
   * File size strictly capped at 20MB.
   */
  async saveAttachment({ file, name, type, size }) {
    if (!file || typeof file !== 'string') {
      throw ApiError.badRequest('Fayl ma’lumoti yuborilmadi');
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

    const ALLOWED_EXTENSIONS = new Set([
      'jpg',
      'jpeg',
      'png',
      'webp',
      'xls',
      'xlsx',
      'pdf',
      'doc',
      'docx',
      'ogg',
      'opus',
      'mp3',
      'wav',
      'mp4',
      'webm',
      'txt',
    ]);

    const DANGEROUS_EXTENSIONS = new Set([
      'html',
      'htm',
      'xhtml',
      'svg',
      'js',
      'mjs',
      'cjs',
      'exe',
      'bat',
      'cmd',
      'sh',
      'php',
      'phtml',
      'py',
      'pl',
      'jar',
      'vbs',
      'msi',
      'com',
    ]);

    let base64Data = file;
    let detectedExt = null;

    if (file.startsWith('data:')) {
      const match = file.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mime = match[1].toLowerCase();
        base64Data = match[2];

        // Explicitly block dangerous types
        if (
          mime.includes('html') ||
          mime.includes('svg') ||
          mime.includes('javascript') ||
          mime.includes('application/x-')
        ) {
          throw ApiError.badRequest('Xavfli fayl formati aniqlandi. Ushbu faylni yuklash taqiqlangan');
        }

        if (mime.includes('audio/ogg') || mime.includes('audio/opus')) detectedExt = 'ogg';
        else if (mime.includes('audio/webm')) detectedExt = 'webm';
        else if (mime.includes('audio/wav')) detectedExt = 'wav';
        else if (mime.includes('audio/mp3') || mime.includes('audio/mpeg')) detectedExt = 'mp3';
        else if (mime.includes('video/mp4')) detectedExt = 'mp4';
        else if (mime.includes('video/webm')) detectedExt = 'webm';
        else if (mime.includes('pdf')) detectedExt = 'pdf';
        else if (mime.includes('spreadsheetml') || mime.includes('excel') || mime.includes('ms-excel')) detectedExt = 'xlsx';
        else if (mime.includes('msword') || mime.includes('wordprocessingml')) detectedExt = 'docx';
        else if (mime.includes('jpeg') || mime.includes('jpg')) detectedExt = 'jpg';
        else if (mime.includes('png')) detectedExt = 'png';
        else if (mime.includes('webp')) detectedExt = 'webp';
        else if (mime.includes('text/plain')) detectedExt = 'txt';
      }
    }

    let ext = detectedExt || 'bin';

    if (name && name.includes('.')) {
      const parts = name.split('.');
      const rawExt = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');

      if (DANGEROUS_EXTENSIONS.has(rawExt)) {
        throw ApiError.badRequest(`.${rawExt} kengaytmali xavfli fayllarni yuklash qat’iyan taqiqlangan`);
      }
      if (ALLOWED_EXTENSIONS.has(rawExt)) {
        ext = rawExt;
      }
    }

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw ApiError.badRequest(
        'Ruxsat etilmagan fayl formati. Faqat quyidagi formatdagi fayllarga ruxsat berilgan: jpg, png, xls, xlsx, pdf, doc, docx, ogg, mp3, mp4'
      );
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > MAX_FILE_SIZE) {
      throw ApiError.badRequest('Fayl hajmi 20MB dan oshmasligi kerak');
    }

    const safeBaseName = (name || 'fayl')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 30);

    const filename = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeBaseName}.${ext}`;
    const uploadsDir = path.join(__dirname, '../../uploads/tasks');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    // Mirror to frontend public
    try {
      const frontendPublicDir = path.join(__dirname, '../../../frontend/public/uploads/tasks');
      if (fs.existsSync(frontendPublicDir)) {
        await fs.promises.writeFile(path.join(frontendPublicDir, filename), buffer);
      }
    } catch (_e) {}

    const url = `/uploads/tasks/${filename}`;
    return {
      url,
      name: name || filename,
      type: type || `application/${ext}`,
      size: size || buffer.length,
    };
  },

  /**
   * Generates a multi-sheet Excel report.
   */
  async exportExcel(actor) {
    const employees = await UserModel.findAll('employee');
    const tasksResult = await TaskModel.findAll({
      page: 1,
      limit: 100000,
      sortBy: 'created_at',
      order: 'desc',
    });
    const tasks = tasksResult.data || [];

    const rand = Math.random().toString(36).substring(2, 9);
    const tempInput = path.join(os.tmpdir(), `report_in_${Date.now()}_${rand}.json`);
    const tempOutput = path.join(os.tmpdir(), `report_out_${Date.now()}_${rand}.xlsx`);

    const payload = {
      author: { name: actor.name, email: actor.email },
      users: employees,
      tasks,
      uploadsDir: path.resolve(__dirname, '../../uploads'),
      serverUrl: process.env.BASE_URL || 'http://localhost:5000',
    };

    const scriptPath = path.join(__dirname, '..', 'utils', 'report_generator.py');

    try {
      await fs.promises.writeFile(tempInput, JSON.stringify(payload), 'utf-8');

      await execFileAsync('python', [scriptPath, tempInput, tempOutput], {
        windowsHide: true,
        timeout: 30000,
      });

      const buffer = await fs.promises.readFile(tempOutput);
      const now = new Date();
      const pad = (v) => String(v).padStart(2, '0');
      const filename = `hisobot_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.xlsx`;

      return { buffer, filename };
    } finally {
      await fs.promises.unlink(tempInput).catch(() => {});
      await fs.promises.unlink(tempOutput).catch(() => {});
    }
  },
};

module.exports = TaskService;
