import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import TaskModal from '../components/TaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { useToast } from '../components/Toast';
import { taskApi, userApi } from '../api/endpoints';
import { formatDateTime } from '../utils/date';

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
  const [detailTask, setDetailTask] = useState(null);
  const [exporting, setExporting] = useState(false);

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

  // Load employees list.
  const loadEmployees = useCallback(() => {
    userApi
      .list('employee')
      .then(setEmployees)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

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
    loadEmployees();
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(task) {
    loadEmployees();
    setEditing(task);
    setModalOpen(true);
  }

  async function handleSubmit(payload) {
    if (editing) {
      await taskApi.update(editing.id, payload);
      push('Vazifa yangilandi');
      setModalOpen(false);
      setEditing(null);
      loadTasks();
    } else {
      const assignees = Array.isArray(payload.assigned_to)
        ? payload.assigned_to
        : [payload.assigned_to];

      await Promise.all(
        assignees.map((assigneeId) =>
          taskApi.create({ ...payload, assigned_to: Number(assigneeId) })
        )
      );

      push(
        assignees.length > 1
          ? `${assignees.length} ta xodim uchun vazifa yaratildi`
          : 'Yangi vazifa yaratildi'
      );
      setModalOpen(false);
      setEditing(null);
      loadTasks();
    }
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      // Chromium browsers can write the workbook directly to a user-selected
      // .xlsx file. This avoids blob URL filenames such as random UUIDs.
      if ('showSaveFilePicker' in window) {
        const now = new Date();
        const pad = (value) => String(value).padStart(2, '0');
        const suggestedName = `hisobot_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.xlsx`;
        const fileHandle = await window.showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'Excel ishchi kitobi (.xlsx)',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              },
            },
          ],
          excludeAcceptAllOption: true,
        });
        const { blob } = await taskApi.exportExcel();
        const writable = await fileHandle.createWritable();

        await writable.write(blob);
        await writable.close();
        push(`Excel hisoboti saqlandi (${fileHandle.name})`);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Avtorizatsiya tokeni topilmadi');

      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
      const frameName = `excel-download-${Date.now()}`;
      const frame = document.createElement('iframe');
      const form = document.createElement('form');
      const tokenInput = document.createElement('input');

      frame.name = frameName;
      frame.title = 'Excel hisobotini yuklab olish';
      frame.hidden = true;

      form.method = 'POST';
      form.action = `${apiUrl}/tasks/export/excel/download`;
      form.target = frameName;
      form.hidden = true;

      tokenInput.type = 'hidden';
      tokenInput.name = 'download_token';
      tokenInput.value = token;
      form.appendChild(tokenInput);

      document.body.append(frame, form);
      form.submit();
      form.remove();

      // The response is a native attachment, so its Content-Disposition header
      // controls the filename. Leave the target alive until generation finishes.
      setTimeout(() => frame.remove(), 60_000);
      push('Excel hisoboti yuklanmoqda…');
    } catch (err) {
      if (err.name === 'AbortError') return;
      push(err.message || 'Hisobotni yuklab olishda xatolik yuz berdi', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="container page">
        <header className="page-head">
          <div>
            <h1>Andijon viloyati boshqaruv paneli</h1>
            <p className="lede">Viloyat va 14 ta tuman xodimlariga vazifalarni biriktiring.</p>
          </div>
          <div className="page-head-actions">
            <button
              id="btn-export-excel"
              className="btn btn-excel"
              onClick={handleExportExcel}
              disabled={exporting}
              title="Rahbar uchun to‘liq Excel hisobotini (.xlsx) yuklab olish"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{exporting ? 'Tayyorlanmoqda…' : 'Hisobot (.xlsx)'}</span>
            </button>
            <button id="btn-create-task" className="btn btn-primary" onClick={openCreate}>
              + Yangi vazifa
            </button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {/* Stat tiles */}
        <div className="stats">
          <div className="card stat">
            <div className="n">{employees.length + 1}</div>
            <div className="l">Akkauntlar</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{total}</div>
            <div className="l">Jami vazifalar</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{stats.byStatus.submitted || 0}</div>
            <div className="l">
              <span className="stat-label-full">Jarayonda / tasdiqda</span>
              <span className="stat-label-short">Jarayonda</span>
            </div>
            <div className="bar"><i style={{ width: '60%' }} /></div>
          </div>
          <div className="card stat">
            <div className="n">{stats.byStatus.completed || 0}</div>
            <div className="l">
              <span className="stat-label-full">Bajarilgan (ushbu sahifada)</span>
              <span className="stat-label-short">Bajarildi</span>
            </div>
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
                <option value="in_progress">Ko‘rildi</option>
                <option value="submitted">Jarayonda (rahbar tasdig‘ida)</option>
                <option value="rework">Qayta ishlovda</option>
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
                <option value="created_at">Eng so‘nggi berilganlar (yangi birinchi)</option>
                <option value="due_date">Muddati bo‘yicha</option>
                <option value="status">Holati bo‘yicha</option>
                <option value="title">Sarlavha bo‘yicha</option>
              </select>
            </div>
            {(statusFilter || dueBefore) && (
              <button
                className="btn btn-sm btn-clear-filters"
                onClick={() => {
                  setStatusFilter('');
                  setDueBefore('');
                }}
              >
                Filtrlarni tozalash
              </button>
            )}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="table-wrap desktop-only">
            <table className="tasks">
              <thead>
                <tr>
                  <th>Vazifa</th>
                  <th>Biriktirilgan</th>
                  <th>Holati</th>
                  <th>Topshirilgan vaqt / Muddat</th>
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
                        <div className="task-title-row">
                          <span className="task-title clickable-title" onClick={() => setDetailTask(t)}>
                            {t.title}
                          </span>
                          {t.audio_url && <span className="media-indicator-pill audio" title="Ovozli topshiriq">🎙️ Ovoz</span>}
                          {t.attachments && t.attachments.length > 0 && (
                            <span className="media-indicator-pill att" title={`${t.attachments.length} ta fayl`}>📎 {t.attachments.length}</span>
                          )}
                          {t.completion_note && (
                            <span className="media-indicator-pill report" title="Xodim hisoboti mavjud">📝 Hisobot</span>
                          )}
                        </div>
                        {t.description && <div className="task-desc">{t.description}</div>}
                      </td>
                      <td>
                        {t.assignee_name ? (
                          <div className="table-assignee-cell">
                            <div className="table-assignee-avatar">
                              {t.assignee_avatar ? (
                                <img
                                  src={t.assignee_avatar}
                                  alt={t.assignee_name}
                                  className="assignee-thumb"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <span className={`assignee-thumb-fallback ${t.assignee_avatar ? 'hidden' : ''}`}>
                                {t.assignee_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="table-assignee-text">
                              <div className="assignee-table-name">{t.assignee_name}</div>
                              {t.assignee_position && (
                                <div className="assignee-table-pos">{t.assignee_position}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="muted">Biriktirilmagan</span>
                        )}
                      </td>
                      <td><StatusBadge status={t.status} reworkRequired={t.rework_required} /></td>
                      <td>
                        <div className="table-date-cell">
                          <div className="table-date-line created" title="Topshiriq berilgan vaqt">
                            <span className="date-icon">🕒</span>
                            <span className="date-tag-label">Berildi:</span>
                            <strong className="date-tag-val">{formatDateTime(t.created_at)}</strong>
                          </div>
                          <div className="table-date-line due" title="Bajarish muddati">
                            <span className="date-icon">📅</span>
                            <span className="date-tag-label">Muddat:</span>
                            <span className="date-tag-val">{t.due_date ? formatDateTime(t.due_date) : <span className="muted">Muddatsiz</span>}</span>
                          </div>
                        </div>
                      </td>
                      <td className="right">
                        {t.status === 'submitted' ? (
                          <button className="btn btn-sm btn-warning mr-1" onClick={() => setDetailTask(t)} title="Xodim hisobot topshirdi — tasdiqlash uchun bosing">
                            ⏳ Tasdiqlash
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-outline-accent mr-1" onClick={() => setDetailTask(t)} title="Topshiriq va hisobotni ko‘rish">
                            Ko‘rish
                          </button>
                        )}
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

          {/* Mobile Card View (< 768px) */}
          <div className="mobile-only task-card-list">
            {loading ? (
              <div className="center-screen" style={{ padding: '2rem 1rem' }}>
                <span className="spinner" /> Vazifalar yuklanmoqda…
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty">
                <div className="big">Vazifalar topilmadi</div>
                <div>Filtrlarni o‘zgartirib ko‘ring yoki yangi vazifa yarating.</div>
              </div>
            ) : (
              tasks.map((t) => (
                <div className="task-card" key={t.id}>
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
                        <span className="media-indicator-pill report" title="Xodim hisoboti mavjud">📝 Hisobot</span>
                      )}
                    </div>
                    <StatusBadge status={t.status} reworkRequired={t.rework_required} />
                  </div>
                  {t.description && <div className="task-card-desc">{t.description}</div>}
                  <div className="task-card-meta">
                    <div className="task-meta-item">
                      <span className="meta-label">Biriktirilgan:</span>
                      <span className="meta-value">
                        {t.assignee_name ? (
                          <span className="mobile-assignee-badge">
                            {t.assignee_avatar && (
                              <img
                                src={t.assignee_avatar}
                                alt=""
                                className="mobile-avatar-tiny"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <span className="mobile-assignee-name">{t.assignee_name}</span>
                            {(t.assignee_position || t.assignee_district || t.assignee_region) && (
                              <span className="mobile-pos-text">
                                ({[t.assignee_position, t.assignee_district || t.assignee_region].filter(Boolean).join(' · ')})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="muted">Biriktirilmagan</span>
                        )}
                      </span>
                    </div>
                    <div className="task-meta-item">
                      <span className="meta-label">🕒 Berilgan:</span>
                      <span className="meta-value font-medium">{formatDateTime(t.created_at)}</span>
                    </div>
                    <div className="task-meta-item">
                      <span className="meta-label">📅 Muddati:</span>
                      <span className="meta-value">{t.due_date ? formatDateTime(t.due_date) : <span className="muted">—</span>}</span>
                    </div>
                  </div>
                  <div className="task-card-actions">
                    {t.status === 'submitted' ? (
                      <button className="btn btn-sm btn-warning mr-1" onClick={() => setDetailTask(t)} title="Hisobotni ko‘rish va tasdiqlash">
                        ⏳ Tasdiqlash
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-outline-accent mr-1" onClick={() => setDetailTask(t)} title="Topshiriq va hisobotni ko‘rish">
                        Ko‘rish
                      </button>
                    )}
                    <button className="btn btn-sm btn-card-action" onClick={() => openEdit(t)}>
                      Tahrirlash
                    </button>
                  </div>
                </div>
              ))
            )}
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

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onTaskUpdated={loadTasks}
        />
      )}
    </>
  );
}
