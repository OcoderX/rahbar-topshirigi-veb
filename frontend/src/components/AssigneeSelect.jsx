import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

/**
 * Helper to determine category and badge class
 */
export function getHierarchyCategory(user) {
  if (user.hierarchy_rank === 0) {
    return { rank: 0, group: 'Rahbar', badgeClass: 'badge-leader', badgeLabel: 'Rahbar' };
  }
  if (user.hierarchy_rank === 1) {
    return { rank: 1, group: "Rahbar o'rinbosarlari", badgeClass: 'badge-deputy', badgeLabel: "O'rinbosar" };
  }
  if (user.hierarchy_rank === 2) {
    return { rank: 2, group: 'Kuratorlar', badgeClass: 'badge-curator', badgeLabel: 'Kurator' };
  }
  if (user.hierarchy_rank === 3) {
    return { rank: 3, group: "Bo'lim boshliqlari", badgeClass: 'badge-head', badgeLabel: "Bo'lim boshlig'i" };
  }
  const pos = (user.position || '').toLowerCase();
  if (pos.includes("o'rinbosar") || pos.includes('urinbosar')) {
    return { rank: 1, group: "Rahbar o'rinbosarlari", badgeClass: 'badge-deputy', badgeLabel: "O'rinbosar" };
  }
  if (pos.includes('kurator')) {
    return { rank: 2, group: 'Kuratorlar', badgeClass: 'badge-curator', badgeLabel: 'Kurator' };
  }
  if (pos.includes('boshliq') || pos.includes('mudir')) {
    return { rank: 3, group: "Bo'lim boshliqlari", badgeClass: 'badge-head', badgeLabel: "Bo'lim boshlig'i" };
  }
  return { rank: 4, group: 'Xodimlar', badgeClass: 'badge-employee', badgeLabel: 'Xodim' };
}

/**
 * AssigneeSelect - hierarchical assignee picker with avatar, position, and category grouping.
 * Supports both single-select and multi-select modes.
 *
 * Props:
 *   employees        - list of user objects
 *   value            - single ID (single mode) or array of IDs (multi mode)
 *   onChange(value)   - callback: receives single ID or array of IDs
 *   multiple         - if true, enables multi-select with checkboxes & "select all"
 *   placeholder      - placeholder text
 */
