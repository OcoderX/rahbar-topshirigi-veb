import { useMemo } from 'react';

/**
 * Format Date object to 'YYYY-MM-DDTHH:mm' for datetime-local input
 */
function toLocalISOString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export default function DueDatePicker({ value, onChange }) {
  // Current datetime as minimum allowed
  const minDateTime = useMemo(() => {
    return toLocalISOString(new Date());
  }, []);

  function applyPreset(daysToAdd, defaultHour = 18) {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    d.setHours(defaultHour, 0, 0, 0);

    // If today and 18:00 has already passed, set +2 hours from now
    if (daysToAdd === 0 && d < new Date()) {
      const now = new Date();
      now.setHours(now.getHours() + 2);
      onChange(toLocalISOString(now));
      return;
    }

    onChange(toLocalISOString(d));
  }

  // Format value to 'YYYY-MM-DDTHH:mm'
  const inputValue = useMemo(() => {
    if (!value) return '';
    if (value.includes('T')) return value.slice(0, 16);
    // If only date 'YYYY-MM-DD'
    return `${value.slice(0, 10)}T18:00`;
  }, [value]);

  return (
    <div className="due-date-picker-wrap">
      <div className="due-date-presets">
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset(0)}
        >
          Bugun
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset(1)}
        >
          Ertaga
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset(7)}
        >
          1 hafta
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset(15)}
        >
          15 kun
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyPreset(30)}
        >
          1 oy
        </button>
      </div>

      <div className="due-date-input-row">
        <input
          id="due-date-time-input"
          name="dueDate"
          type="datetime-local"
          className="input due-date-datetime-input"
          aria-label="Bajarish muddati va vaqti"
          min={minDateTime}
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="btn-clear-date"
            onClick={() => onChange('')}
            title="Muddatni olib tashlash"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
