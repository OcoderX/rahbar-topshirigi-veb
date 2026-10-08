import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge, { getTaskStatusClass } from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import ProfileModal from '../components/ProfileModal';
import TaskDetailModal from '../components/TaskDetailModal';
import Sidebar from '../components/Sidebar';
import KanbanBoard from '../components/KanbanBoard';
import CommandPalette from '../components/CommandPalette';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../api/endpoints';
import { formatDateTime, getRemainingTime } from '../utils/date';
import { useCountUp } from '../utils/useCountUp';

const PAGE_SIZE = 20;

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { push } = useToast();

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);

  // Layout states (G'oya #4 & #10)
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await taskApi.list({
        status: statusFilter,
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
  }, [statusFilter, sortBy, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  // Global Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const counts = useMemo(() => {
    return tasks.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      { pending: 0, in_progress: 0, submitted: 0, completed: 0 }
    );
  }, [tasks]);

  // Animated stat counters (G'oya #3.2)
  const countTotal = useCountUp(total);
  const countPending = useCountUp(counts.pending);
  const countInProgress = useCountUp(counts.in_progress);
  const countSubmitted = useCountUp(counts.submitted);
  const countCompleted = useCountUp(counts.completed);

  return (
    <>
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenCommandPalette={() => setCmdOpen(true)}
      />
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
            <div className="view-mode-toggle" title="Ko‘rish shaklini tanlang">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Jadval ko‘rinishi"
              >
                📋 Jadval
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
                onClick={() => setViewMode('kanban')}
                title="Topshiriqlar doskasi"
              >
                📌 Doska
              </button>
            </div>
            <button className="btn btn-outline-accent" onClick={() => setProfileOpen(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Profil & Rasm</span>
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {/* Stat tiles with sparklines and count up (G'oya #3.2 & #9) */}
        <div className="stats employee-stats">
          <div className="card stat">
            <div className="n">{countTotal}</div>
            <div className="l">Menga biriktirilgan</div>
            <div className="sparkline">
              <span className="sparkline-bar" style={{ height: '40%' }} />
              <span className="sparkline-bar" style={{ height: '60%' }} />
              <span className="sparkline-bar" style={{ height: '55%' }} />
              <span className="sparkline-bar" style={{ height: '80%' }} />
              <span className="sparkline-bar" style={{ height: '100%' }} />
            </div>
            <div className="stat-trend neutral">Jami topshiriqlar</div>
          </div>

          <div className="card stat">
            <div className="n">{countPending}</div>
            <div className="l">
              <span className="stat-label-full">Kutilmoqda (ushbu sahifada)</span>
              <span className="stat-label-short">Kutilmoqda</span>
            </div>
            <div className="sparkline">
              <span className="sparkline-bar" style={{ height: '50%', background: 'var(--pend)' }} />
              <span className="sparkline-bar" style={{ height: '70%', background: 'var(--pend)' }} />
              <span className="sparkline-bar" style={{ height: '60%', background: 'var(--pend)' }} />
              <span className="sparkline-bar" style={{ height: '85%', background: 'var(--pend)' }} />
            </div>
            <div className="stat-trend neutral">Ochilmagan</div>
          </div>

          <div className="card stat">
            <div className="n">{countInProgress}</div>
            <div className="l">
              <span className="stat-label-full">Ko‘rildi (ushbu sahifada)</span>
              <span className="stat-label-short">Ko‘rildi</span>
            </div>
            <div className="sparkline">
              <span className="sparkline-bar" style={{ height: '45%', background: 'var(--info)' }} />
              <span className="sparkline-bar" style={{ height: '65%', background: 'var(--info)' }} />
              <span className="sparkline-bar" style={{ height: '85%', background: 'var(--info)' }} />
              <span className="sparkline-bar" style={{ height: '100%', background: 'var(--info)' }} />
            </div>
            <div className="stat-trend neutral">Bajarishda</div>
          </div>

          <div className="card stat">
            <div className="n">{countSubmitted}</div>
            <div className="l">
              <span className="stat-label-full">Jarayonda / tasdiqda</span>
              <span className="stat-label-short">Jarayonda</span>
            </div>
            <div className="sparkline">
              <span className="sparkline-bar" style={{ height: '35%', background: 'var(--warn)' }} />
              <span className="sparkline-bar" style={{ height: '60%', background: 'var(--warn)' }} />
              <span className="sparkline-bar" style={{ height: '80%', background: 'var(--warn)' }} />
            </div>
            <div className="stat-trend positive">Yuborilgan</div>
          </div>

          <div className="card stat">
            <div className="n">{countCompleted}</div>
            <div className="l">
              <span className="stat-label-full">Bajarilgan (ushbu sahifada)</span>
              <span className="stat-label-short">Bajarildi</span>
            </div>
            <div className="sparkline">
              <span className="sparkline-bar" style={{ height: '60%', background: 'var(--ok)' }} />
              <span className="sparkline-bar" style={{ height: '75%', background: 'var(--ok)' }} />
              <span className="sparkline-bar" style={{ height: '90%', background: 'var(--ok)' }} />
              <span className="sparkline-bar" style={{ height: '100%', background: 'var(--ok)' }} />
            </div>
            <div className="stat-trend positive">✓ Yakunlandi</div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="section-title">Vazifalar ro‘yxati</div>

          {viewMode === 'kanban' ? (
            <KanbanBoard
              tasks={tasks}
              onSelectTask={setDetailTask}
              isEmployee={true}
            />
          ) : (
            <>
              <div className="filters">
                <div className="field">
                  <label htmlFor="emp-task-status-filter">Holati</label>
                  <select
                    id="emp-task-status-filter"
                    name="statusFilter"
                    className="select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Barcha holatlar</option>
                    <option value="pending">Kutilmoqda</option>
                    <option value="in_progress">Ko‘rildi</option>
                    <option value="submitted">Jarayonda (rahbar tasdig‘ida)</option>
                    <option value="rework">Qayta ishlovda</option>
                    <option value="completed">Bajarildi</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="emp-task-sort-filter">Saralash</label>
                  <select
                    id="emp-task-sort-filter"
                    name="sortBy"
                    className="select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="created_at">Eng so‘nggi berilganlar (yangi birinchi)</option>
                    <option value="due_date">Muddati bo‘yicha</option>
                    <option value="status">Holati bo‘yicha</option>
                    <option value="title">Sarlavha bo‘yicha</option>
                  </select>
                </div>
                {statusFilter && (
                  <button className="btn btn-sm btn-clear-filters" onClick={() => setStatusFilter('')}>
                    Filtrni tozalash
                  </button>
                )}
              </div>

              {/* Desktop Table View (>= 768px) */}
              <div className="table-wrap desktop-only">
                <table className="tasks">
                  <thead>
                    <tr>
                      <th>Vazifa</th>
                      <th>Holati</th>
                      <th>Topshirilgan vaqt / Muddat</th>
                      <th className="right">Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '1.5rem 1rem' }}>
                          <div className="skeleton skeleton-row" style={{ height: 42 }} />
                          <div className="skeleton skeleton-row" style={{ height: 42, width: '90%' }} />
                          <div className="skeleton skeleton-row" style={{ height: 42, width: '80%' }} />
                        </td>
                      </tr>
                    ) : tasks.length === 0 ? (
                      <tr>
                        <td colSpan={4}>
                          <EmptyState
                            title="Sizga biriktirilgan vazifalar yo‘q"
                            description="Hozircha sizga yangi topshiriq berilmagan yoki tanlangan filtrga mos vazifalar topilmadi."
                          />
                        </td>
                      </tr>
                    ) : (
                      tasks.map((t) => (
                        <tr key={t.id} className={`task-row ${getTaskStatusClass(t)}`}>
                          <td>
                            <div className="task-title-row">
                              <span className="task-title clickable-title" onClick={() => setDetailTask(t)}>
                                {t.title}
                              </span>
                              {t.audio_url && <span className="media-indicator-pill audio" title="Ovozli topshiriq">🎙️ Ovoz</span>}
                              {t.attachments && t.attachments.length > 0 && (
                                <span className="media-indicator-pill att" title={`${t.attachments.length} ta fayl`}>📎 {t.attachments.length}</span>
                              )}
                              {t.completion_note && (
                                <span className="media-indicator-pill report" title="Hisobotingiz yuborilgan">📝 Hisobot</span>
                              )}
                            </div>
                            {t.description && <div className="task-desc">{t.description}</div>}
                          </td>
                          <td>
                            <StatusBadge status={t.status} reworkRequired={t.rework_required} />
                          </td>
                          <td>
                            <div className="task-time-cell">
                              <div className="time-created" title={`Topshiriq berilgan: ${formatDateTime(t.created_at)}`}>
                                🕒 {formatDateTime(t.created_at)}
                              </div>
                              <div className="time-due">
                                {t.due_date ? (
                                  <>
                                    <span className="due-label">📅 Muddat:</span>
                                    <strong style={{ color: '#1c1a17' }}>{formatDateTime(t.due_date)}</strong>
                                  </>
                                ) : (
                                  <span className="muted font-normal">Muddatsiz</span>
                                )}
                              </div>
                              {t.due_date && (() => {
                                const rem = getRemainingTime(t.due_date, t.status);
                                if (!rem) return null;
                                return (
                                  <div className={`time-remaining-pill ${rem.isOverdue ? 'overdue' : rem.isCompleted ? 'completed' : 'active'}`}>
                                    {rem.icon} {rem.label}
                                  </div>
                                );
                              })()}
                              {t.status === 'completed' && (
                                <div className="task-approved-subtext" title={`Tasdiqlagan: ${t.approved_by_name || 'Rahbar'} (${formatDateTime(t.completed_at)})`}>
                                  ✓ <span>Tasdiqladi: <strong>{t.approved_by_name || 'Rahbar'}</strong></span>
                                  {t.completed_at && <span className="time-sub"> • {formatDateTime(t.completed_at)}</span>}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="right">
                            {t.status === 'pending' ? (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => setDetailTask(t)}
                              >
                                📥 Ochish & Qabul qilish
                              </button>
                            ) : t.status === 'in_progress' ? (
                              <button
                                className={`btn btn-sm ${t.rework_required ? 'btn-warning' : 'btn-outline-accent'}`}
                                onClick={() => setDetailTask(t)}
                              >
                                {t.rework_required ? '🔄 Qayta ishlash & Yuborish' : '📝 Hisobot / Yuborish'}
                              </button>
                            ) : t.status === 'submitted' ? (
                              <button
                                className="btn btn-sm btn-warning"
                                onClick={() => setDetailTask(t)}
                              >
                                ⏳ Rahbar tasdig‘ida
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm btn-outline-accent"
                                onClick={() => setDetailTask(t)}
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

              {/* Mobile View */}
              <div className="mobile-only task-card-list">
                {loading ? (
                  <div style={{ padding: '1rem' }}>
                    <div className="skeleton skeleton-row" style={{ height: 100, marginBottom: '1rem' }} />
                    <div className="skeleton skeleton-row" style={{ height: 100 }} />
                  </div>
                ) : tasks.length === 0 ? (
                  <EmptyState
                    title="Vazifalar topilmadi"
                    description="Hozircha sizga biriktirilgan topshiriq yo‘q."
                  />
                ) : (
                  tasks.map((t) => (
                    <div className={`task-card ${getTaskStatusClass(t)}`} key={t.id}>
                      <div className="task-card-header">
                        <div className="task-title-row">
                          <div className="task-card-title clickable-title" onClick={() => setDetailTask(t)}>
                            {t.title}
                          </div>
                          {t.audio_url && <span className="media-indicator-pill audio" title="Ovozli topshiriq">🎙️ Ovoz</span>}
                          {t.attachments && t.attachments.length > 0 && (
                            <span className="media-indicator-pill att" title={`${t.attachments.length} ta fayl`}>📎 {t.attachments.length}</span>
                          )}
                          {t.completion_note && (
                            <span className="media-indicator-pill report" title="Hisobot yuborilgan">📝 Hisobot</span>
                          )}
                        </div>
                        <StatusBadge status={t.status} reworkRequired={t.rework_required} />
                      </div>
                      {t.description && <div className="task-card-desc">{t.description}</div>}
                      <div className="task-card-meta">
                        <div className="task-meta-item">
                          <span className="meta-label">🕒 Berilgan:</span>
                          <span className="meta-value font-medium">{formatDateTime(t.created_at)}</span>
                        </div>
                        <div className="task-meta-item">
                          <span className="meta-label">📅 Muddati:</span>
                          <strong className="meta-value" style={{ color: '#1c1a17' }}>{t.due_date ? formatDateTime(t.due_date) : <span className="muted font-normal">—</span>}</strong>
                        </div>
                        {t.due_date && (() => {
                          const rem = getRemainingTime(t.due_date, t.status);
                          if (!rem) return null;
                          return (
                            <div className="task-meta-item">
                              <span className="meta-label">{rem.icon} Qolgan vaqt:</span>
                              <strong className="meta-value" style={{ color: rem.isOverdue ? '#dc2626' : rem.isCompleted ? '#16a34a' : '#111827', fontWeight: 700 }}>
                                {rem.label}
                              </strong>
                            </div>
                          );
                        })()}
                        {t.status === 'completed' && (
                          <div className="task-meta-item completed-approval-meta">
                            <span className="meta-label">✓ Tasdiqlandi:</span>
                            <span className="meta-value">
                              <strong>{t.approved_by_name || 'Rahbar'}</strong>
                              {t.completed_at && <span className="muted font-normal"> • {formatDateTime(t.completed_at)}</span>}
                            </span>
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
                            className={`btn btn-sm btn-card-action ${t.rework_required ? 'btn-warning' : ''}`}
                            onClick={() => setDetailTask(t)}
                          >
                            {t.rework_required ? '🔄 Qayta ishlash & Yuborish' : '📝 Hisobot / Yuborish'}
                          </button>
                        ) : t.status === 'submitted' ? (
                          <button
                            className="btn btn-sm btn-warning btn-card-action"
                            onClick={() => setDetailTask(t)}
                          >
                            ⏳ Rahbar tasdig‘ida
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
            </>
          )}
        </div>
      </div>

      {/* Sidebar Drawer Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="tasks"
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenCommandPalette={() => setCmdOpen(true)}
        isAdmin={false}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        tasks={tasks}
        onSelectTask={setDetailTask}
        onToggleKanban={() => setViewMode((m) => (m === 'table' ? 'kanban' : 'table'))}
        viewMode={viewMode}
      />

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
