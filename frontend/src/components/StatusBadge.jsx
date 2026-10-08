const LABELS = {
  pending: 'Kutilmoqda',
  in_progress: 'Xodim ko‘rgan',
  submitted: 'Tasdiq kutilmoqda',
  completed: 'Bajarildi',
};

const EMPLOYEE_LABELS = {
  pending: 'Kutilmoqda',
  in_progress: 'Ko‘rildi',
  submitted: 'Rahbar tasdig‘ida',
  completed: 'Bajarildi',
};

const TOOLTIPS = {
  pending: 'Kutilmoqda (vazifa hali ochilmagan, ko‘rilmagan)',
  in_progress: 'Xodim tomonidan ko‘rilgan (ustida ishlanmoqda)',
  submitted: 'Rahbar tasdig‘i kutilmoqda (hisobot topshirilgan)',
  completed: 'Bajarildi (Rahbar tasdiqlagan va yakunlangan)',
};

export function getTaskStatusClass(task) {
  if (!task) return '';
  if (task.rework_required && task.status === 'in_progress') {
    return 'task-status-rework';
  }
  return `task-status-${task.status || 'pending'}`;
}

export default function StatusBadge({ status, reworkRequired = false, isEmployee = false }) {
  const isRework = reworkRequired && status === 'in_progress';
  const labelMap = isEmployee ? EMPLOYEE_LABELS : LABELS;

  return (
    <span
      className={`badge ${isRework ? 'rework' : status}`}
      title={isRework ? 'Rahbar tomonidan qayta ishlashga qaytarilgan' : TOOLTIPS[status] || ''}
    >
      <span className="pip" />
      {isRework ? 'Qayta ishlovda' : labelMap[status] || status}
    </span>
  );
}
