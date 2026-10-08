import { useRef } from 'react';

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(type, name) {
  const lower = (name || '').toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return '📊';
  if (lower.endsWith('.pdf')) return '📕';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return '📝';
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  return '📎';
}

export default function AttachmentPicker({ attachments = [], onChange, label = 'Fayllar (Excel, PDF, Rasm, Video)' }) {
  const fileInputRef = useRef(null);

  async function handleFiles(files) {
    if (!files || !files.length) return;

    const allowedExts = /\.(xlsx|xls|pdf|doc|docx|png|jpg|jpeg|webp|mp4|webm|ogg|mp3|wav|txt)$/i;
    const validFiles = Array.from(files).filter((file) => {
      if (!allowedExts.test(file.name)) {
        alert(`${file.name} — ruxsat etilmagan fayl formati! Faqat jpg, png, xls, xlsx, pdf, doc, docx, ogg, mp3, mp4 formatlariga ruxsat berilgan.`);
        return false;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} hajmi 20MB dan katta!`);
        return false;
      }
      return true;
    });

    const newAttachments = await Promise.all(
      validFiles.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: file.size,
                file: reader.result,
                url: reader.result,
              });
            reader.onerror = () => reject(new Error(`${file.name} faylini o'qib bo'lmadi`));
            reader.readAsDataURL(file);
          })
      )
    );

    if (newAttachments.length > 0) {
      const currentAttachments = Array.isArray(attachments) ? attachments : [];
      onChange([...currentAttachments, ...newAttachments]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleRemove(index) {
    const currentAttachments = Array.isArray(attachments) ? attachments : [];
    onChange(currentAttachments.filter((_, i) => i !== index));
  }

  return (
    <div className="attachment-picker">
      <div className="attachment-header">
        <label className="attachment-label">{label}</label>
        <button
          type="button"
          className="btn btn-sm btn-outline-accent btn-add-file"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <span>+ Fayl biriktirish</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.webm,.ogg,.mp3,.wav"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files).catch((error) => {
              alert(error.message || 'Faylni o‘qishda xatolik yuz berdi');
            });
          }}
        />
      </div>

      {attachments && attachments.length > 0 && (
        <div className="attachment-chips-grid">
          {attachments.map((att, idx) => {
            const isImage = att.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(att.name);
            const isVideo = att.type?.startsWith('video/') || /\.(mp4|webm)$/i.test(att.name);

            return (
              <div key={idx} className="attachment-chip">
                {isImage && att.url ? (
                  <img src={att.url} alt={att.name} className="attachment-thumb" />
                ) : (
                  <span className="attachment-icon">{getFileIcon(att.type, att.name)}</span>
                )}
                <div className="attachment-meta">
                  <span className="attachment-name" title={att.name}>{att.name}</span>
                  <span className="attachment-size">{formatFileSize(att.size)}</span>
                </div>
                <button
                  type="button"
                  className="attachment-delete-btn"
                  onClick={() => handleRemove(idx)}
                  title="O‘chirish"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
