/**
 * Task service — task business logic, including role-aware access rules
 * and activity logging (bonus).
 */
const TaskModel = require('../models/task.model');
const UserModel = require('../models/user.model');
const ActivityLogModel = require('../models/activityLog.model');
const ApiError = require('../utils/ApiError');

const VALID_STATUS = ['pending', 'in_progress', 'completed'];

const TaskService = {
  async createTask({ title, description, assignedTo, status, dueDate }, actor) {
    const finalStatus = status || 'pending';
    if (!VALID_STATUS.includes(finalStatus)) {
      throw ApiError.badRequest(`status must be one of: ${VALID_STATUS.join(', ')}`);
    }

    // Ensure the assignee exists (also enforced by the FK, but a clean 400 is nicer).
    const assignee = await UserModel.findById(assignedTo);
    if (!assignee) throw ApiError.badRequest('assigned_to does not reference a valid user');

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
    if (!task) throw ApiError.notFound('Task not found');

    // Employees can only view their own tasks.
    if (actor.role === 'employee' && task.assigned_to !== actor.id) {
      throw ApiError.forbidden('You can only view tasks assigned to you');
    }
    return task;
  },

  async updateTask(id, fields, actor) {
    const task = await TaskModel.findById(id);
    if (!task) throw ApiError.notFound('Task not found');

    if (fields.status && !VALID_STATUS.includes(fields.status)) {
      throw ApiError.badRequest(`status must be one of: ${VALID_STATUS.join(', ')}`);
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
        throw ApiError.forbidden('You can only update tasks assigned to you');
      }
      if (fields.status === undefined) {
        throw ApiError.badRequest('Employees can only update the task status');
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
};

module.exports = TaskService;
