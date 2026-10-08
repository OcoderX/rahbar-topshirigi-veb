import { useState, useEffect, useMemo } from 'react';
import { userApi, taskApi, messageApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useMessenger } from '../context/MessageContext';
import { useToast } from './Toast';
import VoiceRecorder from './VoiceRecorder';

export default function ComposeMessageModal({ onClose, initialUser = null, initialTask = null }) {
  const { user: currentUser } = useAuth();
  const { openChatWithUser, refreshInbox } = useMessenger();
  const { push } = useToast();

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [selectedUser, setSelectedUser] = useState(initialUser);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTask?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'region' | 'district'

  const [messageText, setMessageText] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [sending, setSending] = useState(false);

  // Load users and tasks
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingUsers(true);
        const [usersRes, tasksRes] = await Promise.all([
          userApi.list(),
          currentUser.role === 'admin' ? taskApi.list({ limit: 100 }) : Promise.resolve({ data: [] }),
        ]);

        // Filter out current user
        const otherUsers = (usersRes || []).filter((u) => u.id !== currentUser.id);
        setUsers(otherUsers);
        setTasks(tasksRes?.data || []);
      } catch (err) {
        push('Foydalanuvchilarni yuklashda xatolik: ' + err.message, 'error');
      } finally {
        setLoadingUsers(false);
      }
    }
    loadData();
  }, [currentUser, push]);

  // Filtered users for recipient picker
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (categoryFilter === 'region' && u.territory_type !== 'region') return false;
      if (categoryFilter === 'district' && u.territory_type !== 'district') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.position?.toLowerCase().includes(q) ||
        u.district?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });
  }, [users, categoryFilter, searchQuery]);

  async function handleSend(e) {
    e?.preventDefault();
    if (!selectedUser) {
      push('Iltimos, xabar yuboriladigan xodimni tanlang', 'warning');
      return;
    }

    if (!messageText.trim() && !audioUrl) {
      push('Iltimos, xabar matnini kiriting yoki ovozli xabar yozing', 'warning');
      return;
    }

    setSending(true);
    try {
      let finalAudioUrl = audioUrl;

      // If audio is base64, upload to server
      if (audioUrl && audioUrl.startsWith('data:audio')) {
        try {
          const uploadRes = await taskApi.upload({
            file: audioUrl,
            name: `voice_${Date.now()}.webm`,
            type: 'audio/webm',
            size: audioBlob ? audioBlob.size : 0,
          });
          finalAudioUrl = uploadRes.url;
        } catch (_uploadErr) {
          // If upload fails, backend will try to save base64
        }
      }

      const res = await messageApi.send({
        receiver_id: selectedUser.id,
        task_id: selectedTaskId ? Number(selectedTaskId) : null,
        message: messageText.trim() || null,
        audio_url: finalAudioUrl,
      });

      push(`${selectedUser.name} ga xabar muvaffaqiyatli yuborildi`, 'success');
      refreshInbox();
      onClose();

      // Find task object if any
      const matchedTask = tasks.find((t) => t.id === Number(selectedTaskId)) || initialTask;
      openChatWithUser(selectedUser, matchedTask);
    } catch (err) {
      push(err.message || 'Xabar yuborishda xatolik yuz berdi', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-compose-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 600, width: '92%' }}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">✉️</span>
            <div>
              <h3>Yangi xabar yuborish</h3>
              <p className="modal-subtitle">Xodimni tanlang va matn yoki ovozli xabar yo‘llang</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Yopish">✕</button>
        </div>

        <form onSubmit={handleSend} className="modal-body-form">
          {/* 1. Recipient Selection */}
          <div className="form-group">
            <label className="form-label">
              Qabul qiluvchi xodim <span className="req">*</span>
            </label>

            {selectedUser ? (
              <div className="selected-recipient-pill">
                <div className="recipient-info">
                  <div className="recipient-avatar">
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt={selectedUser.name} />
                    ) : (
                      <span>{selectedUser.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <strong className="recipient-name">{selectedUser.name}</strong>
                    <span className="recipient-pos">
                      {selectedUser.position || (selectedUser.role === 'admin' ? 'Rahbar' : 'Xodim')}
                      {selectedUser.district ? ` • ${selectedUser.district}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-remove-recipient"
                  onClick={() => setSelectedUser(null)}
                  title="Boshqa xodim tanlash"
                >
                  ✕ O‘zgartirish
                </button>
              </div>
            ) : (
              <div className="recipient-picker-wrap">
                <div className="picker-controls">
                  <input
                    type="text"
                    className="input input-sm picker-search-input"
                    placeholder="Xodim ismi, lavozimi yoki tumani bo‘yicha qidiring..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="filter-chips">
                    <button
                      type="button"
                      className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setCategoryFilter('all')}
                    >
                      Barchasi
                    </button>
                    <button
                      type="button"
                      className={`filter-chip ${categoryFilter === 'region' ? 'active' : ''}`}
                      onClick={() => setCategoryFilter('region')}
                    >
                      Viloyat
                    </button>
                    <button
                      type="button"
                      className={`filter-chip ${categoryFilter === 'district' ? 'active' : ''}`}
                      onClick={() => setCategoryFilter('district')}
                    >
                      Tumanlar
                    </button>
                  </div>
                </div>

                <div className="recipient-list-scroll">
                  {loadingUsers ? (
                    <div className="picker-loading">Xodimlar ro‘yxati yuklanmoqda…</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="picker-empty">Hech qanday xodim topilmadi</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="recipient-list-item"
                        onClick={() => setSelectedUser(u)}
                      >
                        <div className="recipient-thumb">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} />
                          ) : (
                            <span>{u.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="recipient-meta">
                          <span className="name">{u.name}</span>
                          <span className="pos">
                            {u.position || (u.role === 'admin' ? 'Rahbar' : 'Xodim')}
                            {u.district ? ` • ${u.district}` : ''}
                          </span>
                        </div>
                        <span className="btn-select-arrow">Tanlash →</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Optional Task link */}
          {tasks.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Bog‘langan topshiriq <span className="muted-hint">(ixtiyoriy)</span>
              </label>
              <select
                className="select"
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                <option value="">— Hech qaysi topshiriqqa bog‘lanmasin —</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id}: {t.title} {t.assignee_name ? `(${t.assignee_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Message Text */}
          <div className="form-group">
            <label className="form-label">
              Xabar matni <span className="req">*</span>
            </label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Xodimga yuboriladigan ko‘rsatma yoki xabarni yozing..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </div>

          {/* 4. Voice Note Recording */}
          <div className="form-group">
            <label className="form-label">
              Ovozli xabar <span className="muted-hint">(ovoz yozish yoki mikrofon)</span>
            </label>
            <VoiceRecorder
              audioUrl={audioUrl}
              onAudioChange={(url, blob) => {
                setAudioUrl(url);
                setAudioBlob(blob);
              }}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || (!messageText.trim() && !audioUrl)}
            >
              {sending ? 'Yuborilmoqda…' : '✉️ Xabarni jo‘natish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
