/**
 * Task service — task business logic, including role-aware access rules
 * and activity logging (bonus).
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

const VALID_STATUS = ['pending', 'in_progress', 'completed'];

const TaskService = {
  async createTask({ title, description, assignedTo, status, dueDate }, actor) {
    const finalStatus = status || 'pending';
    if (!VALID_STATUS.includes(finalStatus)) {
      throw ApiError.badRequest(`Holat quyidagilardan biri bo'lishi kerak: ${VALID_STATUS.join(', ')}`);
    }

    // Ensure the assignee exists (also enforced by the FK, but a clean 400 is nicer).
    const assignee = await UserModel.findById(assignedTo);
    if (!assignee) throw ApiError.badRequest('Biriktirilgan xodim tizimda topilmadi');

    const task = await TaskModel.create({
      title,
      description: description || null,
      assignedTo,
      status: finalStatus,
      dueDate: dueDate || null,
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
   * List tasks. Admins see everything; employees are scoped to their own tasks
   * regardless of any assignedTo filter they try to pass.
   */
  listTasks(opts, actor) {
    if (actor.role === 'employee') {
      return TaskModel.findAll({ ...opts, assignedTo: actor.id });
    }
    return TaskModel.findAll(opts);
  },

  async getTaskById(id, actor) {
    const task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Vazifa topilmadi');

    // Employees can only view their own tasks.
    if (actor.role === 'employee' && task.assigned_to !== actor.id) {
      throw ApiError.forbidden('Faqat o‘zingizga biriktirilgan vazifalarni ko‘ra olasiz');
    }
    return task;
  },

  async updateTask(id, fields, actor) {
    const task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Vazifa topilmadi');

    if (fields.status && !VALID_STATUS.includes(fields.status)) {
      throw ApiError.badRequest(`Holat quyidagilardan biri bo'lishi kerak: ${VALID_STATUS.join(', ')}`);
    }

    const updates = {};

    if (actor.role === 'admin') {
      // Admins may edit any field.
      if (fields.title !== undefined) updates.title = fields.title;
      if (fields.description !== undefined) updates.description = fields.description;
      if (fields.status !== undefined) updates.status = fields.status;
      if (fields.due_date !== undefined) updates.due_date = fields.due_date;
      if (fields.assigned_to !== undefined) updates.assigned_to = fields.assigned_to;
    } else {
      // Employees: only their own task, and only the status field.
      if (task.assigned_to !== actor.id) {
        throw ApiError.forbidden('Faqat o‘zingizga biriktirilgan vazifalarni o‘zgartira olasiz');
      }
      if (fields.status === undefined) {
        throw ApiError.badRequest('Xodimlar faqat vazifa holatini yangilashlari mumkin');
      }
      updates.status = fields.status;
    }

    const updated = await TaskModel.update(id, updates);

    await ActivityLogModel.create({
      userId: actor.id,
      action: 'UPDATE_TASK',
      entity: 'task',
      entityId: id,
      details: `Updated task #${id} (${Object.keys(updates).join(', ')})`,
    });

    return updated;
  },

  /**
   * Generates a multi-sheet, executive Excel report (Umumiy, Xodimlar, Vazifalar)
   * identical to hisobot_YYYY-MM-DD_HH-mm.xlsx.
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
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
      const filename = `hisobot_${timestamp}.xlsx`;

      await ActivityLogModel.create({
        userId: actor.id,
        action: 'EXPORT_REPORT',
        entity: 'report',
        entityId: null,
        details: `Exported Excel activity report (${tasks.length} tasks, ${employees.length} employees)`,
      });

      return { buffer, filename };
    } finally {
      try {
        if (fs.existsSync(tempInput)) await fs.promises.unlink(tempInput);
      } catch (_) {}
      try {
        if (fs.existsSync(tempOutput)) await fs.promises.unlink(tempOutput);
      } catch (_) {}
    }
  },
};

module.exports = TaskService;
