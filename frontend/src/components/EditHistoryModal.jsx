import { useEffect, useState } from 'react';
import { messageApi } from '../api/endpoints';
import { formatDateTime } from '../utils/date';

export default function EditHistoryModal({ messageId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!messageId) return;
    async function loadHistory() {
      setLoading(true);
      setError('');
      try {
        const res = await messageApi.history(messageId);
        setData(res);
      } catch (err) {
        setError(err.message || 'Tahrir tarixini yuklab bo‘lmadi');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [messageId]);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card edit-history-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: '92%' }}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">🕒</span>
            <div>
              <h3>Xabar tahrirlash tarixi</h3>
              <p className="modal-subtitle">Xabar qanday o‘zgartirilganligi xronologiyasi</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} title="Yopish">✕</button>
        </div>

        <div className="modal-body-scroll" style={{ padding: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
          {loading ? (
            <div className="loading-box" style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-faint)' }}>
              Tahrir tarixi yuklanmoqda…
            </div>
          ) : error ? (
            <div className="error-banner">{error}</div>
          ) : !data || !data.history || data.history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-faint)' }}>
              Tahrir yozuvlari topilmadi.
            </div>
          ) : (
            <div className="edit-history-timeline">
              {/* 1. Original version (old_message of the first edit) */}
              <div className="edit-history-item original">
                <div className="edit-history-header">
                  <span className="edit-version-pill original">1. Dastlabki matn</span>
                </div>
                <div className="edit-history-bubble">
                  {data.history[0]?.old_message || '(Bo‘sh)'}
                </div>
              </div>

              {/* 2. Each subsequent edit */}
              {data.history.map((h, idx) => (
                <div key={h.id || idx} className="edit-history-item edited">
                  <div className="edit-history-header">
                    <span className="edit-version-pill edited">
                      {idx + 2}. Tahrir {idx === data.history.length - 1 ? '(Joriy matn)' : ''}
                    </span>
                    <span className="edit-time-stamp">
                      🕒 {formatDateTime(h.created_at)}
                    </span>
                  </div>
                  <div className="edit-history-bubble">
                    {h.new_message}
                  </div>
                  <div className="edit-author-sub">
                    Tahrirlovchi: <strong>{h.editor_name || 'Foydalanuvchi'}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-foot" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
