import { useState, useEffect, useRef } from 'react';
import VoiceRecorder from './VoiceRecorder';
import AttachmentPicker from './AttachmentPicker';
import StatusBadge from './StatusBadge';
import { taskApi } from '../api/endpoints';
import { formatDateTime } from '../utils/date';
import { useToast } from './Toast';
import { useMessenger } from '../context/MessageContext';
import { downloadAttachment } from '../utils/fileDownloader';
import { triggerConfetti } from '../utils/confetti';
import { openTaskReportPrintWindow, downloadTaskReportHtmlFile } from '../utils/reportExporter';

function formatDate(isoStr) {
  return formatDateTime(isoStr);
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(name = '', type = '') {
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return '📊';
  if (lower.endsWith('.pdf')) return '📕';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return '📝';
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  return '📎';
}

export default function TaskDetailModal({ task: initialTask, isEmployee = false, onClose, onTaskUpdated }) {
  const { push } = useToast();
  const { openChatWithUser } = useMessenger();
  const [task, setTask] = useState(initialTask);
  const [reportNote, setReportNote] = useState(initialTask?.completion_note || '');
  const [reportAudio, setReportAudio] = useState(initialTask?.completion_audio || '');
  const [reportAttachments, setReportAttachments] = useState(initialTask?.completion_attachments || []);
  const [submitting, setSubmitting] = useState(false);
  const [showReworkForm, setShowReworkForm] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [reworkSubmitting, setReworkSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null); // url of currently playing audio
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const audioRefs = useRef({});

  async function handleDownload(att) {
    if (!att) return;
    setDownloadingFile(att.name);
    try {
      const res = await downloadAttachment(att);
      if (res?.success) {
        push(`Fayl saqlandi: ${res.filename}`);
      }
    } catch (err) {
      push(err.message || 'Faylni yuklab olishda xatolik yuz berdi', 'error');
    } finally {
      setDownloadingFile(null);
    }
  }

  // Keep task state in sync with initialTask and fetch fresh details
  useEffect(() => {
    setTask(initialTask);
    if (initialTask?.id) {
      taskApi.get(initialTask.id)
        .then((fresh) => {
          if (fresh) setTask(fresh);
        })
        .catch(() => {});
    }
  }, [initialTask]);

  // When an employee opens a pending task, automatically mark it as viewed / in_progress
  useEffect(() => {
    if (isEmployee && initialTask && initialTask.status === 'pending') {
      taskApi.markViewed(initialTask.id)
        .then((updated) => {
          setTask(updated);
          if (onTaskUpdated) onTaskUpdated(updated);
        })
        .catch(() => {});
    }
  }, [isEmployee, initialTask]);

  function toggleAudio(url) {
    if (!audioRefs.current[url]) return;
    const el = audioRefs.current[url];
    if (playingAudio === url) {
      el.pause();
      setPlayingAudio(null);
    } else {
      Object.values(audioRefs.current).forEach((a) => a && a.pause());
      el.play();
      setPlayingAudio(url);
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    try {
      // 1. Upload completion audio if base64
      let finalAudio = reportAudio;
      if (reportAudio && reportAudio.startsWith('data:')) {
        const up = await taskApi.upload({
          file: reportAudio,
          name: `hisobot_ovoz_${Date.now()}.webm`,
          type: 'audio/webm',
        });
        finalAudio = up.url;
      }

      // 2. Upload completion attachments if base64
      const finalAttachments = [];
      if (reportAttachments && reportAttachments.length > 0) {
        for (const att of reportAttachments) {
          if (att.file && att.file.startsWith('data:')) {
            const up = await taskApi.upload({
              file: att.file,
              name: att.name,
              type: att.type,
              size: att.size,
            });
            finalAttachments.push(up);
          } else {
            finalAttachments.push(att);
          }
        }
      }

      const res = await taskApi.complete(task.id, {
        note: reportNote.trim() || null,
        audio_url: finalAudio || null,
        attachments: finalAttachments,
      });

      setTask(res);
      triggerConfetti({ count: 60 });
      if (onTaskUpdated) onTaskUpdated(res);
      onClose();
    } catch (err) {
      alert("Xatolik: " + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendToRework() {
    const reason = reworkReason.trim();
    if (!reason) {
      alert('Qayta ishlash sababini kiriting.');
      return;
    }

    setReworkSubmitting(true);
    try {
      const updated = await taskApi.sendToRework(task.id, reason);
      setTask(updated);
      setShowReworkForm(false);
      setReworkReason('');
      if (onTaskUpdated) onTaskUpdated(updated);
    } catch (err) {
      alert(`Xatolik: ${err.message || ''}`);
    } finally {
      setReworkSubmitting(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const updated = await taskApi.approve(task.id);
      setTask(updated);
      triggerConfetti({ count: 100 });
      if (onTaskUpdated) onTaskUpdated(updated);
    } catch (err) {
      alert(`Xatolik: ${err.message || ''}`);
    } finally {
      setApproving(false);
    }
  }

  const isCompleted = task.status === 'completed';
  const isSubmitted = task.status === 'submitted';
  const hasCompletionReport = isCompleted || isSubmitted || Boolean(
    task.completion_note ||
    task.completion_audio ||
    (task.completion_attachments && task.completion_attachments.length > 0)
  );

  // Group initial attachments
  const initialAtts = Array.isArray(task.attachments) ? task.attachments : [];
  const initialImages = initialAtts.filter((a) => (a.type || '').startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(a.name || ''));
  const initialVideos = initialAtts.filter((a) => (a.type || '').startsWith('video/') || /\.(mp4|webm)$/i.test(a.name || ''));
  const initialDocs = initialAtts.filter((a) => !initialImages.includes(a) && !initialVideos.includes(a));

  // Group completion attachments (Ijro dalillari)
  const completionAtts = Array.isArray(task.completion_attachments) ? task.completion_attachments : [];
  const completionImages = completionAtts.filter((a) => (a.type || '').startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(a.name || ''));
  const completionVideos = completionAtts.filter((a) => (a.type || '').startsWith('video/') || /\.(mp4|webm)$/i.test(a.name || ''));
  const completionDocs = completionAtts.filter((a) => !completionImages.includes(a) && !completionVideos.includes(a));

  return (
    <div className="overlay task-detail-overlay" onMouseDown={onClose}>
      <div className="modal task-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="detail-status-row">
              <StatusBadge status={task.status} isEmployee={isEmployee} />
              {task.rework_required && (
                <span className="badge rework">
                  <span className="pip" />
                  Qayta ishlovda
                </span>
              )}
              <span className="detail-meta-date">
                Topshiriq berilgan: <strong>{formatDate(task.created_at)}</strong>
              </span>
            </div>
            <h2 className="detail-title">{task.title}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <button
              type="button"
              className="btn btn-outline-accent btn-sm"
              onClick={() => openTaskReportPrintWindow(task)}
              title="Topshiriq va barcha media ijro dalillarini PDF / chop etish formatida yuklab olish"
            >
              📄 Hisobotni yuklab olish (PDF)
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body detail-modal-body">
          {/* Timeline and Personnel */}
          <div className="detail-timeline-card">
            <div className="timeline-item">
              <span className="t-label">Mas’ul ijrochi:</span>
              <span className="t-val">
                <strong>{task.assignee_name || 'Biriktirilmagan'}</strong>
                {task.assignee_position && ` (${task.assignee_position})`}
              </span>
            </div>
            {task.created_at && (
              <div className="timeline-item">
                <span className="t-label">Topshiriq berilgan:</span>
                <span className="t-val">
                  <strong>{formatDate(task.created_at)}</strong>
                </span>
              </div>
            )}
            <div className="timeline-item">
              <span className="t-label">Bajarish muddati:</span>
              <span className="t-val deadline-val">
                {task.due_date ? formatDate(task.due_date) : 'Muddatsiz'}
              </span>
            </div>
            {task.viewed_at && (
              <div className="timeline-item">
                <span className="t-label">Xodim ko‘rgan vaqt:</span>
                <span className="t-val">{formatDate(task.viewed_at)}</span>
              </div>
            )}
            {task.submitted_at && (
              <div className="timeline-item">
                <span className="t-label">Rahbar tasdig‘iga yuborilgan:</span>
                <span className="t-val">{formatDate(task.submitted_at)}</span>
              </div>
            )}
            {task.completed_at && (
              <>
                <div className="timeline-item">
                  <span className="t-label">Tasdiqlagan rahbar:</span>
                  <span className="t-val completed-approver-val">
                    <strong>{task.approved_by_name || 'Rahbar'}</strong>
                    {task.approved_by_position && ` (${task.approved_by_position})`}
                  </span>
                </div>
                <div className="timeline-item">
                  <span className="t-label">Rahbar tasdiqlagan vaqt:</span>
                  <span className="t-val completed-time-val">{formatDate(task.completed_at)}</span>
                </div>
              </>
            )}
          </div>

          {Number(task.rework_count) > 0 && (
            <div className={`rework-notice ${task.rework_required ? 'is-active' : 'is-resolved'}`}>
              <div className="rework-notice-title">
                {task.rework_required
                  ? 'Rad etildi — qayta ishlash talab qilindi'
                  : isSubmitted
                    ? 'Qayta ishlanib, yana rahbar tasdig‘iga yuborildi'
                    : 'Topshiriq avval qayta ishlashga qaytarilgan'}
              </div>
              <p>{task.rework_reason}</p>
              <div className="rework-notice-meta">
                {task.rework_requested_by_name && <span>Rahbar: {task.rework_requested_by_name}</span>}
                {task.rework_requested_at && <span>Vaqt: {formatDate(task.rework_requested_at)}</span>}
                <span>Qaytarilgan: {task.rework_count} marta</span>
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="detail-section">
              <div className="detail-section-title">📋 Topshiriq mazmuni</div>
              <p className="detail-description-text">{task.description}</p>
            </div>
          )}

          {/* Leader's Voice Memo */}
          {task.audio_url && (
            <div className="detail-section">
              <div className="detail-section-title">🎙️ Rahbarning ovozli ko‘rsatmasi</div>
              <div className="detail-audio-player">
                <audio
                  ref={(el) => (audioRefs.current[task.audio_url] = el)}
                  src={task.audio_url}
                  onEnded={() => setPlayingAudio(null)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary audio-play-btn"
                  onClick={() => toggleAudio(task.audio_url)}
                >
                  {playingAudio === task.audio_url ? '⏸ To‘xtatish' : '▶ Ovozni tinglash'}
                </button>
                <span className="audio-player-hint">Topshiriq audio ko‘rsatmasi</span>
              </div>
            </div>
          )}

          {/* Leader's Initial Attachments Gallery */}
          {initialAtts.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">📎 Topshiriq materiallari ({initialAtts.length})</div>

              {/* Photos & Videos in uniform gallery */}
              {(initialImages.length > 0 || initialVideos.length > 0) && (
                <div className="detail-media-gallery">
                  {initialImages.map((att, i) => (
                    <div key={`img-${i}`} className="media-gallery-card">
                      <div className="media-gallery-thumb" onClick={() => setLightboxSrc(att.url)}>
                        <span className="media-gallery-badge">📷 Rasm</span>
                        <img src={att.url} alt={att.name} />
                        <button type="button" className="media-gallery-zoom-btn" title="Kattalashtirish">🔍</button>
                      </div>
                      <div className="media-gallery-info">
                        <span className="media-gallery-name" title={att.name}>{att.name}</span>
                        <div className="media-gallery-footer">
                          <span className="media-gallery-size">{formatFileSize(att.size)}</span>
                          <button
                            type="button"
                            className="media-gallery-dl-btn"
                            onClick={() => handleDownload(att)}
                            disabled={downloadingFile === att.name}
                          >
                            Yuklab olish ⬇
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {initialVideos.map((att, i) => (
                    <div key={`vid-${i}`} className="media-gallery-card">
                      <div className="media-gallery-thumb">
                        <span className="media-gallery-badge">🎥 Video</span>
                        <video src={att.url} controls />
                      </div>
                      <div className="media-gallery-info">
                        <span className="media-gallery-name" title={att.name}>{att.name}</span>
                        <div className="media-gallery-footer">
                          <span className="media-gallery-size">{formatFileSize(att.size)}</span>
                          <button
                            type="button"
                            className="media-gallery-dl-btn"
                            onClick={() => handleDownload(att)}
                            disabled={downloadingFile === att.name}
                          >
                            Yuklab olish ⬇
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Documents */}
              {initialDocs.length > 0 && (
                <div className="detail-attachments-grid" style={{ marginTop: '.75rem' }}>
                  {initialDocs.map((att, i) => (
                    <div key={`doc-${i}`} className="detail-attachment-card">
                      <div className="file-icon-box">{getFileIcon(att.name, att.type)}</div>
                      <div className="detail-file-info">
                        <span className="detail-file-name" title={att.name}>{att.name}</span>
                        <button
                          type="button"
                          className="btn-file-download"
                          onClick={() => handleDownload(att)}
                          disabled={downloadingFile === att.name}
                        >
                          {downloadingFile === att.name ? 'Saqlanmoqda…' : 'Yuklab olish ⬇'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Execution Report Section (Ijro hisoboti va dalillar) */}
          {hasCompletionReport && (
            <div className="detail-section completed-report-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
                <div className="detail-section-title green-title" style={{ margin: 0 }}>
                  {isCompleted
                    ? '✓ Xodimning ijro hisoboti (Topshiriq bajarilgan)'
                    : task.rework_required
                      ? '⚠️ Qaytarilgan oldingi hisobot'
                      : '📝 Topshirilgan ijro hisoboti'}
                </div>
                <button
                  type="button"
                  className="btn btn-outline-accent btn-sm"
                  onClick={() => openTaskReportPrintWindow(task)}
                  title="Ijro dalolatnomasini rasmiy formatda chop etish yoki PDF saqlash"
                >
                  🖨️ Dalolatnoma (PDF)
                </button>
              </div>

              {isCompleted && (
                <div className="task-approval-badge-card">
                  <div className="approval-badge-icon">✓</div>
                  <div className="approval-badge-body">
                    <div className="approval-badge-headline">
                      Topshiriq rahbar tomonidan to‘liq tasdiqlangan va qabul qilingan
                    </div>
                    <div className="approval-badge-details">
                      <span className="approval-meta-pill approver">
                        <strong>Tasdiqladi:</strong> {task.approved_by_name || 'Rahbar'}
                        {task.approved_by_position && ` (${task.approved_by_position})`}
                      </span>
                      {task.completed_at && (
                        <span className="approval-meta-pill time">
                          <strong>Tasdiqlangan vaqt:</strong> {formatDate(task.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {task.completion_note && (
                <div style={{ margin: '.75rem 0' }}>
                  <span className="sub-label">Ijro izohi (Xabar):</span>
                  <p className="completion-note-text">«{task.completion_note}»</p>
                </div>
              )}

              {task.completion_audio && (
                <div className="completion-audio-wrap">
                  <span className="completion-audio-label">🎙️ Xodimning ovozli hisoboti:</span>
                  <audio
                    ref={(el) => (audioRefs.current[task.completion_audio] = el)}
                    src={task.completion_audio}
                    onEnded={() => setPlayingAudio(null)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-accent audio-play-btn"
                    onClick={() => toggleAudio(task.completion_audio)}
                  >
                    {playingAudio === task.completion_audio ? '⏸ To‘xtatish' : '▶ Hisobotni eshitish'}
                  </button>
                </div>
              )}

              {/* Completion Media Gallery: Photos, Videos & Files in uniform layout */}
              {completionAtts.length > 0 && (
                <div className="completion-attachments-list" style={{ marginTop: '1rem' }}>
                  <span className="sub-label">
                    🖼️ Ijro dalillari — Fotosuratlar va Medialar ({completionAtts.length} ta):
                  </span>

                  {(completionImages.length > 0 || completionVideos.length > 0) && (
                    <div className="detail-media-gallery">
                      {completionImages.map((att, i) => (
                        <div key={`comp-img-${i}`} className="media-gallery-card">
                          <div className="media-gallery-thumb" onClick={() => setLightboxSrc(att.url)}>
                            <span className="media-gallery-badge">📷 Ijro surati</span>
                            <img src={att.url} alt={att.name} />
                            <button type="button" className="media-gallery-zoom-btn" title="Kattalashtirish">🔍</button>
                          </div>
                          <div className="media-gallery-info">
                            <span className="media-gallery-name" title={att.name}>{att.name}</span>
                            <div className="media-gallery-footer">
                              <span className="media-gallery-size">{formatFileSize(att.size)}</span>
                              <button
                                type="button"
                                className="media-gallery-dl-btn"
                                onClick={() => handleDownload(att)}
                                disabled={downloadingFile === att.name}
                              >
                                Yuklab olish ⬇
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {completionVideos.map((att, i) => (
                        <div key={`comp-vid-${i}`} className="media-gallery-card">
                          <div className="media-gallery-thumb">
                            <span className="media-gallery-badge">🎥 Video dalil</span>
                            <video src={att.url} controls />
                          </div>
                          <div className="media-gallery-info">
                            <span className="media-gallery-name" title={att.name}>{att.name}</span>
                            <div className="media-gallery-footer">
                              <span className="media-gallery-size">{formatFileSize(att.size)}</span>
                              <button
                                type="button"
                                className="media-gallery-dl-btn"
                                onClick={() => handleDownload(att)}
                                disabled={downloadingFile === att.name}
                              >
                                Yuklab olish ⬇
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {completionDocs.length > 0 && (
                    <div className="detail-attachments-grid" style={{ marginTop: '.75rem' }}>
                      {completionDocs.map((att, i) => (
                        <div key={`comp-doc-${i}`} className="detail-attachment-card">
                          <div className="file-icon-box">{getFileIcon(att.name, att.type)}</div>
                          <div className="detail-file-info">
                            <span className="detail-file-name" title={att.name}>{att.name}</span>
                            <button
                              type="button"
                              className="btn-file-download"
                              onClick={() => handleDownload(att)}
                              disabled={downloadingFile === att.name}
                            >
                              {downloadingFile === att.name ? 'Saqlanmoqda…' : 'Yuklab olish ⬇'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isEmployee && isSubmitted && (
                <div className="rework-actions">
                  {!showReworkForm ? (
                    <div className="review-action-buttons">
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleApprove}
                        disabled={approving}
                      >
                        {approving ? 'Tasdiqlanmoqda…' : '✓ Tasdiqlash va bajarildi qilish'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-rework"
                        onClick={() => setShowReworkForm(true)}
                        disabled={approving}
                      >
                        Qayta ishlashga yuborish
                      </button>
                    </div>
                  ) : (
                    <div className="rework-form">
                      <label htmlFor="rework-reason">Rad etish va qayta ishlash sababi</label>
                      <textarea
                        id="rework-reason"
                        name="reworkReason"
                        className="textarea"
                        rows={3}
                        value={reworkReason}
                        onChange={(event) => setReworkReason(event.target.value)}
                        placeholder="Xodim nimani tuzatishi yoki to‘ldirishi kerakligini yozing…"
                        maxLength={2000}
                      />
                      <div className="rework-form-actions">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setShowReworkForm(false);
                            setReworkReason('');
                          }}
                          disabled={reworkSubmitting}
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="button"
                          className="btn btn-rework"
                          onClick={handleSendToRework}
                          disabled={reworkSubmitting || !reworkReason.trim()}
                        >
                          {reworkSubmitting ? 'Yuborilmoqda…' : 'Rad etish va qayta ishlashga yuborish'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form for Employee to submit report */}
          {task.status === 'in_progress' && isEmployee && (
            <div className="detail-section execution-form-box">
              <div className="detail-section-title">
                {task.rework_required
                  ? '🔄 Qayta ishlangan hisobot va yangi fayllarni jo‘natish'
                  : '📝 Ijro hisobotini rahbar tasdig‘iga yuborish'}
              </div>
              <p className="sub-text">
                {task.rework_required
                  ? 'Rahbar ko‘rsatgan kamchiliklarni to‘g‘rilab, yangi/tuzatilgan fayllar, izoh yoki ovozli xabarni biriktiring va qayta yuboring.'
                  : 'Natija fayllari, fotosuratlar, videolar va izohni biriktirib, rahbar tasdig‘iga yuboring. Rahbar tasdiqlagandan keyingina topshiriq bajarilgan hisoblanadi.'}
              </p>

              <div className="field">
                <div className="field-head-with-action">
                  <label htmlFor="task-report-note">
                    {task.rework_required
                      ? 'Tuzatilgan ijro izohi (hisobot)'
                      : 'Ijro to‘g‘risida izoh (hisobot xabari)'}
                  </label>
                  <VoiceRecorder
                    audioUrl={reportAudio}
                    onAudioChange={(url) => setReportAudio(url || '')}
                  />
                </div>
                <textarea
                  id="task-report-note"
                  name="reportNote"
                  className="textarea"
                  rows={3}
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Bajarilgan ishlar haqida qisqacha ma’lumot (yoki ovoz yozing)…"
                />
              </div>

              <div className="field">
                <AttachmentPicker
                  attachments={reportAttachments}
                  onChange={setReportAttachments}
                  label={
                    task.rework_required
                      ? 'Yangi / to‘g‘rilangan natija fayllari (Fotosurat, Video, Excel, PDF)'
                      : 'Ijro dalillari va fayllar (Fotosurat, Video, Excel hisobot, PDF dalolatnoma)'
                  }
                />
              </div>

              <button
                type="button"
                className="btn btn-success btn-block complete-submit-btn"
                onClick={handleComplete}
                disabled={submitting}
              >
                {submitting
                  ? 'Yuborilmoqda…'
                  : task.rework_required
                    ? '🔄 Qayta ishlangan hisobotni jo‘natish'
                    : 'Rahbar tasdig‘iga yuborish'}
              </button>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button
            type="button"
            className="btn btn-inbox mr-auto"
            onClick={() => {
              onClose();
              if (!isEmployee && task.assigned_to) {
                openChatWithUser(
                  {
                    id: task.assigned_to,
                    name: task.assignee_name,
                    avatar: task.assignee_avatar,
                    position: task.assignee_position,
                    role: task.assignee_role,
                    district: task.assignee_district,
                  },
                  { id: task.id, title: task.title }
                );
              } else {
                openChatWithUser(
                  { id: 1, name: 'Viloyat Rahbari', role: 'admin', position: 'Rahbar' },
                  { id: task.id, title: task.title }
                );
              }
            }}
            title="Topshiriq yuzasidan xabar yoki ovozli ko‘rsatma yuborish"
          >
            💬 Xabar yozish (Inbox)
          </button>
          <button className="btn" onClick={onClose}>
            Yopish
          </button>
        </div>
      </div>

      {/* Lightbox for high-res photo viewing */}
      {lightboxSrc && (
        <div className="lightbox-backdrop" onClick={() => setLightboxSrc(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setLightboxSrc(null)}
              title="Yopish"
            >
              ✕
            </button>
            <img src={lightboxSrc} alt="Kattalashtirilgan rasm" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}
