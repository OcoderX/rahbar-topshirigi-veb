/**
 * Task controller.
 */
const TaskService = require('../services/task.service');

const TaskController = {
  // POST /tasks  (admin only)
  async create(req, res) {
    const { title, description, assigned_to, status, due_date } = req.body;
    const task = await TaskService.createTask(
      { title, description, assignedTo: assigned_to, status, dueDate: due_date },
      req.user
    );
    res.status(201).json({ data: task });
  },

  // GET /tasks  — admins see all, employees see their own. Supports filters + pagination.
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

  // PUT /tasks/:id
  async update(req, res) {
    const task = await TaskService.updateTask(Number(req.params.id), req.body, req.user);
    res.json({ data: task });
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
};

module.exports = TaskController;
