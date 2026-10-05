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
      push('Vazifa yangilandi');
    } else {
      await taskApi.create(payload);
      push('Yangi vazifa yaratildi');
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
            <h1>Admin paneli</h1>
            <p className="lede">Jamoangizni boshqaring va yangi vazifalarni biriktiring.</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + Yangi vazifa
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {/* Stat tiles */}
        <div className="stats">
          <div className="card stat">
            <div className="n">{employees.length}</div>
            <div className="l">Xodimlar</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{total}</div>
            <div className="l">Jami vazifalar</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{stats.byStatus.in_progress || 0}</div>
            <div className="l">Jarayonda (ushbu sahifada)</div>
            <div className="bar"><i style={{ width: '60%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{stats.byStatus.completed || 0}</div>
            <div className="l">Bajarilgan (ushbu sahifada)</div>
            <div className="bar"><i style={{ width: '40%' }} /></div>
          </div>
        </div>

        {/* Filters */}
        <div className="card card-pad">
          <div className="section-title">Barcha vazifalar</div>
          <div className="filters">
            <div className="field">
              <label>Holati</label>
              <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Barcha holatlar</option>
                <option value="pending">Kutilmoqda</option>
                <option value="in_progress">Jarayonda</option>
                <option value="completed">Bajarildi</option>
              </select>
            </div>
            <div className="field">
              <label>Muddatigacha</label>
              <input type="date" className="input" value={dueBefore} onChange={(e) => setDueBefore(e.target.value)} />
            </div>
            <div className="field">
              <label>Saralash</label>
              <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="created_at">Eng yangilar</option>
                <option value="due_date">Muddati bo‘yicha</option>
                <option value="status">Holati bo‘yicha</option>
                <option value="title">Sarlavha bo‘yicha</option>
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
                Filtrlarni tozalash
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="tasks">
              <thead>
                <tr>
                  <th>Vazifa</th>
                  <th>Biriktirilgan</th>
                  <th>Holati</th>
                  <th>Bajarish muddati</th>
                  <th className="right">Amal</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="center-screen" style={{ height: 120 }}>
                        <span className="spinner" /> Vazifalar yuklanmoqda…
                      </div>
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">
                        <div className="big">Vazifalar topilmadi</div>
                        <div>Filtrlarni o‘zgartirib ko‘ring yoki yangi vazifa yarating.</div>
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
                      <td>{t.assignee_name || <span className="muted">Biriktirilmagan</span>}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>{t.due_date || <span className="muted">—</span>}</td>
                      <td className="right">
                        <button className="btn btn-sm" onClick={() => openEdit(t)}>
                          Tahrirlash
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
