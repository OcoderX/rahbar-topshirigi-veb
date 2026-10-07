import { useEffect, useState } from 'react';
import AssigneeSelect from './AssigneeSelect';
import VoiceRecorder from './VoiceRecorder';
import AttachmentPicker from './AttachmentPicker';
import DueDatePicker from './DueDatePicker';
import { taskApi } from '../api/endpoints';

const STATUSES = [
  { value: 'pending', label: 'Yangi / Kutilmoqda' },
  { value: 'in_progress', label: 'Ko‘rildi' },
  { value: 'submitted', label: 'Jarayonda / Rahbar tasdig‘ida' },
  { value: 'completed', label: 'Bajarildi / Rahbar tasdiqlagan' },
];

export default function TaskModal({ task, initialAssignee, employees, onClose, onSubmit }) {
  const isEdit = Boolean(task);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: initialAssignee ? [initialAssignee] : [],
    status: 'pending',
    due_date: '',
    audio_url: '',
    attachments: [],
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        assigned_to: task.assigned_to || '',
        status: task.status || 'pending',
        due_date: task.due_date ? task.due_date.replace(' ', 'T').slice(0, 16) : '',
        audio_url: task.audio_url || '',
        attachments: Array.isArray(task.attachments) ? task.attachments : [],
      });
    } else if (initialAssignee) {
      setForm((f) => ({
        ...f,
        assigned_to: [initialAssignee],
      }));
    }
  }, [task, initialAssignee]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleAudioChange(base64) {
    set('audio_url', base64 || '');
    // If voice memo recorded and title is empty, auto-fill default title
    if (base64 && !form.title.trim()) {
      set('title', '🎙️ Ovozli topshiriq');
    }
  }

  async function handleSave() {
    setError('');

    // If audio is present, title can be default
    let effectiveTitle = form.title.trim();
    if (!effectiveTitle && form.audio_url) {
      effectiveTitle = '🎙️ Ovozli topshiriq';
      set('title', effectiveTitle);
    }

    if (!effectiveTitle) {
      return setError('Iltimos, sarlavha kiriting yoki ovozli xabar yozing.');
    }

    const selectedAssignees = Array.isArray(form.assigned_to)
      ? form.assigned_to
      : form.assigned_to
        ? [form.assigned_to]
        : [];

    if (selectedAssignees.length === 0) {
      return setError('Iltimos, ijrochi mas’ulni tanlang.');
    }

    setSaving(true);
    setSavingStatus('Fayllar yuklanmoqda…');

    try {
      // 1. Upload audio if it is in base64 format
      let finalAudioUrl = form.audio_url;
      if (form.audio_url && form.audio_url.startsWith('data:')) {
        const audioUpload = await taskApi.upload({
          file: form.audio_url,
          name: `ovozli_topshiriq_${Date.now()}.webm`,
          type: 'audio/webm',
        });
        finalAudioUrl = audioUpload.url;
      }

      // 2. Upload attachments if any have base64 data
      const finalAttachments = [];
      if (form.attachments && form.attachments.length > 0) {
        for (const att of form.attachments) {
          if (att.file && att.file.startsWith('data:')) {
            const uploaded = await taskApi.upload({
              file: att.file,
              name: att.name,
              type: att.type,
              size: att.size,
            });
            finalAttachments.push(uploaded);
          } else {
            finalAttachments.push(att);
          }
        }
      }

      setSavingStatus('Vazifa saqlanmoqda…');

      const payload = {
        title: effectiveTitle,
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        audio_url: finalAudioUrl || null,
        attachments: finalAttachments,
      };

      // Status is only included on edit (creator cannot manually set status on new task)
      if (isEdit) {
        payload.status = form.status;
      }

      payload.assigned_to = isEdit
        ? Number(selectedAssignees[0])
        : selectedAssignees.map(Number);

      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'Saqlashda xatolik yuz berdi');
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal task-modal-lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>{isEdit ? 'Vazifani tahrirlash' : 'Yangi vazifa yaratish'}</h2>
            <span className="modal-subtitle">
              {isEdit ? 'Topshiriq tafsilotlarini o‘zgartirish' : 'Rahbar topshirig‘ini mas’ullarga yo‘llash'}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          {/* Sarlavha + Ovozli xabar mikrofon tugmasi yonma-yon */}
          <div className="field">
            <div className="field-head-with-action">
              <label>Sarlavha</label>
              <VoiceRecorder
                audioUrl={form.audio_url}
                onAudioChange={handleAudioChange}
              />
            </div>
            <input
              className="input input-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Masalan: 3-chorak hisobotini tayyorlash (yoki ovoz yozing)"
            />
          </div>

          {/* Tavsif */}
          <div className="field">
            <label>Tavsif va ko‘rsatmalar</label>
            <textarea
              className="textarea"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Qo‘shimcha ko‘rsatmalar va talablar (ixtiyoriy)…"
            />
          </div>

          {/* Biriktirilgan mas'ul */}
          <div className="field">
            <label>Biriktirilgan mas’ul xodim</label>
            <AssigneeSelect
              employees={employees}
              value={form.assigned_to}
              onChange={(value) => set('assigned_to', value)}
              multiple={!isEdit}
              placeholder="— Mas’ul xodimni tanlang —"
            />
          </div>

          {/* Bajarish muddati (Bugun, Ertaga, 1 hafta, 15 kun, 1 oy va vaqti bilan) */}
          <div className="field">
            <label>Bajarish muddati (kun va aniq vaqt)</label>
            <DueDatePicker
              value={form.due_date}
              onChange={(val) => set('due_date', val)}
            />
          </div>

          {/* Topshiriqqa fayllar biriktirish (Excel, PDF, Rasm, Video) */}
          <div className="field">
            <AttachmentPicker
              attachments={form.attachments}
              onChange={(newAtts) => set('attachments', newAtts)}
              label="Topshiriqqa biriktirilgan fayllar (Excel, PDF, Rasm, Video)"
            />
          </div>

          {/* Faqat tahrirlashda holat ko'rinadi (Yangi topshiriq yaratilayotganda kiritilmaydi!) */}
          {isEdit && (
            <div className="field">
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
          )}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? savingStatus || 'Saqlanmoqda…'
              : isEdit
                ? 'O‘zgarishlarni saqlash'
                : 'Topshiriqni yuborish'}
          </button>
        </div>
      </div>
    </div>
  );
}
