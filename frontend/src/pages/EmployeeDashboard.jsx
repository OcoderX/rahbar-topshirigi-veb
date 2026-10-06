import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import ProfileModal from '../components/ProfileModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../api/endpoints';

const PAGE_SIZE = 8;

const STATUS_UZ = {
  pending: 'Kutilmoqda',
  in_progress: 'Ko‘rildi',
  submitted: 'Jarayonda',
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);

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
      { pending: 0, in_progress: 0, submitted: 0, completed: 0 }
    );
  }, [tasks]);



  return (
    <>
      <Navbar />
      <div className="container page">
        <header className="page-head employee-page-head">
          <div className="employee-welcome-meta">
            <div className="employee-big-avatar" onClick={() => setProfileOpen(true)} title="Rasmni o‘zgartirish">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="employee-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`employee-avatar-fallback ${user?.avatar ? 'hidden' : ''}`}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </span>
              <span className="avatar-camera-badge" title="Rasm yuklash">📷</span>
            </div>
            <div>
              <h1>Mening vazifalarim</h1>
              <p className="lede">
                Salom, <strong>{user?.name}</strong> — <span className="employee-pos-highlight">{user?.position || 'Xodim'}</span>.
              </p>
            </div>
          </div>
          <div className="page-head-actions">
            <button className="btn btn-outline-accent" onClick={() => setProfileOpen(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Profil & Rasm yuklash</span>
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        <div className="stats employee-stats">
          <div className="card stat">
            <div className="n">{total}</div>
            <div className="l">Menga biriktirilgan</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{counts.pending}</div>
            <div className="l">
              <span className="stat-label-full">Kutilmoqda (ushbu sahifada)</span>
              <span className="stat-label-short">Kutilmoqda</span>
            </div>
            <div className="bar"><i style={{ width: '50%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{counts.in_progress}</div>
            <div className="l">
              <span className="stat-label-full">Ko‘rildi (ushbu sahifada)</span>
              <span className="stat-label-short">Ko‘rildi</span>
            </div>
            <div className="bar"><i style={{ width: '70%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{counts.submitted}</div>
            <div className="l">
              <span className="stat-label-full">Jarayonda / tasdiqda</span>
              <span className="stat-label-short">Jarayonda</span>
            </div>
            <div className="bar"><i style={{ width: '85%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{counts.completed}</div>
            <div className="l">
              <span className="stat-label-full">Bajarilgan (ushbu sahifada)</span>
              <span className="stat-label-short">Bajarildi</span>
            </div>
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
                <option value="in_progress">Ko‘rildi</option>
                <option value="submitted">Jarayonda (rahbar tasdig‘ida)</option>
                <option value="completed">Bajarildi</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="table-wrap desktop-only">
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
                  tasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="task-title-row">
                          <span className="task-title clickable-title" onClick={() => setDetailTask(t)}>
                            {t.title}
                          </span>
                          {t.audio_url && <span className="media-indicator-pill audio" title="Rahbarning ovozli topshirig‘i">🎙️ Ovoz</span>}
                          {t.attachments && t.attachments.length > 0 && (
                            <span className="media-indicator-pill att" title={`${t.attachments.length} ta fayl biriktirilgan`}>📎 {t.attachments.length}</span>
                          )}
                          {t.completion_note && (
                            <span className="media-indicator-pill report" title="Ijro hisoboti kiritilgan">📝 Hisobot</span>
                          )}
                        </div>
                        {t.description && <div className="task-desc">{t.description}</div>}
                      </td>
                      <td><StatusBadge status={t.status} reworkRequired={t.rework_required} /></td>
                      <td>
                        <div className="table-date-cell">
                          <span>{t.due_date ? t.due_date.replace('T', ' ').slice(0, 16) : '—'}</span>
                          {t.created_at && (
                            <span className="table-created-sub">
                              Yaratildi: {new Date(t.created_at).toLocaleDateString('uz-UZ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="right">
                        {t.status === 'pending' ? (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setDetailTask(t)}
                            title="Xabarni ochish va qabul qilish"
                          >
                            📥 Ochish & Qabul qilish
                          </button>
                        ) : t.status === 'in_progress' ? (
                          <button
                            className="btn btn-sm"
                            onClick={() => setDetailTask(t)}
                            title="Hisobot kiritish va rahbar tasdig‘iga yuborish"
                          >
                            📝 Hisobot / Yuborish
                          </button>
                        ) : t.status === 'submitted' ? (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => setDetailTask(t)}
                            title="Rahbar tasdig‘i kutilmoqda"
                          >
                            Jarayonda / Tasdiqda
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-accent"
                            onClick={() => setDetailTask(t)}
                            title="Topshiriq va hisobotni ko‘rish"
                          >
                            ✓ Ko‘rish
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="mobile-only task-card-list">
            {loading ? (
              <div className="center-screen" style={{ padding: '2rem 1rem' }}>
                <span className="spinner" /> Yuklanmoqda…
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty">
                <div className="big">Hozircha hech narsa yo‘q</div>
                <div>Ushbu filtr bo‘yicha sizda vazifalar mavjud emas.</div>
              </div>
            ) : (
              tasks.map((t) => (
                <div className="task-card" key={t.id}>
                  <div className="task-card-header">
                    <div className="task-title-row">
                      <div className="task-card-title clickable-title" onClick={() => setDetailTask(t)}>
                        {t.title}
                      </div>
                      {t.audio_url && <span className="media-indicator-pill audio">🎙️ Ovoz</span>}
                      {t.attachments && t.attachments.length > 0 && (
                        <span className="media-indicator-pill att">📎 {t.attachments.length}</span>
                      )}
                      {t.completion_note && (
                        <span className="media-indicator-pill report">📝 Hisobot</span>
                      )}
                    </div>
                    <StatusBadge status={t.status} reworkRequired={t.rework_required} />
                  </div>
                  {t.description && <div className="task-card-desc">{t.description}</div>}
                  <div className="task-card-meta">
                    <div className="task-meta-item">
                      <span className="meta-label">Bajarish muddati:</span>
                      <span className="meta-value">{t.due_date ? t.due_date.replace('T', ' ').slice(0, 16) : <span className="muted">—</span>}</span>
                    </div>
                    {t.created_at && (
                      <div className="task-meta-item">
                        <span className="meta-label">Yaratildi:</span>
                        <span className="meta-value">{new Date(t.created_at).toLocaleDateString('uz-UZ')}</span>
                      </div>
                    )}
                  </div>
                  <div className="task-card-actions">
                    {t.status === 'pending' ? (
                      <button
                        className="btn btn-sm btn-primary btn-card-action"
                        onClick={() => setDetailTask(t)}
                      >
                        📥 Ochish & Qabul qilish
                      </button>
                    ) : t.status === 'in_progress' ? (
                      <button
                        className="btn btn-sm btn-card-action"
                        onClick={() => setDetailTask(t)}
                      >
                        📝 Hisobot / Yuborish
                      </button>
                    ) : t.status === 'submitted' ? (
                      <button
                        className="btn btn-sm btn-warning btn-card-action"
                        onClick={() => setDetailTask(t)}
                      >
                        Jarayonda / Tasdiqda
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline-accent btn-card-action"
                        onClick={() => setDetailTask(t)}
                      >
                        ✓ Ko‘rish
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination page={page} limit={PAGE_SIZE} total={total} onChange={setPage} />
        </div>
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          isEmployee={true}
          onClose={() => setDetailTask(null)}
          onTaskUpdated={() => {
            load();
          }}
        />
      )}
    </>
  );
}
