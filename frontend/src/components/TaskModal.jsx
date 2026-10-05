import { useEffect, useState } from 'react';

const STATUSES = [
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'in_progress', label: 'Jarayonda' },
  { value: 'completed', label: 'Bajarildi' },
];

/**
 * Create/Edit task modal for admins.
 * @param {object|null} task   existing task when editing, null when creating
 * @param {array}       employees  list of {id, name} for the assignee dropdown
 */
export default function TaskModal({ task, employees, onClose, onSubmit }) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    status: 'pending',
    due_date: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        assigned_to: task.assigned_to || '',
        status: task.status || 'pending',
        due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      });
    }
  }, [task]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setError('');
    if (!form.title.trim()) return setError('Sarlavha kiritilishi shart.');
    if (!isEdit && !form.assigned_to) return setError('Iltimos, ijrochi xodimni tanlang.');

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        due_date: form.due_date || null,
      };
      // assigned_to only matters on create / admin reassignment.
      if (form.assigned_to) payload.assigned_to = Number(form.assigned_to);
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isEdit ? 'Vazifani tahrirlash' : 'Yangi vazifa'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label>Sarlavha</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Masalan: 3-chorak taqdimotini tayyorlash"
            />
          </div>

          <div className="field">
            <label>Tavsif</label>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Qo‘shimcha tafsilotlar (ixtiyoriy)…"
            />
          </div>

          <div className="field">
            <label>Biriktirilgan xodim</label>
            <select
              className="select"
              value={form.assigned_to}
              onChange={(e) => set('assigned_to', e.target.value)}
            >
              <option value="">— Xodimni tanlang —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          <div className="row" style={{ gap: '1rem' }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Holati</label>
              <select
                className="select"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Bajarish muddati</label>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saqlanmoqda…' : isEdit ? 'O‘zgarishlarni saqlash' : 'Vazifa yaratish'}
          </button>
        </div>
      </div>
    </div>
  );
}
