const LABELS = {
  pending: 'Kutilmoqda',
  in_progress: 'Ko‘rildi',
  submitted: 'Jarayonda',
  completed: 'Bajarildi',
};

export default function StatusBadge({ status, reworkRequired = false }) {
  const isRework = reworkRequired && status === 'in_progress';
  return (
    <span className={`badge ${isRework ? 'rework' : status}`}>
      <span className="pip" />
      {isRework ? 'Qayta ishlovda' : LABELS[status] || status}
    </span>
  );
}
