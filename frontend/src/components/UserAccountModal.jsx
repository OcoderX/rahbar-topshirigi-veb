import { useEffect, useMemo, useState, useRef } from 'react';
import StatusBadge, { getTaskStatusClass } from './StatusBadge';
import { userApi } from '../api/endpoints';
import { formatDateTime, getRemainingTime } from '../utils/date';

/**
 * Facebook / LinkedIn-style Executive User Account Profile Modal.
 * Displays:
 *  - Cover banner with organization header
 *  - Avatar, full name, position, region/district, role, rank
 *  - Metric cards (Total, Completed, In Progress, Submitted, Pending, Rework, KPI %)
 *  - Professional SVG Donut & Segmented Progress Chart for task status distribution
 *  - List of assigned tasks with status, dates, remaining time, and quick view action
 *  - Quick "+ Yangi vazifa biriktirish" button
 */
export default function UserAccountModal({
  user,
  onClose,
  onAssignTask,
  onOpenTaskDetail,
}) {
  const [profile, setProfile] = useState(user || null);
  const [tasks, setTasks] = useState([]);
  const [statusCounts, setStatusCounts] = useState(
    user?.statusCounts || {
      total: 0,
      pending: 0,
      in_progress: 0,
      submitted: 0,
      completed: 0,
      rework: 0,
      completion_rate: 0,
    }
  );
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'in_progress' | 'completed' | 'pending'
  const bodyRef = useRef(null);

  const userId = user?.id;

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [userId, loading]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        // Fetch full user details and tasks in parallel
        const [userData, taskRes] = await Promise.all([
          userApi.get(userId).catch(() => user),
          userApi.tasks(userId, { limit: 50, sortBy: 'created_at', order: 'desc' }).catch(() => ({
            data: [],
            total: 0,
            statusCounts: null,
          })),
        ]);

        if (cancelled) return;

        if (userData) {
          setProfile((prev) => ({ ...prev, ...userData }));
          if (userData.statusCounts) {
            setStatusCounts(userData.statusCounts);
          }
        }

        if (taskRes) {
          setTasks(taskRes.data || []);
          if (taskRes.statusCounts) {
            setStatusCounts(taskRes.statusCounts);
          }
        }
      } catch (err) {
        console.error('Failed to load profile data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [userId, user]);

  const displayName = profile?.name || user?.name || 'Xodim';
  const displayPos = profile?.position || user?.position || 'Xodim';
  const displayEmail = profile?.email || user?.email || '';
  const displayAvatar = profile?.avatar || user?.avatar || '';
  const displayRegion = profile?.region || user?.region || 'Andijon viloyati';
  const displayDistrict = profile?.district || user?.district;
  const displayRole = profile?.role || user?.role || 'employee';
  const displayRank = profile?.hierarchy_rank ?? user?.hierarchy_rank;

  // Filter tasks for the tabs inside profile
  const filteredTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    if (filterTab === 'in_progress') {
      return tasks.filter((t) => t.status === 'in_progress' || t.status === 'submitted');
    }
    if (filterTab === 'completed') {
      return tasks.filter((t) => t.status === 'completed');
    }
    if (filterTab === 'pending') {
      return tasks.filter((t) => t.status === 'pending');
    }
    return tasks;
  }, [tasks, filterTab]);

  // Derived KPI metrics
  const totalTasks = statusCounts.total || tasks.length || 0;
  const completedCount = statusCounts.completed || 0;
  const inProgressCount = (statusCounts.in_progress || 0) + (statusCounts.submitted || 0);
  const pendingCount = statusCounts.pending || 0;
  const submittedCount = statusCounts.submitted || 0;
  const reworkCount = statusCounts.rework || 0;

  const completionRate =
    statusCounts.completion_rate !== undefined
      ? statusCounts.completion_rate
      : totalTasks > 0
      ? Math.round((completedCount / totalTasks) * 100)
      : 0;

  // Donut chart calculations
  const donutSegments = useMemo(() => {
    if (totalTasks === 0) {
      return [{ key: 'empty', color: '#e5e2da', pct: 100, strokeDash: '283 283', offset: 0 }];
    }

    const segments = [
      { key: 'completed', label: 'Bajarilgan', color: '#10b981', count: completedCount },
      { key: 'submitted', label: 'Hisobot topshirilgan', color: '#f59e0b', count: submittedCount },
      { key: 'in_progress', label: 'Ko‘rib chiqilmoqda', color: '#64748b', count: statusCounts.in_progress || 0 },
      { key: 'pending', label: 'Kutilmoqda', color: '#ef4444', count: pendingCount },
      { key: 'rework', label: 'Qayta ishlovda', color: '#d97706', count: reworkCount },
    ];

    const circumference = 2 * Math.PI * 45; // r=45 => ~282.74
    let accumulated = 0;

    return segments.map((s) => {
      const pct = (s.count / totalTasks) * 100;
      const strokeLen = (s.count / totalTasks) * circumference;
      const offset = -accumulated;
      accumulated += strokeLen;
      return {
        ...s,
        pct: Math.round(pct),
        strokeDash: `${strokeLen} ${circumference - strokeLen}`,
        offset,
      };
    });
  }, [totalTasks, completedCount, submittedCount, statusCounts.in_progress, pendingCount, reworkCount]);

  // Hierarchy rank label
  function getRankLabel(rank) {
    if (rank === 1) return '1-daraja · Bosh boshqarma rahbari';
    if (rank === 2) return '2-daraja · Rahbar o‘rinbosari';
    if (rank === 3) return '3-daraja · Bo‘lim boshlig‘i';
    if (rank === 4) return '4-daraja · Mutaxassis / Ijrochi';
    return `${rank}-daraja`;
  }

  return (
    <div className="overlay user-profile-overlay" onMouseDown={onClose}>
      <div
        className="modal user-profile-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${displayName} profili`}
      >
        {/* Modal Close Button */}
        <button
          className="user-profile-close-btn"
          onClick={onClose}
          aria-label="Yopish"
          title="Yopish"
        >
          ✕
        </button>

        {/* Modal Scrollable Container */}
        <div className="user-profile-body" ref={bodyRef}>
          {/* Facebook-style Cover Banner */}
          <div className="profile-cover-banner">
            <div className="cover-pattern-grid" />
            <div className="cover-meta-badge">
              <span className="badge-flag">🇺🇿</span>
              <span>O‘zbekiston Respublikasi — Andijon viloyati</span>
            </div>
            <div className="cover-glow-accent" />
          </div>

          {/* Profile Header Area */}
          <div className="profile-header-card">
            {/* Overlapping Avatar */}
            <div className="profile-avatar-row">
              <div className="profile-avatar-container">
                <div className="profile-avatar-ring">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayName}
                      className="profile-avatar-large"
                      style={{ width: '100%', height: '100%', maxWidth: '108px', maxHeight: '108px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <span
                    className={`profile-avatar-large-fallback ${
                      displayAvatar ? 'hidden' : ''
                    }`}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', display: displayAvatar ? 'none' : 'flex' }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="profile-status-dot online" title="Tizimda faol xodim" />
                </div>
              </div>
            </div>

            {/* User Title & Info — completely on card background */}
            <div className="profile-identity-info">
              <div className="profile-name-row">
                <div className="profile-name-col">
                  <h2 className="profile-fullname">{displayName}</h2>
                  {displayRole === 'admin' ? (
                    <span className="profile-role-pill admin">👑 Tizim rahbari</span>
                  ) : (
                    <span className="profile-role-pill employee">🏛️ Mas’ul xodim</span>
                  )}
                </div>

                {displayRole !== 'admin' && onAssignTask && (
                  <button
                    className="btn btn-primary btn-assign-direct"
                    onClick={() => {
                      onAssignTask(userId);
                      onClose();
                    }}
                    title={`${displayName} ga yangi topshiriq biriktirish`}
                  >
                    <span className="action-icon">➕</span>
                    <span>Vazifa biriktirish</span>
                  </button>
                )}
              </div>

              <div className="profile-sub-badges">
                <span className="profile-pos-pill">💼 {displayPos}</span>
                {displayDistrict ? (
                  <span className="profile-terr-pill district">📍 {displayDistrict}</span>
                ) : (
                  <span className="profile-terr-pill region">🏛️ {displayRegion}</span>
                )}
                {displayRank && (
                  <span className="profile-terr-pill rank">
                    🎖️ {getRankLabel(displayRank)}
                  </span>
                )}
              </div>

              <div className="profile-meta-row">
                <div className="profile-meta-item">
                  <span className="meta-icon">✉️</span>
                  <span>{displayEmail}</span>
                </div>
                {profile?.created_at && (
                  <div className="profile-meta-item">
                    <span className="meta-icon">📅</span>
                    <span>Qo‘shilgan: {formatDateTime(profile.created_at).split(' ')[0]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Padded Content */}
          <div className="user-profile-content-pad">
            {/* KPI Statistics Cards Grid */}
            <div className="profile-section-heading">
              <span className="heading-icon">📊</span>
              <span>Xodimning ijro statistikasi va ko‘rsatkichlari</span>
            </div>

            {/* 2 balanced rows of 3 cards */}
            <div className="profile-kpi-grid">
              {/* Row 1: Overarching Metrics */}
              <div className="profile-kpi-card total">
                <div className="kpi-icon-wrap">📋</div>
                <div className="kpi-data">
                  <div className="kpi-label">Jami topshiriqlar</div>
                  <div className="kpi-value">{totalTasks} <span className="kpi-unit">ta</span></div>
                </div>
              </div>

              <div className="profile-kpi-card completed">
                <div className="kpi-icon-wrap">✅</div>
                <div className="kpi-data">
                  <div className="kpi-label">Muvaffaqiyatli bajarildi</div>
                  <div className="kpi-value text-emerald">{completedCount} <span className="kpi-unit">ta</span></div>
                </div>
                <div className="kpi-sub-progress">
                  <div
                    className="kpi-sub-bar emerald"
                    style={{ width: `${totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="profile-kpi-card kpi-rate">
                <div className="kpi-icon-wrap">🎯</div>
                <div className="kpi-data">
                  <div className="kpi-label">Ijro samaradorligi (KPI)</div>
                  <div className="kpi-value text-kpi">{completionRate}%</div>
                </div>
                <div className="kpi-sub-progress">
                  <div
                    className={`kpi-sub-bar ${completionRate >= 80 ? 'emerald' : completionRate >= 50 ? 'blue' : 'amber'}`}
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              {/* Row 2: Active Pipeline Statuses */}
              <div className="profile-kpi-card in-progress">
                <div className="kpi-icon-wrap">👀</div>
                <div className="kpi-data">
                  <div className="kpi-label">Ko‘rib chiqilmoqda</div>
                  <div className="kpi-value" style={{ color: '#64748b' }}>{statusCounts.in_progress || 0} <span className="kpi-unit">ta</span></div>
                </div>
                <div className="kpi-sub-progress">
                  <div
                    className="kpi-sub-bar"
                    style={{ background: '#64748b', width: `${totalTasks > 0 ? ((statusCounts.in_progress || 0) / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="profile-kpi-card submitted">
                <div className="kpi-icon-wrap">⏳</div>
                <div className="kpi-data">
                  <div className="kpi-label">Rahbar tasdig‘ida</div>
                  <div className="kpi-value text-amber">{submittedCount} <span className="kpi-unit">ta</span></div>
                </div>
                <div className="kpi-sub-progress">
                  <div
                    className="kpi-sub-bar amber"
                    style={{ width: `${totalTasks > 0 ? (submittedCount / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="profile-kpi-card pending">
                <div className="kpi-icon-wrap">🕒</div>
                <div className="kpi-data">
                  <div className="kpi-label">Kutilmoqda (yangi)</div>
                  <div className="kpi-value" style={{ color: '#dc2626' }}>{pendingCount} <span className="kpi-unit">ta</span></div>
                </div>
                <div className="kpi-sub-progress">
                  <div
                    className="kpi-sub-bar"
                    style={{ background: '#ef4444', width: `${totalTasks > 0 ? (pendingCount / totalTasks) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

          {/* Professional Graphical Breakdown Section */}
          <div className="profile-analytics-card">
            <div className="analytics-card-header">
              <div>
                <h4 className="analytics-title">Topshiriqlar taqsimoti diagrammasi</h4>
                <div className="analytics-subtitle">
                  Xodimga biriktirilgan barcha topshiriqlarning holatlar bo‘yicha foiz nisbati
                </div>
              </div>
              <div className="analytics-grade-badge">
                {completionRate >= 85 ? (
                  <span className="grade-pill high">🌟 A’lo ijro intizomi</span>
                ) : completionRate >= 50 ? (
                  <span className="grade-pill good">👍 Qoniqarli daraja</span>
                ) : (
                  <span className="grade-pill neutral">⏳ Jarayondagi ijro</span>
                )}
              </div>
            </div>

            <div className="analytics-content-grid">
              {/* SVG Donut Chart */}
              <div className="analytics-donut-container">
                <svg
                  className="analytics-donut-svg"
                  viewBox="0 0 120 120"
                  width="170"
                  height="170"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="none"
                    stroke="#f0ece1"
                    strokeWidth="14"
                  />
                  {donutSegments.map((s) =>
                    s.count > 0 ? (
                      <circle
                        key={s.key}
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={s.color}
                        strokeWidth="14"
                        strokeDasharray={s.strokeDash}
                        strokeDashoffset={s.offset}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        className="donut-segment-circle"
                      />
                    ) : null
                  )}
                  <text
                    x="60"
                    y="55"
                    textAnchor="middle"
                    className="donut-center-value"
                  >
                    {totalTasks > 0 ? `${completionRate}%` : '0%'}
                  </text>
                  <text
                    x="60"
                    y="72"
                    textAnchor="middle"
                    className="donut-center-label"
                  >
                    Ijro foizi
                  </text>
                </svg>
              </div>

              {/* Chart Legend & Segmented Progress */}
              <div className="analytics-legend-container">
                <div className="segmented-progress-wrap">
                  <div className="segmented-progress-bar">
                    {donutSegments.map((s) =>
                      s.count > 0 ? (
                        <div
                          key={s.key}
                          className="segmented-progress-chunk"
                          style={{
                            width: `${(s.count / totalTasks) * 100}%`,
                            backgroundColor: s.color,
                          }}
                          title={`${s.label}: ${s.count} ta (${s.pct}%)`}
                        />
                      ) : null
                    )}
                  </div>
                </div>

                <div className="analytics-legend-grid">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#10b981' }} />
                    <span className="legend-label">Bajarildi:</span>
                    <strong className="legend-num">{completedCount} ta</strong>
                    <span className="legend-pct">
                      ({totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="legend-label">Hisobot topshirilgan:</span>
                    <strong className="legend-num">{submittedCount} ta</strong>
                    <span className="legend-pct">
                      ({totalTasks > 0 ? Math.round((submittedCount / totalTasks) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="legend-label">Ko‘rib chiqilmoqda:</span>
                    <strong className="legend-num">{statusCounts.in_progress || 0} ta</strong>
                    <span className="legend-pct">
                      ({totalTasks > 0 ? Math.round(((statusCounts.in_progress || 0) / totalTasks) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#ea580c' }} />
                    <span className="legend-label">Kutilmoqda:</span>
                    <strong className="legend-num">{pendingCount} ta</strong>
                    <span className="legend-pct">
                      ({totalTasks > 0 ? Math.round((pendingCount / totalTasks) * 100) : 0}%)
                    </span>
                  </div>

                  {reworkCount > 0 && (
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: '#ef4444' }} />
                      <span className="legend-label">Qayta ishlovda:</span>
                      <strong className="legend-num">{reworkCount} ta</strong>
                      <span className="legend-pct">
                        ({totalTasks > 0 ? Math.round((reworkCount / totalTasks) * 100) : 0}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Employee's Assigned Tasks List */}
          <div className="profile-tasks-section">
            <div className="tasks-section-header">
              <div className="section-header-left">
                <span className="heading-icon">📁</span>
                <span className="profile-section-title">
                  {displayName} ning topshiriqlari ro‘yxati ({totalTasks})
                </span>
              </div>

              {/* Filter tabs */}
              <div className="profile-filter-tabs">
                <button
                  type="button"
                  className={`profile-filter-pill ${filterTab === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterTab('all')}
                >
                  Barchasi ({totalTasks})
                </button>
                <button
                  type="button"
                  className={`profile-filter-pill ${filterTab === 'in_progress' ? 'active' : ''}`}
                  onClick={() => setFilterTab('in_progress')}
                >
                  Jarayonda ({inProgressCount})
                </button>
                <button
                  type="button"
                  className={`profile-filter-pill ${filterTab === 'completed' ? 'active' : ''}`}
                  onClick={() => setFilterTab('completed')}
                >
                  Bajarilgan ({completedCount})
                </button>
                <button
                  type="button"
                  className={`profile-filter-pill ${filterTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilterTab('pending')}
                >
                  Kutilmoqda ({pendingCount})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="center-screen" style={{ height: 140 }}>
                <span className="spinner" /> Ma’lumotlar yuklanmoqda…
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="profile-tasks-empty">
                <div className="empty-icon">📭</div>
                <div className="empty-title">Bu bo‘limda topshiriqlar mavjud emas</div>
                <div className="empty-desc">
                  Ushbu mezon bo‘yicha topshiriq topilmadi.
                </div>
                {displayRole !== 'admin' && onAssignTask && (
                  <button
                    className="btn btn-sm btn-primary mt-2"
                    onClick={() => {
                      onAssignTask(userId);
                      onClose();
                    }}
                  >
                    + Yangi vazifa biriktirish
                  </button>
                )}
              </div>
            ) : (
              <div className="profile-task-list">
                {filteredTasks.map((t) => {
                  const rem = t.due_date ? getRemainingTime(t.due_date, t.status) : null;
                  return (
                    <div
                      key={t.id}
                      className={`profile-task-row ${getTaskStatusClass(t)}`}
                      onClick={() => onOpenTaskDetail && onOpenTaskDetail(t)}
                    >
                      <div className="profile-task-main">
                        <div className="profile-task-top">
                          <span className="profile-task-title clickable-title">
                            {t.title}
                          </span>
                          <StatusBadge status={t.status} reworkRequired={t.rework_required} />
                        </div>

                        {t.description && (
                          <div className="profile-task-desc">{t.description}</div>
                        )}

                        <div className="profile-task-meta">
                          <div className="meta-tag">
                            <span className="meta-tag-label">🕒 Berilgan:</span>
                            <span className="meta-tag-val font-medium">
                              {formatDateTime(t.created_at)}
                            </span>
                          </div>

                          <div className="meta-tag">
                            <span className="meta-tag-label">📅 Muddati:</span>
                            <span className="meta-tag-val font-medium">
                              {t.due_date ? formatDateTime(t.due_date) : 'Muddatsiz'}
                            </span>
                          </div>

                          {rem && (
                            <div
                              className={`meta-tag remaining-badge ${
                                rem.isOverdue ? 'overdue' : ''
                              } ${rem.isCompleted ? 'completed' : ''}`}
                            >
                              <span>{rem.icon}</span>
                              <strong className="date-remaining-black">{rem.label}</strong>
                            </div>
                          )}

                          {t.audio_url && (
                            <span className="media-indicator-pill audio" title="Ovozli topshiriq">
                              🎙️ Ovoz
                            </span>
                          )}
                          {t.attachments && t.attachments.length > 0 && (
                            <span
                              className="media-indicator-pill att"
                              title={`${t.attachments.length} ta fayl biriktirilgan`}
                            >
                              📎 {t.attachments.length} fayl
                            </span>
                          )}
                          {t.completion_note && (
                            <span
                              className="media-indicator-pill report"
                              title="Xodim hisoboti mavjud"
                            >
                              📝 Hisobot
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="profile-task-action">
                        {t.status === 'submitted' ? (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTaskDetail && onOpenTaskDetail(t);
                            }}
                          >
                            ⏳ Tasdiqlash
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-accent"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTaskDetail && onOpenTaskDetail(t);
                            }}
                          >
                            Ko‘rish
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Modal Footer */}
        <div className="user-profile-foot">
          <div className="foot-info">
            <span>ID: #{userId}</span>
            <span className="dot-sep">·</span>
            <span>{displayEmail}</span>
          </div>
          <div className="foot-actions">
            <button className="btn" onClick={onClose}>
              Yopish
            </button>
            {displayRole !== 'admin' && onAssignTask && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onAssignTask(userId);
                  onClose();
                }}
              >
                + Vazifa biriktirish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
