import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function CommandPalette({
  isOpen,
  onClose,
  tasks = [],
  accounts = [],
  onSelectTask,
  onSelectUser,
  onCreateTask,
  onExportExcel,
  onToggleKanban,
  viewMode = 'table',
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = [];

    // System Actions
    const actions = [];
    if (onCreateTask) {
      actions.push({
        id: 'action-create',
        type: 'action',
        category: '⚡ Tezkor harakatlar',
        title: '+ Yangi vazifa yaratish',
        subtitle: 'Xodimlarga yangi topshiriq biriktirish',
        run: () => {
          onClose();
          onCreateTask();
        },
      });
    }
    if (onExportExcel) {
      actions.push({
        id: 'action-export',
        type: 'action',
        category: '⚡ Tezkor harakatlar',
        title: '📊 Excel hisobotini yuklab olish (.xlsx)',
        subtitle: 'Barcha topshiriqlar bo‘yicha to‘liq hisobot',
        run: () => {
          onClose();
          onExportExcel();
        },
      });
    }
    if (onToggleKanban) {
      actions.push({
        id: 'action-view-toggle',
        type: 'action',
        category: '⚡ Tezkor harakatlar',
        title: viewMode === 'kanban' ? '📋 Jadval ko‘rinishiga o‘tish' : '📌 Doska ko‘rinishiga o‘tish',
        subtitle: 'Topshiriqlarni ko‘rish shaklini o‘zgartirish',
        run: () => {
          onClose();
          onToggleKanban();
        },
      });
    }
    actions.push({
      id: 'action-theme',
      type: 'action',
      category: '⚡ Tezkor harakatlar',
      title: isDark ? '☀️ Kunduzgi mavzuga o‘tish (Light mode)' : '🌙 Tungi mavzuga o‘tish (Dark mode)',
      subtitle: 'Tizim tashqi ko‘rinishini almashtirish',
      run: () => {
        toggleTheme();
        onClose();
      },
    });

    const matchingActions = actions.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );
    result.push(...matchingActions);

    // Matching Tasks
    if (tasks.length > 0) {
      const taskMatches = tasks
        .filter((t) => {
          if (!q) return true;
          const matchTitle = (t.title || '').toLowerCase().includes(q);
          const matchAssignee = (t.assignee_name || '').toLowerCase().includes(q);
          const matchStatus = (t.status || '').toLowerCase().includes(q);
          return matchTitle || matchAssignee || matchStatus;
        })
        .slice(0, 5)
        .map((t) => ({
          id: `task-${t.id}`,
          type: 'task',
          category: '📋 Topshiriqlar',
          title: t.title,
          subtitle: `${t.assignee_name || 'Mas’ul biriktirilmagan'} • ${
            t.status === 'completed'
              ? 'Bajarildi'
              : t.status === 'submitted'
              ? 'Jarayonda'
              : t.status === 'in_progress'
              ? 'Ko‘rildi'
              : 'Kutilmoqda'
          }`,
          run: () => {
            onClose();
            if (onSelectTask) onSelectTask(t);
          },
        }));
      result.push(...taskMatches);
    }

    // Matching Accounts
    if (accounts.length > 0) {
      const userMatches = accounts
        .filter((u) => {
          if (!q) return false;
          const matchName = (u.name || '').toLowerCase().includes(q);
          const matchPosition = (u.position || '').toLowerCase().includes(q);
          const matchDistrict = (u.district || '').toLowerCase().includes(q);
          return matchName || matchPosition || matchDistrict;
        })
        .slice(0, 4)
        .map((u) => ({
          id: `user-${u.id}`,
          type: 'user',
          category: '👥 Xodimlar',
          title: u.name,
          subtitle: `${u.position || 'Xodim'} • ${u.district || u.region || ''}`,
          run: () => {
            onClose();
            if (onSelectUser) onSelectUser(u);
          },
        }));
      result.push(...userMatches);
    }

    return result;
  }, [query, tasks, accounts, isDark, viewMode]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (items.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % (items.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <svg className="cmd-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Topshiriq, xodim yoki harakat qidiring… (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="cmd-kbd-esc" onClick={onClose} title="Yopish">ESC</span>
        </div>

        <div className="cmd-list">
          {items.length === 0 ? (
            <div className="cmd-empty">Mos keladigan ma’lumot topilmadi</div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                className={`cmd-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => item.run()}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="cmd-item-main">
                  <span className="cmd-item-title">{item.title}</span>
                  {item.subtitle && <span className="cmd-item-sub">{item.subtitle}</span>}
                </div>
                <span className="cmd-item-badge">{item.category}</span>
              </div>
            ))
          )}
        </div>

        <div className="cmd-footer">
          <span><kbd className="cmd-kbd">↑</kbd> <kbd className="cmd-kbd">↓</kbd> harakatlanish</span>
          <span><kbd className="cmd-kbd">↵</kbd> tanlash</span>
          <span><kbd className="cmd-kbd">esc</kbd> chiqish</span>
        </div>
      </div>
    </div>
  );
}
