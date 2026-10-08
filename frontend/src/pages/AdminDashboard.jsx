import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge, { getTaskStatusClass } from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import TaskModal from '../components/TaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { useToast } from '../components/Toast';
import { taskApi, userApi } from '../api/endpoints';
import { formatDateTime, getRemainingTime } from '../utils/date';

const PAGE_SIZE = 20;

export default function AdminDashboard() {
  const { push } = useToast();

  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active view tab ('tasks' | 'accounts') and global status counts
  const [activeTab, setActiveTab] = useState('tasks');
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    submitted: 0,
    completed: 0,
  });

  // Filters for tasks
  const [statusFilter, setStatusFilter] = useState('');
  const [dueBefore, setDueBefore] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  // Filters & pagination for accounts
  const [accountSearch, setAccountSearch] = useState('');
  const [accountTerritoryFilter, setAccountTerritoryFilter] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState('');
  const [accountPage, setAccountPage] = useState(1);
  const ACCOUNT_PAGE_SIZE = 20;

  // Modal state.
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [initialAssigneeId, setInitialAssigneeId] = useState(null);
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
      if (res.statusCounts) {
        setStatusCounts(res.statusCounts);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dueBefore, sortBy, page]);

  // Load accounts and employees list.
  const loadAccounts = useCallback(() => {
    userApi
      .list()
      .then((users) => {
        const list = Array.isArray(users) ? users : [];
        setAccounts(list);
        setEmployees(list.filter((u) => u.role !== 'admin'));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Reset task page to 1 whenever a task filter changes.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dueBefore, sortBy]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Reset account page to 1 whenever account filters change.
  useEffect(() => {
    setAccountPage(1);
  }, [accountSearch, accountTerritoryFilter, accountRoleFilter]);

  // Unique territory/district options for filtering accounts.
  const territoryOptions = useMemo(() => {
    const set = new Set();
    accounts.forEach((u) => {
      if (u.district) set.add(u.district);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uz'));
  }, [accounts]);

  // Filtered accounts based on search, territory, role.
  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return accounts.filter((u) => {
      if (accountRoleFilter && u.role !== accountRoleFilter) return false;
      if (accountTerritoryFilter) {
        if (accountTerritoryFilter === '__region__') {
          if (u.district && u.territory_type !== 'region') return false;
        } else if (u.district !== accountTerritoryFilter) {
          return false;
        }
      }
      if (q) {
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const posMatch = (u.position || '').toLowerCase().includes(q);
        const distMatch = (u.district || '').toLowerCase().includes(q);
        const regMatch = (u.region || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !posMatch && !distMatch && !regMatch) {
          return false;
        }
      }
      return true;
    });
  }, [accounts, accountSearch, accountTerritoryFilter, accountRoleFilter]);

  // Paginated slice of accounts.
  const paginatedAccounts = useMemo(() => {
    const start = (accountPage - 1) * ACCOUNT_PAGE_SIZE;
    return filteredAccounts.slice(start, start + ACCOUNT_PAGE_SIZE);
  }, [filteredAccounts, accountPage]);

  // Dynamic section title for tasks view.
  const tasksSectionTitle = useMemo(() => {
    if (statusFilter === 'submitted') return `Jarayonda va tasdiqdagi vazifalar (${total})`;
    if (statusFilter === 'completed') return `Bajarilgan vazifalar (${total})`;
    if (statusFilter === 'pending') return `Kutilayotgan vazifalar (${total})`;
    if (statusFilter === 'in_progress') return `Ko‘rilgan vazifalar (${total})`;
    if (statusFilter === 'rework') return `Qayta ishlovdagi vazifalar (${total})`;
    return `Barcha vazifalar (${total})`;
  }, [statusFilter, total]);

  // Interactive handler for the 4 headline statistic cards.
  function handleCardClick(cardKey) {
    if (cardKey === 'accounts') {
      setActiveTab((prev) => (prev === 'accounts' ? 'tasks' : 'accounts'));
      setAccountPage(1);
    } else if (cardKey === 'all') {
      setActiveTab('tasks');
      setStatusFilter('');
      setPage(1);
    } else if (cardKey === 'submitted') {
      setActiveTab('tasks');
      setStatusFilter((prev) => (prev === 'submitted' ? '' : 'submitted'));
      setPage(1);
    } else if (cardKey === 'completed') {
      setActiveTab('tasks');
      setStatusFilter((prev) => (prev === 'completed' ? '' : 'completed'));
      setPage(1);
    }
  }

  function openCreate(defaultAssigneeId = null) {
    loadAccounts();
    setEditing(null);
    setInitialAssigneeId(defaultAssigneeId);
    setModalOpen(true);
  }
  function openEdit(task) {
    loadAccounts();
    setEditing(task);
    setInitialAssigneeId(null);
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
          <div
            id="stat-card-accounts"
            className={`card stat clickable-stat-card ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => handleCardClick('accounts')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick('accounts')}
            title="Tizimdagi barcha akkauntlar va xodimlarni ko‘rish"
          >
            <div className="n">{accounts.length || (employees.length + 1) || 66}</div>
            <div className="l">Akkauntlar</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div
            id="stat-card-all-tasks"
            className={`card stat clickable-stat-card ${activeTab === 'tasks' && !statusFilter ? 'active' : ''}`}
            onClick={() => handleCardClick('all')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick('all')}
            title="Barcha vazifalarni ko‘rsatish"
          >
            <div className="n">{statusCounts.total || total}</div>
            <div className="l">Jami vazifalar</div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
          <div
            id="stat-card-submitted-tasks"
            className={`card stat clickable-stat-card ${activeTab === 'tasks' && statusFilter === 'submitted' ? 'active' : ''}`}
            onClick={() => handleCardClick('submitted')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick('submitted')}
            title="Jarayonda va rahbar tasdig‘idagi vazifalarni saralash"
          >
            <div className="n">{statusCounts.submitted || 0}</div>
            <div className="l">
              <span className="stat-label-full">Jarayonda / tasdiqda</span>
              <span className="stat-label-short">Jarayonda</span>
            </div>
            <div className="bar"><i style={{ width: '60%' }} /></div>
          </div>
          <div
            id="stat-card-completed-tasks"
            className={`card stat clickable-stat-card ${activeTab === 'tasks' && statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => handleCardClick('completed')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick('completed')}
            title="Bajarilgan vazifalarni saralash"
          >
            <div className="n">{statusCounts.completed || 0}</div>
            <div className="l">
              <span className="stat-label-full">Bajarilganlar</span>
              <span className="stat-label-short">Bajarildi</span>
            </div>
            <div className="bar"><i style={{ width: '100%' }} /></div>
          </div>
        </div>

        {activeTab === 'accounts' ? (
          /* Accounts View */
          <div className="card card-pad">
            <div className="section-title-row">
              <div>
                <div className="section-title">
                  Tizimdagi akkauntlar ({filteredAccounts.length})
                </div>
                <p className="section-desc">
                  Andijon viloyati va tumanlar bo‘yicha ro‘yxatdan o‘tgan barcha mas’ul xodimlar
                </p>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <button
                  className="btn btn-outline-accent btn-sm"
                  onClick={() => {
                    setActiveTab('tasks');
                    setStatusFilter('');
                  }}
                  title="Vazifalar ro‘yxatiga qaytish"
                >
                  📋 Vazifalar ro‘yxatiga o‘tish
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => openCreate()}
                  title="Yangi vazifa yaratish"
                >
                  + Yangi vazifa
                </button>
              </div>
            </div>

            {/* Filters for Accounts */}
            <div className="filters">
              <div className="field" style={{ minWidth: 260, flex: 2 }}>
                <label>Qidirish</label>
                <input
                  type="text"
                  className="input"
                  placeholder="F.I.SH, lavozim, email yoki hudud..."
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                />
              </div>

              <div className="field" style={{ minWidth: 180, flex: 1 }}>
                <label>Hudud / Tuman</label>
                <select
                  className="select"
                  value={accountTerritoryFilter}
                  onChange={(e) => setAccountTerritoryFilter(e.target.value)}
                >
                  <option value="">Barcha hududlar</option>
                  <option value="__region__">🏛️ Viloyat miqyosida</option>
                  {territoryOptions.map((t) => (
                    <option key={t} value={t}>
                      📍 {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ minWidth: 140, flex: 1 }}>
                <label>Roli</label>
                <select
                  className="select"
                  value={accountRoleFilter}
                  onChange={(e) => setAccountRoleFilter(e.target.value)}
                >
                  <option value="">Barcha rollar</option>
                  <option value="employee">Xodimlar</option>
                  <option value="admin">Rahbar (Admin)</option>
                </select>
              </div>

              {(accountSearch || accountTerritoryFilter || accountRoleFilter) && (
                <button
                  className="btn btn-sm btn-clear-filters"
                  onClick={() => {
                    setAccountSearch('');
                    setAccountTerritoryFilter('');
                    setAccountRoleFilter('');
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
                    <th>Xodim / Akkaunt</th>
                    <th>Lavozimi</th>
                    <th>Hudud / Tuman</th>
                    <th>Roli</th>
                    <th className="right">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty">
                          <div className="big">Akkauntlar topilmadi</div>
                          <div>Qidiruv yoki filtr mezonlarini o‘zgartirib ko‘ring.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAccounts.map((acc) => (
                      <tr key={acc.id} className="task-row account-row">
                        <td>
                          <div className="table-assignee-cell">
                            <div className="table-assignee-avatar">
                              {acc.avatar ? (
                                <img
                                  src={acc.avatar}
                                  alt={acc.name}
                                  className="assignee-thumb"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <span className={`assignee-thumb-fallback ${acc.avatar ? 'hidden' : ''}`}>
                                {acc.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="table-assignee-text">
                              <div className="assignee-table-name font-medium">{acc.name}</div>
                              <div className="muted" style={{ fontSize: '.78rem' }}>{acc.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {acc.position ? (
                            <span className="pos-badge">{acc.position}</span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          {acc.district ? (
                            <span className="district-pill">📍 {acc.district}</span>
                          ) : (
                            <span className="region-pill">🏛️ {acc.region || 'Andijon viloyati'}</span>
                          )}
                        </td>
                        <td>
                          {acc.role === 'admin' ? (
                            <span className="role-pill admin">Rahbar (Admin)</span>
                          ) : (
                            <span className="role-pill employee">Xodim</span>
                          )}
                        </td>
                        <td className="right">
                          {acc.role !== 'admin' ? (
                            <button
                              className="btn btn-sm btn-outline-accent"
                              onClick={() => openCreate(acc.id)}
                              title={`${acc.name} ga vazifa biriktirish`}
                            >
                              + Vazifa biriktirish
                            </button>
                          ) : (
                            <span className="muted" style={{ fontSize: '.78rem' }}>Tizim rahbari</span>
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
              {paginatedAccounts.length === 0 ? (
                <div className="empty">
                  <div className="big">Akkauntlar topilmadi</div>
                  <div>Qidiruv yoki filtr mezonlarini o‘zgartirib ko‘ring.</div>
                </div>
              ) : (
                paginatedAccounts.map((acc) => (
                  <div className="task-card account-card" key={acc.id}>
                    <div className="task-card-header">
                      <div className="table-assignee-cell">
                        <div className="table-assignee-avatar">
                          {acc.avatar ? (
                            <img
                              src={acc.avatar}
                              alt=""
                              className="assignee-thumb"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : null}
                          <span className={`assignee-thumb-fallback ${acc.avatar ? 'hidden' : ''}`}>
                            {acc.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="assignee-table-name font-medium">{acc.name}</div>
                          <div className="muted" style={{ fontSize: '.75rem' }}>{acc.email}</div>
                        </div>
                      </div>
                      <div>
                        {acc.role === 'admin' ? (
                          <span className="role-pill admin">Rahbar</span>
                        ) : (
                          <span className="role-pill employee">Xodim</span>
                        )}
                      </div>
                    </div>

                    <div className="task-card-meta" style={{ marginTop: '.6rem' }}>
                      {acc.position && (
                        <div className="task-meta-item">
                          <span className="meta-label">Lavozim:</span>
                          <span className="meta-value font-medium">{acc.position}</span>
                        </div>
                      )}
                      <div className="task-meta-item">
                        <span className="meta-label">Hudud:</span>
                        <span className="meta-value">
                          {acc.district ? `📍 ${acc.district}` : `🏛️ ${acc.region || 'Andijon viloyati'}`}
                        </span>
                      </div>
                    </div>

                    {acc.role !== 'admin' && (
                      <div className="task-card-actions" style={{ marginTop: '.75rem' }}>
                        <button
                          className="btn btn-sm btn-outline-accent"
                          onClick={() => openCreate(acc.id)}
                        >
                          + Vazifa biriktirish
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <Pagination
              page={accountPage}
              limit={ACCOUNT_PAGE_SIZE}
              total={filteredAccounts.length}
              onChange={setAccountPage}
            />
          </div>
        ) : (
          /* Tasks View */
          <div className="card card-pad">
            <div className="section-title">{tasksSectionTitle}</div>
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
                              <strong className="date-tag-val">{t.due_date ? formatDateTime(t.due_date) : <span className="muted font-normal">Muddatsiz</span>}</strong>
                            </div>
                            {t.due_date && (() => {
                              const rem = getRemainingTime(t.due_date, t.status);
                              if (!rem) return null;
                              return (
                                <div
                                  className={`table-date-line remaining ${rem.isOverdue ? 'overdue' : ''} ${rem.isCompleted ? 'completed' : ''}`}
                                  title="Muddati bo‘yicha qolgan vaqt"
                                >
                                  <span className="date-icon">{rem.icon}</span>
                                  <strong className="date-remaining-black">{rem.label}</strong>
                                </div>
                              );
                            })()}
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
        )}
      </div>

      {modalOpen && (
        <TaskModal
          task={editing}
          initialAssignee={initialAssigneeId}
          employees={employees}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
            setInitialAssigneeId(null);
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
