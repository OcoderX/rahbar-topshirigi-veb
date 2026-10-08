import { useState, useEffect, useRef, useCallback } from 'react';
import { messageApi, taskApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useMessenger } from '../context/MessageContext';
import { useToast } from './Toast';
import VoiceRecorder from './VoiceRecorder';
import ComposeMessageModal from './ComposeMessageModal';
import TaskDetailModal from './TaskDetailModal';
import EditHistoryModal from './EditHistoryModal';

export default function FacebookMessenger() {
  const { user: currentUser } = useAuth();
  const {
    unreadCount,
    conversations,
    activePartner,
    activeTask,
    setActiveTask,
    isMessengerOpen,
    isComposeOpen,
    composeInitialUser,
    composeInitialTask,
    toggleMessenger,
    closeMessenger,
    selectConversation,
    backToInboxList,
    openCompose,
    closeCompose,
    refreshInbox,
  } = useMessenger();

  const { push } = useToast();

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [recordingAudio, setRecordingAudio] = useState(null);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [isVoiceRecordingOpen, setIsVoiceRecordingOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [playingAudioId, setPlayingAudioId] = useState(null);

  // New features: Task Modal, Message Editing & Edit History
  const [viewingTask, setViewingTask] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [historyMessageId, setHistoryMessageId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const audioElementsRef = useRef({});

  // Auto-scroll messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Fetch active conversation messages
  const loadConversation = useCallback(async (partnerId, isInitial = false) => {
    if (!partnerId) return;
    if (isInitial) setLoadingMessages(true);
    try {
      const res = await messageApi.conversation(partnerId);
      setMessages(res.messages || []);
      if (isInitial) {
        setTimeout(() => scrollToBottom(false), 50);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      if (isInitial) setLoadingMessages(false);
    }
  }, [scrollToBottom]);

  // Load when activePartner changes
  useEffect(() => {
    if (activePartner?.id) {
      setEditingMessage(null);
      loadConversation(activePartner.id, true);
    } else {
      setMessages([]);
      setEditingMessage(null);
    }
  }, [activePartner?.id, loadConversation]);

  // Poll conversation every 4 seconds if open and chatting
  useEffect(() => {
    if (!isMessengerOpen || !activePartner?.id) return;
    const interval = setInterval(() => {
      loadConversation(activePartner.id, false);
    }, 4000);
    return () => clearInterval(interval);
  }, [isMessengerOpen, activePartner?.id, loadConversation]);

  // Auto-scroll when messages length increases
  useEffect(() => {
    if (messages.length > 0 && !editingMessage) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom, editingMessage]);

  // Open Task modal (role-aware: employee gets employee window, leader gets leader window)
  async function handleOpenTaskModal(taskId) {
    if (!taskId) return;
    try {
      const fullTask = await taskApi.get(taskId);
      setViewingTask(fullTask);
    } catch (err) {
      push('Topshiriqni ochishda xatolik: ' + (err.message || ''), 'error');
    }
  }

  // Start editing a message
  function startEditingMessage(m) {
    if (!m || m.sender_id !== currentUser?.id) return;
    setEditingMessage(m);
    setInputText(m.message || '');
    setIsVoiceRecordingOpen(false);
    setRecordingAudio(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  // Cancel editing message
  function cancelEditingMessage() {
    setEditingMessage(null);
    setInputText('');
  }

  // Send or Edit message
  async function handleSendMessage(e) {
    e?.preventDefault();
    if (!activePartner) return;

    // Handle Editing existing message
    if (editingMessage) {
      if (!inputText.trim()) {
        push('Xabar matni bo‘sh bo‘lishi mumkin emas', 'warning');
        return;
      }
      const newText = inputText.trim();
      setSending(true);
      try {
        await messageApi.edit(editingMessage.id, { message: newText });
        setMessages((prev) =>
          prev.map((item) =>
            item.id === editingMessage.id
              ? {
                  ...item,
                  message: newText,
                  is_edited: 1,
                  edited_at: new Date().toISOString(),
                }
              : item
          )
        );
        setEditingMessage(null);
        setInputText('');
        refreshInbox();
        push('Xabar muvaffaqiyatli tahrirlandi', 'success');
      } catch (err) {
        push('Xabarni tahrirlashda xatolik: ' + err.message, 'error');
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
      return;
    }

    // Normal Send new message
    if (!inputText.trim() && !recordingAudio) return;

    const textToSend = inputText.trim();
    const audioToSend = recordingAudio;
    const blobToSend = recordingBlob;

    setInputText('');
    setRecordingAudio(null);
    setRecordingBlob(null);
    setIsVoiceRecordingOpen(false);
    setSending(true);

    try {
      let finalAudioUrl = audioToSend;
      if (audioToSend && audioToSend.startsWith('data:audio')) {
        try {
          const uploadRes = await taskApi.upload({
            file: audioToSend,
            name: `voice_${Date.now()}.webm`,
            type: 'audio/webm',
            size: blobToSend ? blobToSend.size : 0,
          });
          finalAudioUrl = uploadRes.url;
        } catch (_uploadErr) {
          // backend fallback
        }
      }

      const res = await messageApi.send({
        receiver_id: activePartner.id,
        task_id: activeTask?.id || null,
        message: textToSend || null,
        audio_url: finalAudioUrl,
      });

      // Optimistically append
      setMessages((prev) => [...prev, res]);
      refreshInbox();
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      push('Xabar yuborishda xatolik: ' + err.message, 'error');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // Audio playback toggle helper
  function toggleAudioPlay(msgId, _url) {
    const el = audioElementsRef.current[msgId];
    if (!el) return;

    if (playingAudioId === msgId) {
      el.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any other playing audio
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }
      el.play();
      setPlayingAudioId(msgId);
    }
  }

  // Format message time
  function formatMsgTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  // Format conversation relative time
  function formatRelativeTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return 'Hozirgina';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} daq`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} soat`;
      return `${Math.floor(diffSec / 86400)} kun`;
    } catch {
      return '';
    }
  }

  // Filtered conversation list
  const filteredConversations = conversations.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.position?.toLowerCase().includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    );
  });

  if (!currentUser) return null;

  return (
    <>
      {/* 1. Floating Facebook Messenger Launcher Bubble (Bottom-Right) */}
      {!isMessengerOpen && (
        <button
          id="fb-messenger-fab"
          className="fb-messenger-fab"
          onClick={toggleMessenger}
          title="Xabarlar (Inbox) — Facebook Messenger"
          aria-label="Xabarlar qutisi"
        >
          <div className="fb-messenger-fab-inner">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="fb-messenger-icon"
            >
              <path
                d="M14 2.333C7.556 2.333 2.333 7.158 2.333 13.111c0 3.393 1.692 6.425 4.34 8.35v4.206l3.966-2.18c1.074.298 2.205.457 3.361.457 6.444 0 11.667-4.825 11.667-10.778 0-5.953-5.223-10.833-11.667-10.833z"
                fill="currentColor"
              />
              <path
                d="M15.4 16.567l-2.917-3.115-5.694 3.115 6.265-6.65 2.987 3.115 5.624-3.115-6.265 6.65z"
                fill="#ffffff"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="fb-messenger-badge-pulse" title={`${unreadCount} ta yangi xabar`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* 2. Docked Facebook Messenger Box Window */}
      {isMessengerOpen && (
        <div id="fb-messenger-window" className="fb-messenger-window">
          {/* Header */}
          <div className="fb-messenger-header">
            {activePartner ? (
              // Header in active conversation
              <div className="fb-header-partner-view">
                <button
                  type="button"
                  className="fb-btn-back"
                  onClick={backToInboxList}
                  title="Xabarlar ro‘yxatiga qaytish"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <div className="fb-partner-summary">
                  <div className="fb-avatar-wrap">
                    {activePartner.avatar ? (
                      <img src={activePartner.avatar} alt={activePartner.name} />
                    ) : (
                      <span>{activePartner.name.charAt(0).toUpperCase()}</span>
                    )}
                    <span className="fb-online-dot" />
                  </div>
                  <div className="fb-partner-names">
                    <span className="fb-name">{activePartner.name}</span>
                    <span className="fb-pos">
                      {activePartner.position || (activePartner.role === 'admin' ? 'Rahbar' : 'Xodim')}
                    </span>
                  </div>
                </div>

                <div className="fb-header-tools">
                  <button
                    type="button"
                    className="fb-tool-btn"
                    onClick={closeMessenger}
                    title="Yopish"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              // Header in Inbox overview
              <div className="fb-header-inbox-view">
                <div className="fb-header-title">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 28 28"
                    fill="currentColor"
                    className="fb-title-icon"
                  >
                    <path d="M14 2.333C7.556 2.333 2.333 7.158 2.333 13.111c0 3.393 1.692 6.425 4.34 8.35v4.206l3.966-2.18c1.074.298 2.205.457 3.361.457 6.444 0 11.667-4.825 11.667-10.778 0-5.953-5.223-10.833-11.667-10.833z" />
                    <path
                      d="M15.4 16.567l-2.917-3.115-5.694 3.115 6.265-6.65 2.987 3.115 5.624-3.115-6.265 6.65z"
                      fill="#ffffff"
                    />
                  </svg>
                  <span>Xabarlar (Inbox)</span>
                  {unreadCount > 0 && (
                    <span className="fb-inbox-count-pill">{unreadCount}</span>
                  )}
                </div>

                <div className="fb-header-actions">
                  <button
                    type="button"
                    className="fb-new-msg-btn"
                    onClick={() => openCompose()}
                    title="Yangi xabar yozish"
                  >
                    ✏️ Yangi
                  </button>
                  <button
                    type="button"
                    className="fb-tool-btn"
                    onClick={closeMessenger}
                    title="Yopish"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="fb-messenger-body">
            {activePartner ? (
              // ACTIVE CHAT VIEW
              <div className="fb-chat-container">
                {/* Linked task banner — Clickable to open full task modal */}
                {activeTask && (
                  <div className="fb-task-banner clickable-task-banner">
                    <div
                      className="fb-task-banner-main"
                      onClick={() => handleOpenTaskModal(activeTask.id)}
                      title="Ushbu topshiriq oynasini ochish uchun bosing"
                    >
                      <span className="fb-task-icon">📌</span>
                      <div className="fb-task-text">
                        <span className="fb-task-label">Bog‘langan topshiriq:</span>
                        <strong className="fb-task-title">{activeTask.title}</strong>
                      </div>
                      <span className="fb-task-open-action">Ochish ↗</span>
                    </div>
                    <button
                      type="button"
                      className="fb-task-banner-close"
                      onClick={() => setActiveTask(null)}
                      title="Bog‘lanishni bekor qilish"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Messages feed */}
                <div className="fb-messages-feed">
                  {loadingMessages ? (
                    <div className="fb-feed-loading">
                      <div className="spinner-dots"><span /><span /><span /></div>
                      <span>Xabarlar yuklanmoqda…</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="fb-feed-empty">
                      <div className="fb-empty-avatar">
                        {activePartner.avatar ? (
                          <img src={activePartner.avatar} alt={activePartner.name} />
                        ) : (
                          <span>{activePartner.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <h4>{activePartner.name}</h4>
                      <p>Hozircha xabarlar yo‘q. Birinchi xabarni yoki ovozli ko‘rsatmani yozing!</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === currentUser.id;
                      return (
                        <div
                          key={m.id}
                          className={`fb-msg-row ${isMe ? 'fb-msg-outgoing' : 'fb-msg-incoming'}`}
                        >
                          {!isMe && (
                            <div className="fb-msg-avatar" title={m.sender_name}>
                              {m.sender_avatar ? (
                                <img src={m.sender_avatar} alt={m.sender_name} />
                              ) : (
                                <span>{(m.sender_name || 'U').charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                          )}

                          <div className="fb-msg-bubble-wrap">
                            {/* Attached task chip if present — Clickable to open Task Modal */}
                            {m.task_title && (
                              <div
                                className="fb-msg-task-chip clickable-task-chip"
                                onClick={() => handleOpenTaskModal(m.task_id)}
                                title="Topshiriq oynasini ochish uchun bosing"
                              >
                                <span className="chip-pin">📌</span>
                                <span className="chip-text">
                                  Topshiriq: <strong>{m.task_title}</strong>
                                </span>
                                <span className="chip-open-arrow">↗</span>
                              </div>
                            )}

                            {/* Voice message player if present */}
                            {m.audio_url && (
                              <div className="fb-voice-player-bubble">
                                <audio
                                  ref={(el) => (audioElementsRef.current[m.id] = el)}
                                  src={m.audio_url}
                                  onEnded={() => setPlayingAudioId(null)}
                                />
                                <button
                                  type="button"
                                  className="fb-btn-play-voice"
                                  onClick={() => toggleAudioPlay(m.id, m.audio_url)}
                                  title={playingAudioId === m.id ? 'To‘xtatish' : 'Tinglash'}
                                >
                                  {playingAudioId === m.id ? '⏸' : '▶'}
                                </button>
                                <div className="fb-voice-meta">
                                  <span className="fb-voice-title">🎙️ Ovozli xabar</span>
                                  <span className="fb-voice-hint">Eshitish uchun bosing</span>
                                </div>
                              </div>
                            )}

                            {/* Text message with edit action */}
                            {m.message && (
                              <div className="fb-msg-bubble-text-wrap">
                                <div className="fb-msg-bubble-text">{m.message}</div>
                                {isMe && (
                                  <button
                                    type="button"
                                    className="fb-btn-edit-inline"
                                    onClick={() => startEditingMessage(m)}
                                    title="Xabarni tahrirlash"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Message time, edited tag, and Telegram-style read receipts */}
                            <div className="fb-msg-timestamp">
                              <span>{formatMsgTime(m.created_at)}</span>

                              {/* Edited tag with History link */}
                              {Boolean(m.is_edited) && (
                                <button
                                  type="button"
                                  className="fb-edited-tag"
                                  onClick={() => setHistoryMessageId(m.id)}
                                  title="Tahrir tarixini ko‘rish uchun bosing"
                                >
                                  tahrirlangan
                                </button>
                              )}

                              {/* Telegram style checks: ✓ (sent/unread) or ✓✓ (read) */}
                              {isMe && (
                                <span
                                  className={`tg-read-status ${m.is_read ? 'tg-read' : 'tg-unread'}`}
                                  title={m.is_read ? "O‘qildi (Ko‘rildi)" : "Yetkazildi (Hali o‘qilmagan)"}
                                >
                                  {m.is_read ? (
                                    <span className="tg-double-check">✓✓</span>
                                  ) : (
                                    <span className="tg-single-check">✓</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Voice recorder panel if toggled */}
                {isVoiceRecordingOpen && (
                  <div className="fb-inline-recorder-panel">
                    <div className="fb-recorder-header">
                      <span>🎙️ Ovozli xabar yozish</span>
                      <button
                        type="button"
                        className="fb-btn-close-recorder"
                        onClick={() => {
                          setIsVoiceRecordingOpen(false);
                          setRecordingAudio(null);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <VoiceRecorder
                      audioUrl={recordingAudio}
                      onAudioChange={(url, blob) => {
                        setRecordingAudio(url);
                        setRecordingBlob(blob);
                      }}
                    />
                  </div>
                )}

                {/* Editing mode banner */}
                {editingMessage && (
                  <div className="fb-composer-edit-banner">
                    <div className="fb-edit-banner-info">
                      <span className="fb-edit-icon">✏️</span>
                      <div className="fb-edit-texts">
                        <span className="fb-edit-title">Xabarni tahrirlash:</span>
                        <span className="fb-edit-preview-text">{editingMessage.text}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="fb-btn-cancel-edit"
                      onClick={cancelEditingMessage}
                      title="Bekor qilish"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Chat composer input */}
                <form onSubmit={handleSendMessage} className="fb-chat-composer">
                  {!editingMessage && (
                    <button
                      type="button"
                      className={`fb-btn-mic-toggle ${isVoiceRecordingOpen ? 'active' : ''} ${recordingAudio ? 'has-audio' : ''}`}
                      onClick={() => setIsVoiceRecordingOpen((prev) => !prev)}
                      title={recordingAudio ? 'Ovozli xabar tayyor' : 'Ovoz yozish (Mikrofon)'}
                    >
                      🎙️
                    </button>
                  )}

                  <input
                    ref={inputRef}
                    type="text"
                    className="fb-composer-input"
                    placeholder={
                      editingMessage
                        ? 'Yangi matnni kiriting...'
                        : recordingAudio
                          ? 'Ovoz tayyor. Qo‘shimcha matn (ixtiyoriy)...'
                          : 'Xabar yozing...'
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={sending}
                  />

                  <button
                    type="submit"
                    className={`fb-btn-send ${editingMessage ? 'fb-btn-send-edit' : ''}`}
                    disabled={sending || (!inputText.trim() && !recordingAudio)}
                    title={editingMessage ? 'O‘zgarishni saqlash' : 'Yuborish'}
                  >
                    {editingMessage ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              // INBOX CONVERSATIONS LIST VIEW
              <div className="fb-inbox-list-container">
                {/* Search */}
                <div className="fb-inbox-search">
                  <input
                    type="text"
                    placeholder="Suhbatlarni qidirish..."
                    className="fb-search-input"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>

                {/* Conversation rows */}
                <div className="fb-conversations-scroll">
                  {filteredConversations.length === 0 ? (
                    <div className="fb-inbox-empty">
                      <div className="fb-empty-icon">💬</div>
                      <p>Suhbatlar mavjud emas</p>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => openCompose()}
                      >
                        + Yangi xabar yozish
                      </button>
                    </div>
                  ) : (
                    filteredConversations.map((c) => {
                      const hasUnread = Number(c.unread_count) > 0;
                      return (
                        <div
                          key={c.id}
                          className={`fb-conv-row ${hasUnread ? 'unread' : ''}`}
                          onClick={() => selectConversation(c)}
                        >
                          <div className="fb-conv-avatar">
                            {c.avatar ? (
                              <img src={c.avatar} alt={c.name} />
                            ) : (
                              <span>{c.name.charAt(0).toUpperCase()}</span>
                            )}
                            {hasUnread && <span className="fb-unread-dot" />}
                          </div>

                          <div className="fb-conv-info">
                            <div className="fb-conv-top">
                              <span className="fb-conv-name">{c.name}</span>
                              <span className="fb-conv-time">
                                {formatRelativeTime(c.last_message_at)}
                              </span>
                            </div>

                            <div className="fb-conv-sub">
                              <span className="fb-conv-preview">
                                {c.last_sender_id === currentUser.id && 'Siz: '}
                                {c.last_audio_url && !c.last_message
                                  ? '🎙️ Ovozli xabar'
                                  : c.last_message || 'Xabar yo‘q'}
                              </span>
                              {hasUnread && (
                                <span className="fb-unread-counter">
                                  {c.unread_count}
                                </span>
                              )}
                            </div>

                            <div className="fb-conv-pos-tag">
                              {c.position || (c.role === 'admin' ? 'Rahbar' : 'Xodim')}
                              {c.district ? ` • ${c.district}` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Compose New Message Modal */}
      {isComposeOpen && (
        <ComposeMessageModal
          onClose={closeCompose}
          initialUser={composeInitialUser}
          initialTask={composeInitialTask}
        />
      )}

      {/* 4. Task Detail Modal (Opened when clicking task reply chip or banner) */}
      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          isEmployee={currentUser.role === 'employee'}
          onClose={() => setViewingTask(null)}
          onTaskUpdated={() => {
            if (activePartner?.id) loadConversation(activePartner.id, false);
          }}
        />
      )}

      {/* 5. Message Edit History Modal */}
      {historyMessageId && (
        <EditHistoryModal
          messageId={historyMessageId}
          onClose={() => setHistoryMessageId(null)}
        />
      )}
    </>
  );
}
