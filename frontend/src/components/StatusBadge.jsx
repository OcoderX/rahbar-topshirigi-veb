const LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${status}`}>
      <span className="pip" />
      {LABELS[status] || status}
    </span>
  );
}
