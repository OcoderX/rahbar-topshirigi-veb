const LABELS = {
  pending: 'Kutilmoqda',
  in_progress: 'Ko‘rildi',
  submitted: 'Jarayonda',
  completed: 'Bajarildi',
};

const TOOLTIPS = {
  pending: 'Kutilmoqda (vazifa hali ochilmagan, ko‘rilmagan)',
  in_progress: 'Ko‘rildi (ko‘rilgan, ammo bajarilmagan)',
  submitted: 'Jarayonda (Rahbar hali tasdiqlab qabul qilmagan)',
  completed: 'Bajarildi (Rahbar tasdiqlagan va yakunlangan)',
};

export default function StatusBadge({ status, reworkRequired = false }) {
  const isRework = reworkRequired && status === 'in_progress';
  return (
    <span
      className={`badge ${isRework ? 'rework' : status}`}
      title={isRework ? 'Rahbar tomonidan qayta ishlashga qaytarilgan' : TOOLTIPS[status] || ''}
    >
      <span className="pip" />
      {isRework ? 'Qayta ishlovda' : LABELS[status] || status}
    </span>
  );
}
