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

export function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const s = val.trim();
    if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const [, yr, mo, da, hr = '00', min = '00', sec = '00'] = m;
      const d = new Date(Number(yr), Number(mo) - 1, Number(da), Number(hr), Number(min), Number(sec));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Calculates remaining time until deadline in days and hours (in Uzbek).
 * Returns { label, icon, isOverdue, isCompleted } or null.
 */
export function getRemainingTime(dueDateVal, status = '') {
  if (!dueDateVal) return null;
  if (status === 'completed') {
    return {
      label: 'Bajarilgan',
      icon: '✅',
      isOverdue: false,
      isCompleted: true,
    };
  }

  const due = parseDateSafe(dueDateVal);
  if (!due) return null;

  const now = new Date();
  const diffMs = due.getTime() - now.getTime();

  if (diffMs <= 0) {
    const overdueMs = Math.abs(diffMs);
    const totalHours = Math.floor(overdueMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    let text = '';
    if (days > 0 && hours > 0) {
      text = `Muddat o‘tgan (${days} kun ${hours} soat)`;
    } else if (days > 0) {
      text = `Muddat o‘tgan (${days} kun)`;
    } else if (hours > 0) {
      text = `Muddat o‘tgan (${hours} soat)`;
    } else {
      text = 'Muddat o‘tgan';
    }

    return {
      label: text,
      icon: '⚠️',
      isOverdue: true,
      isCompleted: false,
    };
  }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let text = '';
  if (days > 0) {
    if (hours > 0) {
      text = `${days} kun ${hours} soat qoldi`;
    } else {
      text = `${days} kun qoldi`;
    }
  } else if (hours > 0) {
    if (minutes > 0) {
      text = `${hours} soat ${minutes} daqiqa qoldi`;
    } else {
      text = `${hours} soat qoldi`;
    }
  } else {
    text = `${Math.max(1, minutes)} daqiqa qoldi`;
  }

  return {
    label: text,
    icon: '⏳',
    isOverdue: false,
    isCompleted: false,
  };
}
