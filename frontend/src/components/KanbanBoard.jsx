import { useState } from 'react';
import StatusBadge from './StatusBadge';
import { formatDateTime, getRemainingTime } from '../utils/date';

export default function KanbanBoard({ tasks = [], onSelectTask, isEmployee = false }) {
  const [selectedColumn, setSelectedColumn] = useState('all');

  const COLUMNS = [
    {
      id: 'pending',
      title: isEmployee ? 'Kutilmoqda (Yangi)' : 'Kutilmoqda',
      shortTitle: 'Kutilmoqda',
      icon: '⏳',
      color: '#ef4444',
      badgeClass: 'pending',
    },
    {
      id: 'in_progress',
      title: isEmployee ? 'Ko‘rildi (Bajarishda)' : 'Xodim ko‘rgan',
      shortTitle: isEmployee ? 'Ko‘rildi' : 'Xodim ko‘rgan',
      icon: '👀',
      color: '#64748b',
      badgeClass: 'in_progress',
    },
    {
      id: 'submitted',
      title: isEmployee ? 'Rahbar tasdig‘ida' : 'Tasdiq kutilmoqda',
      shortTitle: 'Tasdiqda',
      icon: '📝',
      color: '#f59e0b',
      badgeClass: 'submitted',
    },
    {
      id: 'completed',
      title: isEmployee ? 'Bajarildi' : 'Bajarilgan',
      shortTitle: 'Bajarilgan',
      icon: '✅',
      color: '#10b981',
      badgeClass: 'completed',
    },
  ];

  const groupedTasks = {
    pending: [],
    in_progress: [],
    submitted: [],
    completed: [],
  };

  tasks.forEach((t) => {
    if (groupedTasks[t.status]) {
      groupedTasks[t.status].push(t);
    } else {
      groupedTasks.pending.push(t);
    }
  });

  const visibleColumns =
    selectedColumn === 'all'
      ? COLUMNS
      : COLUMNS.filter((c) => c.id === selectedColumn);

  return (
    <div className="kanban-wrapper">
      {/* Responsive toolbar with column switcher tabs */}
      <div className="kanban-toolbar">
        <div className="kanban-tab-switcher">
          <button
            type="button"
            className={`kanban-tab-btn ${selectedColumn === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedColumn('all')}
          >
            <span>📋 Barcha ustunlar</span>
            <span className="tab-count">{tasks.length}</span>
          </button>
          {COLUMNS.map((col) => {
            const count = (groupedTasks[col.id] || []).length;
            return (
              <button
                key={col.id}
                type="button"
                className={`kanban-tab-btn ${selectedColumn === col.id ? 'active' : ''}`}
                onClick={() => setSelectedColumn(col.id)}
              >
                <span>{col.icon} {col.shortTitle}</span>
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban Grid */}
      <div className={`kanban-grid ${selectedColumn !== 'all' ? 'single-col-mobile' : ''}`}>
        {visibleColumns.map((col) => {
          const colTasks = groupedTasks[col.id] || [];
          return (
            <div key={col.id} className={`kanban-column kanban-col-${col.id}`}>
              <div className="kanban-col-header">
                <div className="kanban-col-title-wrap">
                  <span className="kanban-col-icon">{col.icon}</span>
                  <h4 className="kanban-col-title">{col.title}</h4>
                </div>
                <span className="kanban-col-count">{colTasks.length}</span>
              </div>

              <div className="kanban-col-body">
                {colTasks.length === 0 ? (
                  <div className="kanban-col-empty">
                    <span>Topshiriq mavjud emas</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const remaining = task.due_date ? getRemainingTime(task.due_date) : null;
                    const isRework = task.rework_required && task.status === 'in_progress';
                    const initial = task.assignee_name
                      ? task.assignee_name.charAt(0).toUpperCase()
                      : '?';

                    // Parse attachments & completion media
                    const allAttachments = [
                      ...(Array.isArray(task.attachments) ? task.attachments : []),
                      ...(Array.isArray(task.completion_attachments) ? task.completion_attachments : []),
                    ];

                    const photoCount = allAttachments.filter(
                      (a) => (a.type || '').startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(a.name || '')
                    ).length;

                    const videoCount = allAttachments.filter(
                      (a) => (a.type || '').startsWith('video/') || /\.(mp4|webm)$/i.test(a.name || '')
                    ).length;

                    const docCount = allAttachments.filter(
                      (a) =>
                        !((a.type || '').startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(a.name || '')) &&
                        !((a.type || '').startsWith('video/') || /\.(mp4|webm)$/i.test(a.name || ''))
                    ).length;

                    const hasVoice = Boolean(task.audio_url || task.completion_audio);
                    const hasReport = Boolean(task.completion_note || task.submitted_at);

                    return (
                      <div
                        key={task.id}
                        className={`kanban-card status-${task.status} ${isRework ? 'kanban-card-rework' : ''}`}
                        onClick={() => onSelectTask(task)}
                      >
                        <div className="kanban-card-head">
                          <span className="kanban-card-id">#{task.id}</span>
                          <StatusBadge
                            status={task.status}
                            reworkRequired={task.rework_required}
                            isEmployee={isEmployee}
                          />
                        </div>

                        <div className="kanban-card-title">{task.title}</div>

                        <div className="kanban-card-footer">
                          <div className="kanban-assignee" title={task.assignee_name || 'Mas’ul'}>
                            <span className="kanban-avatar">{initial}</span>
                            <span className="kanban-assignee-name">
                              {task.assignee_name ? task.assignee_name.split(' ')[0] : '—'}
                            </span>
                          </div>

                          {task.due_date && (
                            <div
                              className={`kanban-deadline ${
                                remaining?.isOverdue ? 'overdue' : remaining?.isNearDue ? 'near-due' : ''
                              }`}
                              title={`Muddati: ${formatDateTime(task.due_date)}`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span>{remaining?.text || 'Muddatsiz'}</span>
                            </div>
                          )}
                        </div>

                        {/* Media and Execution indicators */}
                        {(hasVoice || photoCount > 0 || videoCount > 0 || hasReport || docCount > 0) && (
                          <div className="kanban-card-media-tags">
                            {hasVoice && (
                              <span className="kanban-tag audio" title="Ovozli xabar mavjud">
                                🎙️ Ovoz
                              </span>
                            )}
                            {photoCount > 0 && (
                              <span className="kanban-tag photo" title={`${photoCount} ta fotosurat mavjud`}>
                                🖼️ {photoCount} rasm
                              </span>
                            )}
                            {videoCount > 0 && (
                              <span className="kanban-tag video" title={`${videoCount} ta video mavjud`}>
                                🎥 {videoCount} video
                              </span>
                            )}
                            {hasReport && (
                              <span className="kanban-tag report" title="Xodim hisoboti mavjud">
                                📝 Hisobot
                              </span>
                            )}
                            {docCount > 0 && (
                              <span className="kanban-tag" title={`${docCount} ta biriktirilgan hujjat`}>
                                📎 {docCount} fayl
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
