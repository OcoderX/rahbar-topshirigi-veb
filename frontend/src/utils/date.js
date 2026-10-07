/**
 * Date and time formatting helpers for Rahbar Topshirig'i web app.
 */

export function formatDateTime(val) {
  if (!val) return '—';
  if (typeof val === 'string') {
    const s = val.trim();
    // ISO string with timezone indicator (e.g. 2026-10-06T11:26:48.000Z)
    if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    // MySQL DATETIME/TIMESTAMP string (e.g. 2026-10-06 16:26:48 or 2026-10-06T16:26:48)
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
      return s.replace('T', ' ').slice(0, 16);
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val).slice(0, 16);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateOnly(val) {
  if (!val) return '—';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.slice(0, 10);
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val).slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