export default function AssigneeSelect({
  employees = [],
  value,
  onChange,
  multiple = false,
  placeholder = "Mas'ulni tanlang",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize value to a Set for multi mode
  const selectedIds = useMemo(() => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : value ? [value] : [];
      return new Set(arr.map(String));
    }
    return new Set(value ? [String(value)] : []);
  }, [value, multiple]);

  // Exclude main admin/rahbar
  const eligibleEmployees = useMemo(() => {
    return employees.filter(
      (e) => e.role !== 'admin' && e.hierarchy_rank !== 0 && !e.name.toLowerCase().includes('administrator')
    );
  }, [employees]);

  // Group by territory; keep hierarchy order inside every territory.
  const territoryGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = eligibleEmployees.filter((e) => {
      if (!q) return true;
      const nameMatch = (e.name || '').toLowerCase().includes(q);
      const posMatch = (e.position || '').toLowerCase().includes(q);
      const emailMatch = (e.email || '').toLowerCase().includes(q);
      const regionMatch = (e.region || '').toLowerCase().includes(q);
      const districtMatch = (e.district || '').toLowerCase().includes(q);
      return nameMatch || posMatch || emailMatch || regionMatch || districtMatch;
    });

    const groups = new Map();
    filtered.forEach((employee) => {
      const isDistrict = employee.territory_type === 'district' || Boolean(employee.district);
      const title = isDistrict ? employee.district : employee.region || 'Andijon viloyati';
      const key = isDistrict ? `district:${title}` : `region:${title}`;
      if (!groups.has(key)) {
        groups.set(key, { key, title, type: isDistrict ? 'district' : 'region', items: [] });
      }
      groups.get(key).items.push({ ...employee, cat: getHierarchyCategory(employee) });
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        items: group.items.sort(
          (a, b) =>
            (a.hierarchy_rank ?? 4) - (b.hierarchy_rank ?? 4) ||
            (a.name || '').localeCompare(b.name || '', 'uz')
        ),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'region' ? -1 : 1;
        return a.title.localeCompare(b.title, 'uz');
      });
  }, [eligibleEmployees, search]);

  // Flat list of currently filtered/visible employees (for select-all)
  const visibleEmployees = useMemo(() => {
    return territoryGroups.flatMap((group) => group.items);
  }, [territoryGroups]);

  // Currently selected employee(s) for display
  const selectedEmployees = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return eligibleEmployees.filter((e) => selectedIds.has(String(e.id)));
  }, [eligibleEmployees, selectedIds]);

  // Are all visible employees selected?
  const allVisibleSelected = useMemo(() => {
    return visibleEmployees.length > 0 && visibleEmployees.every((e) => selectedIds.has(String(e.id)));
  }, [visibleEmployees, selectedIds]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // --- Single Select Handlers ---
  const handleSelectSingle = useCallback(
    (emp) => {
      onChange(emp.id);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleClearSingle = useCallback(
    (e) => {
      e.stopPropagation();
      onChange('');
    },
    [onChange]
  );

  // --- Multi Select Handlers ---
  const handleToggle = useCallback(
    (emp) => {
      const idStr = String(emp.id);
      const currentArr = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
      if (currentArr.includes(idStr)) {
        onChange(currentArr.filter((x) => x !== idStr).map(Number));
      } else {
        onChange([...currentArr, idStr].map(Number));
      }
    },
    [value, onChange]
  );

  const handleSelectAll = useCallback(() => {
    const currentArr = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    const currentSet = new Set(currentArr);
    visibleEmployees.forEach((e) => currentSet.add(String(e.id)));
    onChange([...currentSet].map(Number));
  }, [value, onChange, visibleEmployees]);

  const handleDeselectAll = useCallback(() => {
    const visibleIds = new Set(visibleEmployees.map((e) => String(e.id)));
    const currentArr = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
    onChange(currentArr.filter((x) => !visibleIds.has(x)).map(Number));
  }, [value, onChange, visibleEmployees]);

  const handleClearAll = useCallback(
    (e) => {
      e.stopPropagation();
      onChange([]);
    },
    [onChange]
  );

  // Toggle a group's selection
  const handleToggleGroup = useCallback(
    (group) => {
      const groupIds = group.items.map((e) => String(e.id));
      const currentArr = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
      const currentSet = new Set(currentArr);
      const allInGroup = groupIds.every((id) => currentSet.has(id));

      if (allInGroup) {
        // Deselect all in this group
        const groupIdSet = new Set(groupIds);
        onChange(currentArr.filter((x) => !groupIdSet.has(x)).map(Number));
      } else {
        // Select all in this group
        groupIds.forEach((id) => currentSet.add(id));
        onChange([...currentSet].map(Number));
      }
    },
    [value, onChange]
  );

  // ============ RENDER ============

  // --- Single mode trigger display ---
  const renderSingleTrigger = () => {
    const selected = selectedEmployees[0] || null;
    if (!selected) {
      return (
        <div className="assignee-placeholder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>{placeholder}</span>
        </div>
      );
    }
    const cat = getHierarchyCategory(selected);
    const initial = selected.name ? selected.name.charAt(0).toUpperCase() : '?';
    return (
      <div className="assignee-selected-item">
        <div className="assignee-avatar-box">
          {selected.avatar ? (
            <img
              src={selected.avatar}
              alt={selected.name}
              className="assignee-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <span className={`assignee-avatar-fallback ${selected.avatar ? 'hidden' : ''}`}>{initial}</span>
        </div>
        <div className="assignee-info">
          <span className="assignee-name">{selected.name}</span>
          <span className={`assignee-badge ${cat.badgeClass}`}>{selected.position || cat.group}</span>
          <span className="assignee-territory-inline">{selected.district || selected.region}</span>
        </div>
        <button type="button" className="btn-clear-assignee" onClick={handleClearSingle} title="Tanlovni bekor qilish">
          &#x2715;
        </button>
      </div>
    );
  };

  // --- Multi mode trigger display ---
  const renderMultiTrigger = () => {
    const count = selectedEmployees.length;
    if (count === 0) {
      return (
        <div className="assignee-placeholder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{placeholder}</span>
        </div>
      );
    }

    // Show up to 3 avatars stacked + count
    const shown = selectedEmployees.slice(0, 3);
    const extra = count - shown.length;
    return (
      <div className="assignee-multi-selected">
        <div className="assignee-avatar-stack">
          {shown.map((emp, i) => {
            const initial = emp.name ? emp.name.charAt(0).toUpperCase() : '?';
            return (
              <div key={emp.id} className="assignee-avatar-box stacked" style={{ zIndex: shown.length - i }}>
                {emp.avatar ? (
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="assignee-avatar-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`assignee-avatar-fallback ${emp.avatar ? 'hidden' : ''}`}>{initial}</span>
              </div>
            );
          })}
          {extra > 0 && (
            <div className="assignee-avatar-box stacked extra-count">
              <span className="assignee-avatar-fallback">+{extra}</span>
            </div>
          )}
        </div>
        <div className="assignee-multi-info">
          <span className="assignee-multi-count">
            {count} ta xodim tanlandi
          </span>
          <span className="assignee-multi-names">
            {selectedEmployees
              .slice(0, 2)
              .map((e) => e.name.split(' ')[0])
              .join(', ')}
            {count > 2 ? ` va yana ${count - 2} ta` : ''}
          </span>
        </div>
        <button type="button" className="btn-clear-assignee" onClick={handleClearAll} title="Hammasini olib tashlash">
          &#x2715;
        </button>
      </div>
    );
  };

  return (
    <div className={`assignee-select-wrap ${open ? 'is-open' : ''} ${multiple ? 'is-multi' : ''}`} ref={containerRef}>
      {/* Trigger button */}
      <div
        className={`assignee-trigger ${selectedIds.size > 0 ? 'has-value' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((prev) => !prev);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      >
        {multiple ? renderMultiTrigger() : renderSingleTrigger()}

        <span className="chevron-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {/* Dropdown Menu */}
      {open && (
        <div className="assignee-dropdown-menu">
          <div className="assignee-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchInputRef}
              id="assignee-search-input"
              name="assigneeSearch"
              type="text"
              className="assignee-search-input"
              aria-label="Ism, lavozim yoki tuman bo'yicha qidirish"
              placeholder="Ism, lavozim yoki tuman bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button type="button" className="search-clear-btn" onClick={() => setSearch('')}>
                &#x2715;
              </button>
            )}
          </div>

          {/* Multi-select toolbar: select all / deselect all */}
          {multiple && visibleEmployees.length > 0 && (
            <div className="assignee-multi-toolbar">
              <button
                type="button"
                className="assignee-toolbar-btn"
                onClick={allVisibleSelected ? handleDeselectAll : handleSelectAll}
              >
                <span className={`assignee-checkbox ${allVisibleSelected ? 'checked' : ''}`}>
                  {allVisibleSelected && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span>{allVisibleSelected ? 'Hammasini olib tashlash' : 'Hammasini belgilash'}</span>
              </button>
              {selectedIds.size > 0 && (
                <span className="assignee-toolbar-count">{selectedIds.size} ta tanlandi</span>
              )}
            </div>
          )}

          <div className="assignee-list-scroll">
            {territoryGroups.length === 0 ? (
              <div className="assignee-empty">
                <span>Bunday xodim yoki lavozim topilmadi</span>
              </div>
            ) : (
              territoryGroups.map((group) => {
                const groupAllSelected = group.items.every((e) => selectedIds.has(String(e.id)));
                const groupSomeSelected = group.items.some((e) => selectedIds.has(String(e.id)));

                return (
                  <div key={group.key} className={`assignee-group territory-${group.type}`}>
                    <div
                      className={`assignee-group-header ${multiple ? 'clickable' : ''}`}
                      onClick={multiple ? () => handleToggleGroup(group) : undefined}
                    >
                      {multiple && (
                        <span className={`assignee-checkbox ${groupAllSelected ? 'checked' : groupSomeSelected ? 'partial' : ''}`}>
                          {groupAllSelected ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : groupSomeSelected ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          ) : null}
                        </span>
                      )}
                      <span className="assignee-territory-title">
                        {group.type === 'region' ? 'Viloyat' : 'Tuman'}: {group.title}
                      </span>
                      <span className="assignee-group-count">{group.items.length}</span>
                    </div>
                    {group.items.map((emp) => {
                      const isCurrent = selectedIds.has(String(emp.id));
                      const empInitial = emp.name ? emp.name.charAt(0).toUpperCase() : '?';
                      return (
                        <div
                          key={emp.id}
                          className={`assignee-option ${isCurrent ? 'is-selected' : ''}`}
                          onClick={() => (multiple ? handleToggle(emp) : handleSelectSingle(emp))}
                        >
                          {multiple && (
                            <span className={`assignee-checkbox ${isCurrent ? 'checked' : ''}`}>
                              {isCurrent && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                          )}
                          <div className="assignee-avatar-box large">
                            {emp.avatar ? (
                              <img
                                src={emp.avatar}
                                alt={emp.name}
                                className="assignee-avatar-img"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <span className={`assignee-avatar-fallback ${emp.avatar ? 'hidden' : ''}`}>{empInitial}</span>
                          </div>
                          <div className="assignee-details">
                            <div className="assignee-row-top">
                              <span className="assignee-item-name">{emp.name}</span>
                              <span className={`assignee-badge ${emp.cat.badgeClass}`}>{emp.position || emp.cat.group}</span>
                            </div>
                            <span className="assignee-item-email">{emp.email}</span>
                          </div>
                          {!multiple && isCurrent && (
                            <span className="assignee-check">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Multi mode: done button */}
          {multiple && (
            <div className="assignee-multi-footer">
              <button
                type="button"
                className="btn btn-primary assignee-done-btn"
                onClick={() => {
                  setOpen(false);
                  setSearch('');
                }}
              >
                Tayyor ({selectedIds.size} ta tanlandi)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
