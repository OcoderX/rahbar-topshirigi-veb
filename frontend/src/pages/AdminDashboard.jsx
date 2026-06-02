import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import TaskModal from '../components/TaskModal';
import { useToast } from '../components/Toast';
import { taskApi, userApi } from '../api/endpoints';

const PAGE_SIZE = 8;

export default function AdminDashboard() {
  const { push } = useToast();

  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters (bonus).
  const [statusFilter, setStatusFilter] = useState('');
  const [dueBefore, setDueBefore] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  // Modal state.
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await taskApi.list({
        status: statusFilter,
        dueBefore,
        sortBy,
        order: sortBy === 'due_date' ? 'asc' : 'desc',
        page,
        limit: PAGE_SIZE,
      });
      setTasks(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dueBefore, sortBy, page]);

  // Load employees once.
  useEffect(() => {
    userApi
      .list('employee')
      .then(setEmployees)
      .catch((err) => setError(err.message));
  }, []);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dueBefore, sortBy]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const stats = useMemo(() => {
    // These reflect the current (filtered) page-set total via separate count;
    // for headline numbers we approximate from loaded tasks + total.
    const byStatus = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    return { byStatus };
  }, [tasks]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(task) {
    setEditing(task);
    setModalOpen(true);
  }

  async function handleSubmit(payload) {
    if (editing) {
      await taskApi.update(editing.id, payload);
      push('Task updated');
    } else {
      await taskApi.create(payload);
      push('Task created');
    }
    setModalOpen(false);
    setEditing(null);
    loadTasks();
  }

  return (
    <>
      <Navbar />
      <div className="container page">
        <header className="page-head">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="lede">Manage your team and assign work.</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + New Task
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {/* Stat tiles */}
        <div className="stats">
          <div className="card stat">
            <div className="n">{employees.length}</div>
            <div className="l">Employees</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{total}</div>
            <div className="l">Total tasks</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{stats.byStatus.in_progress || 0}</div>
            <div className="l">In progress (this page)</div>
            <div className="bar"><i style={{ width: '60%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{stats.byStatus.completed || 0}</div>
            <div className="l">Completed (this page)</div>
            <div className="bar"><i style={{ width: '40%' }} /></div>
          </div>
        </div>

        {/* Filters */}
        <div className="card card-pad">
          <div className="section-title">All Tasks</div>
          <div className="filters">
            <div className="field">
              <label>Status</label>
              <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="field">
              <label>Due before</label>
              <input type="date" className="input" value={dueBefore} onChange={(e) => setDueBefore(e.target.value)} />
            </div>
            <div className="field">
              <label>Sort by</label>
              <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="created_at">Newest</option>
                <option value="due_date">Due date</option>
                <option value="status">Status</option>
                <option value="title">Title</option>
              </select>
            </div>
            {(statusFilter || dueBefore) && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setStatusFilter('');
                  setDueBefore('');
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="tasks">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned to</th>
                  <th>Status</th>
                  <th>Due date</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="center-screen" style={{ height: 120 }}>
                        <span className="spinner" /> Loading tasks…
                      </div>
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">
                        <div className="big">No tasks found</div>
                        <div>Try adjusting filters or create a new task.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="task-title">{t.title}</div>
                        {t.description && <div className="task-desc">{t.description}</div>}
                      </td>
                      <td>{t.assignee_name || <span className="muted">Unassigned</span>}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>{t.due_date || <span className="muted">—</span>}</td>
                      <td className="right">
                        <button className="btn btn-sm" onClick={() => openEdit(t)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} limit={PAGE_SIZE} total={total} onChange={setPage} />
        </div>
      </div>

      {modalOpen && (
        <TaskModal
          task={editing}
          employees={employees}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
