const LABELS = {
  pending: 'Kutilmoqda',
  in_progress: 'Jarayonda',
  completed: 'Bajarildi',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${status}`}>
      <span className="pip" />
      {LABELS[status] || status}
    </span>
  );
}
