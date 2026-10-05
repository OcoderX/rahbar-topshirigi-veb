import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../api/endpoints';

const PAGE_SIZE = 8;

// The forward progression an employee can move a task through.
const NEXT_STATUS = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: null,
};
const NEXT_LABEL = {
  pending: 'Boshlash',
  in_progress: 'Bajarildi deb belgilash',
};
const STATUS_UZ = {
  pending: 'Kutilmoqda',
  in_progress: 'Jarayonda',
  completed: 'Bajarildi',
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { push } = useToast();

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // GET /tasks already scopes employees to their own tasks server-side.
      const res = await taskApi.list({
        status: statusFilter,
        sortBy: 'due_date',
        order: 'asc',
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
  }, [statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    return tasks.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      { pending: 0, in_progress: 0, completed: 0 }
    );
  }, [tasks]);

  async function advance(task) {
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    setUpdatingId(task.id);
    try {
      await taskApi.update(task.id, { status: next });
      push(`"${task.title}" holati yangilandi: ${STATUS_UZ[next] || next}`);
      load();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container page">
        <header className="page-head">
          <div>
            <h1>Mening vazifalarim</h1>
            <p className="lede">Salom, {user?.name?.split(' ')[0]} — sizga biriktirilgan vazifalar ro‘yxati.</p>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <div className="stats">
          <div className="card stat">
            <div className="n">{total}</div>
            <div className="l">Menga biriktirilgan</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{counts.pending}</div>
            <div className="l">Kutilmoqda (ushbu sahifada)</div>
            <div className="bar"><i style={{ width: '50%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{counts.in_progress}</div>
            <div className="l">Jarayonda (ushbu sahifada)</div>
            <div className="bar"><i style={{ width: '70%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{counts.completed}</div>
            <div className="l">Bajarilgan (ushbu sahifada)</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title">Vazifalar ro‘yxati</div>
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
          </div>

          <div className="table-wrap">
            <table className="tasks">
              <thead>
                <tr>
                  <th>Vazifa</th>
                  <th>Holati</th>
                  <th>Bajarish muddati</th>
                  <th className="right">Harakat</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="center-screen" style={{ height: 120 }}>
                        <span className="spinner" /> Yuklanmoqda…
                      </div>
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">
                        <div className="big">Hozircha hech narsa yo‘q</div>
                        <div>Ushbu filtr bo‘yicha sizda vazifalar mavjud emas.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => {
                    const next = NEXT_STATUS[t.status];
                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="task-title">{t.title}</div>
                          {t.description && <div className="task-desc">{t.description}</div>}
                        </td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>{t.due_date || <span className="muted">—</span>}</td>
                        <td className="right">
                          {next ? (
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={updatingId === t.id}
                              onClick={() => advance(t)}
                            >
                              {updatingId === t.id ? '…' : NEXT_LABEL[t.status]}
                            </button>
                          ) : (
                            <span className="muted">Bajarildi ✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} limit={PAGE_SIZE} total={total} onChange={setPage} />
        </div>
      </div>
    </>
  );
}
