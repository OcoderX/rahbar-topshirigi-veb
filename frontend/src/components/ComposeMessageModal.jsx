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

  // Target mode: 'single' (specific user) | 'position' (by position) | 'all' (broadcast to all)
  const [targetType, setTargetType] = useState(initialUser ? 'single' : 'single');
  const [selectedUser, setSelectedUser] = useState(initialUser);
  const [selectedPosition, setSelectedPosition] = useState('');
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
          currentUser?.role === 'admin' ? taskApi.list({ limit: 100 }) : Promise.resolve({ data: [] }),
        ]);

        // Filter out current user from recipients
        const otherUsers = (usersRes || []).filter((u) => u.id !== currentUser?.id);
        setUsers(otherUsers);
        setTasks(tasksRes?.data || []);
      } catch (err) {
        push('Foydalanuvchilarni yuklashda xatolik: ' + (err.message || ''), 'error');
      } finally {
        setLoadingUsers(false);
      }
    }
    loadData();
  }, [currentUser, push]);

  // Extract available distinct positions
  const availablePositions = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const pos = (u.position || '').trim();
      if (pos) {
        if (!map.has(pos)) {
          map.set(pos, []);
        }
        map.get(pos).push(u);
      }
    });
    return Array.from(map.entries())
      .map(([position, userList]) => ({
        position,
        users: userList,
        count: userList.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  // When switching to position tab and no position selected, default to first available
  useEffect(() => {
    if (targetType === 'position' && !selectedPosition && availablePositions.length > 0) {
      setSelectedPosition(availablePositions[0].position);
    }
  }, [targetType, selectedPosition, availablePositions]);

  // Users in selected position
  const positionTargetUsers = useMemo(() => {
    if (!selectedPosition) return [];
    return users.filter((u) => (u.position || '').trim() === selectedPosition);
  }, [users, selectedPosition]);

  // Filtered users for recipient picker in single mode
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

  // Target count
  const targetCount = useMemo(() => {
    if (targetType === 'single') return selectedUser ? 1 : 0;
    if (targetType === 'position') return positionTargetUsers.length;
    if (targetType === 'all') return users.length;
    return 0;
  }, [targetType, selectedUser, positionTargetUsers, users]);

  // Dynamic Send button label
  const sendButtonLabel = useMemo(() => {
    if (sending) return 'Yuborilmoqda…';
    if (targetType === 'single') {
      return selectedUser
        ? `✉️ ${selectedUser.name.split(' ')[0]}ga yuborish`
        : '✉️ Xabarni jo‘natish';
    }
    if (targetType === 'position') {
      return `✉️ ${positionTargetUsers.length} nafar xodimga yuborish`;
    }
    if (targetType === 'all') {
      return `📢 Barcha (${users.length} nafar) xodimlarga yo‘llash`;
    }
    return '✉️ Xabarni jo‘natish';
  }, [sending, targetType, selectedUser, positionTargetUsers, users]);

  async function handleSend(e) {
    e?.preventDefault();

    let recipientIds = [];
    let targetDesc = '';

    if (targetType === 'single') {
      if (!selectedUser) {
        push('Iltimos, xabar yuboriladigan xodimni tanlang', 'warning');
        return;
      }
      recipientIds = [selectedUser.id];
      targetDesc = selectedUser.name;
    } else if (targetType === 'position') {
      if (!selectedPosition) {
        push('Iltimos, lavozimni tanlang', 'warning');
        return;
      }
      if (positionTargetUsers.length === 0) {
        push('Tanlangan lavozimda xodimlar topilmadi', 'warning');
        return;
      }
      recipientIds = positionTargetUsers.map((u) => u.id);
      targetDesc = `"${selectedPosition}" lavozimidagi barcha (${positionTargetUsers.length} nafar) xodimlar`;
    } else if (targetType === 'all') {
      if (users.length === 0) {
        push('Tizimda xodimlar topilmadi', 'warning');
        return;
      }
      recipientIds = users.map((u) => u.id);
      targetDesc = `Barcha (${users.length} nafar) xodimlar`;
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
          // Backend handles fallback
        }
      }

      if (recipientIds.length === 1) {
        await messageApi.send({
          receiver_id: recipientIds[0],
          task_id: selectedTaskId ? Number(selectedTaskId) : null,
          message: messageText.trim() || null,
          audio_url: finalAudioUrl,
        });

        push(`${targetDesc}ga xabar muvaffaqiyatli yuborildi`, 'success');
        refreshInbox();
        onClose();

        const matchedTask = tasks.find((t) => t.id === Number(selectedTaskId)) || initialTask;
        openChatWithUser(selectedUser || users.find((u) => u.id === recipientIds[0]), matchedTask);
      } else {
        await messageApi.send({
          receiver_ids: recipientIds,
          task_id: selectedTaskId ? Number(selectedTaskId) : null,
          message: messageText.trim() || null,
          audio_url: finalAudioUrl,
        });

        push(`Xabar ${targetDesc}ga muvaffaqiyatli yo‘llandi!`, 'success');
        refreshInbox();
        onClose();
      }
    } catch (err) {
      push(err.message || 'Xabar yuborishda xatolik yuz berdi', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="compose-modal-overlay modal-backdrop" onClick={onClose}>
      <div
        className="modal-compose-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">✉️</span>
            <div>
              <h3>Yangi xabar yuborish</h3>
              <p className="modal-subtitle">Xodim, lavozim yoki barcha xodimlarga ko‘rsatma yo‘llang</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} title="Yopish">✕</button>
        </div>

        <form onSubmit={handleSend} className="modal-body-form">
          {/* Recipient Target Tabs */}
          <div className="form-group">
            <label className="form-label">
              Qabul qiluvchini tanlang <span className="req">*</span>
            </label>

            <div className="recipient-mode-tabs">
              <button
                type="button"
                className={`recipient-mode-tab ${targetType === 'single' ? 'active' : ''}`}
                onClick={() => setTargetType('single')}
              >
                <span>👤</span> Aynan bir xodim
              </button>
              <button
                type="button"
                className={`recipient-mode-tab ${targetType === 'position' ? 'active' : ''}`}
                onClick={() => setTargetType('position')}
              >
                <span>👔</span> Lavozim bo‘yicha
              </button>
              <button
                type="button"
                className={`recipient-mode-tab ${targetType === 'all' ? 'active' : ''}`}
                onClick={() => setTargetType('all')}
              >
                <span>📢</span> Barchaga (Hammaga)
              </button>
            </div>

            {/* Mode 1: Single employee */}
            {targetType === 'single' && (
              <div className="recipient-mode-panel">
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
                          Barchasi ({users.length})
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
            )}

            {/* Mode 2: By position */}
            {targetType === 'position' && (
              <div className="recipient-mode-panel">
                <div style={{ marginBottom: '0.65rem' }}>
                  <select
                    className="select"
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                  >
                    <option value="">— Lavozimni tanlang —</option>
                    {availablePositions.map((p) => (
                      <option key={p.position} value={p.position}>
                        👔 {p.position} ({p.count} nafar xodim)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPosition && (
                  <div className="target-summary-box">
                    <span className="target-summary-icon">👔</span>
                    <div className="target-summary-details">
                      <span className="target-summary-title">
                        "{selectedPosition}" lavozimidagi xodimlar ({positionTargetUsers.length} nafar)
                      </span>
                      <span className="target-summary-desc">
                        Xabar ushbu lavozimga biriktirilgan barcha xodimlarning inbox qutisiga bir vaqtda yetkaziladi.
                      </span>
                      <div className="target-user-chips">
                        {positionTargetUsers.map((u) => (
                          <span key={u.id} className="target-user-mini-chip">
                            {u.name} {u.district ? `(${u.district})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 3: Broadcast to all */}
            {targetType === 'all' && (
              <div className="recipient-mode-panel">
                <div className="target-summary-box broadcast">
                  <span className="target-summary-icon">📢</span>
                  <div className="target-summary-details">
                    <span className="target-summary-title">
                      Barcha xodimlarga umumiy xabar / ko‘rsatma (Jami {users.length} nafar)
                    </span>
                    <span className="target-summary-desc">
                      Ushbu xabar tashkilotning barcha ro‘yxatdan o‘tgan xodimlari Inbox qutisiga bir vaqtda yetkaziladi.
                    </span>
                    <div className="target-user-chips">
                      {users.slice(0, 10).map((u) => (
                        <span key={u.id} className="target-user-mini-chip">
                          {u.name} {u.position ? `(${u.position})` : ''}
                        </span>
                      ))}
                      {users.length > 10 && (
                        <span className="target-user-mini-chip">+{users.length - 10} nafar boshqalar</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Optional Task link */}
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

          {/* Message Text */}
          <div className="form-group">
            <label className="form-label">
              Xabar matni <span className="req">*</span>
            </label>
            <textarea
              className="textarea"
              rows={4}
              placeholder={
                targetType === 'all'
                  ? 'Barcha xodimlarga yuboriladigan umumiy ko‘rsatma yoki xabarni yozing...'
                  : targetType === 'position'
                    ? `"${selectedPosition || 'Lavozim'}" xodimlariga topshiriq yoki ko‘rsatmani yozing...`
                    : 'Xodimga yuboriladigan ko‘rsatma yoki xabarni yozing...'
              }
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
          </div>

          {/* Voice Note Recording */}
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

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={sending}>
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || targetCount === 0 || (!messageText.trim() && !audioUrl)}
            >
              {sendButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
