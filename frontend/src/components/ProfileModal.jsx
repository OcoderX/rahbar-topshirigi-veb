import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/endpoints';
import { useToast } from './Toast';

export default function ProfileModal({ onClose, onProfileUpdated }) {
  const { user, updateUser } = useAuth();
  const { push } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [position, setPosition] = useState(user?.position || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarData, setAvatarData] = useState(null); // base64 string or '' if removed
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type) || !/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      setError('Iltimos, faqat rasm faylini tanlang (JPEG, PNG, WebP). SVG format qabul qilinmaydi.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Rasm hajmi 5MB dan oshmasligi kerak.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setAvatarPreview(result);
      setAvatarData(result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Ism bo‘sh bo‘lishi mumkin emas.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        position: position.trim(),
      };
      if (avatarData !== null) {
        payload.avatar = avatarData;
      }

      const res = await userApi.updateProfile(payload);
      const updatedUser = res?.data || res;

      // Update in auth context & local storage
      updateUser(updatedUser);
      push('Profil va rasm muvaffaqiyatli saqlandi!');

      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Profilni saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal profile-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Mening profilim</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          {/* Photo upload section */}
          <div className="profile-photo-section">
            <div className="profile-avatar-preview-wrap">
              {avatarPreview ? (
                <img
                  key={avatarPreview}
                  src={avatarPreview}
                  alt={name}
                  className="profile-avatar-preview-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`profile-avatar-preview-fallback ${avatarPreview ? 'hidden' : ''}`}>
                {initial}
              </span>
            </div>

            <div className="profile-photo-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-accent"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Yangi rasm yuklash</span>
              </button>
              {avatarPreview && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setAvatarPreview('');
                    setAvatarData('');
                  }}
                  disabled={saving}
                >
                  Rasmni olib tashlash
                </button>
              )}
              <span className="profile-photo-hint">
                Tavsiya etiladi: Kvadrat formatdagi aniq portret rasm (JPG, PNG).
              </span>
            </div>
          </div>

          <div className="field" style={{ marginTop: '1.25rem' }}>
            <label htmlFor="profile-name-input">F.I.SH. (Ism va familiya)</label>
            <input
              id="profile-name-input"
              name="name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Bekzod Rustamov"
            />
          </div>

          <div className="field">
            <label htmlFor="profile-position-input">Lavozim</label>
            <input
              id="profile-position-input"
              name="position"
              type="text"
              className="input"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Masalan: Rahbar o‘rinbosari / Kurator / Bo‘lim boshlig‘i / Yetakchi mutaxassis"
            />
          </div>

          <div className="field">
            <label htmlFor="profile-email-input">Elektron pochta (Email)</label>
            <input
              id="profile-email-input"
              name="email"
              type="email"
              className="input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.7, background: 'var(--paper)' }}
            />
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose} disabled={saving}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saqlanmoqda…' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
