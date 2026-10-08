import StatusBadge from './StatusBadge';
import { formatDateTime, getRemainingTime } from '../utils/date';

const COLUMNS = [
  { id: 'pending', title: 'Kutilmoqda', icon: '⏳', color: 'var(--pend)' },
  { id: 'in_progress', title: 'Ko‘rildi', icon: '👀', color: 'var(--info)' },
  { id: 'submitted', title: 'Jarayonda / Tasdiqda', icon: '🚀', color: 'var(--warn)' },
  { id: 'completed', title: 'Bajarildi', icon: '✅', color: 'var(--ok)' },
];

export default function KanbanBoard({ tasks = [], onSelectTask, onQuickStatusChange, isEmployee = false }) {
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

  return (
    <div className="kanban-wrapper">
      <div className="kanban-grid">
        {COLUMNS.map((col) => {
          const colTasks = groupedTasks[col.id] || [];
          return (
            <div key={col.id} className="kanban-column">
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
                    <span>Hozircha topshiriq yo‘q</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const remaining = task.due_date ? getRemainingTime(task.due_date) : null;
                    const isRework = task.rework_required && task.status === 'in_progress';
                    const initial = task.assignee_name
                      ? task.assignee_name.charAt(0).toUpperCase()
                      : '?';

                    return (
                      <div
                        key={task.id}
                        className={`kanban-card ${isRework ? 'kanban-card-rework' : ''}`}
                        onClick={() => onSelectTask(task)}
                      >
                        <div className="kanban-card-head">
                          <span className="kanban-card-id">#{task.id}</span>
                          <StatusBadge status={task.status} reworkRequired={task.rework_required} />
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

                        {(task.voice_instructions_url || (task.attachments && task.attachments.length > 0)) && (
                          <div className="kanban-card-media-tags">
                            {task.voice_instructions_url && (
                              <span className="kanban-tag" title="Ovozli topshiriq">🎙️ Ovoz</span>
                            )}
                            {task.attachments && task.attachments.length > 0 && (
                              <span className="kanban-tag" title="Biriktirilgan fayllar">📎 {task.attachments.length} fayl</span>
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
