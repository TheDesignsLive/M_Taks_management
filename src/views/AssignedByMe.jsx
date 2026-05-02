// AssignByMe.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io as socketIO } from 'socket.io-client';

const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live';

// ─── TOAST HOOK ───────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: '', type: 'success', show: false });
  function showToast(msg, type = 'success') {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }
  return { toast, showToast };
}

// ─── PRIORITY COLORS ─────────────────────────────────────────────────────────
const PRIORITY_COLOR = {
  HIGH:   { border: '#ff4d6d', bg: 'rgba(255,77,109,0.15)', text: '#ff4d6d' },
  MEDIUM: { border: '#fbbf24', bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  LOW:    { border: '#3b82f6', bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
};

// ─── FORMAT DATE ─────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'null') return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function formatInputDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── ASSIGNEE PICKER MODAL ────────────────────────────────────────────────────
function AssigneePicker({ taskId, members, teams, session, adminName, onClose, onAssign }) {
  const [subOpen, setSubOpen] = useState(null);

  function handleAssign(val) {
    onAssign(taskId, val);
    onClose();
  }

  const myId = (session.role === 'admin' || session.role === 'owner') ? 0 : session.userId;

  return (
    <div style={S.pickerBackdrop} onClick={onClose}>
      <div style={S.pickerSheet} onClick={e => e.stopPropagation()}>
        <div style={S.pickerPill} />
        <div style={S.pickerTitle}>Assign To</div>

        <div style={S.pickerList}>
          <button style={S.pickerItem} onClick={() => handleAssign(String(myId))}>
            <span style={S.pickerIcon}>👤</span> Self
          </button>
          <button style={S.pickerItem} onClick={() => handleAssign('all')}>
            <span style={S.pickerIcon}>👥</span> All Members
          </button>

          {teams && teams.map(t => (
            <div key={t.id}>
              <button style={S.pickerItemGroup} onClick={() => setSubOpen(subOpen === t.id ? null : t.id)}>
                <span style={S.pickerIcon}>🏷️</span> Team: {t.name}
                <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{subOpen === t.id ? '▲' : '▼'}</span>
              </button>
              {subOpen === t.id && (
                <div style={S.subList}>
                  <button style={{ ...S.pickerItem, paddingLeft: 36, color: '#14b8a6', fontWeight: 700 }}
                    onClick={() => handleAssign(`team_${t.id}`)}>
                    ➜ Assign All in Team
                  </button>
                  {members.filter(m => m.team_id == t.id).map(m => (
                    <button key={m.id} style={{ ...S.pickerItem, paddingLeft: 36 }}
                      onClick={() => handleAssign(String(m.id))}>
                      {m.name}
                    </button>
                  ))}
                  {!members.some(m => m.team_id == t.id) && (
                    <div style={{ paddingLeft: 36, color: '#aaa', fontSize: 12, padding: '8px 36px' }}>No members</div>
                  )}
                </div>
              )}
            </div>
          ))}

          {members.some(m => !m.team_id) && (
            <div>
              <button style={S.pickerItemGroup} onClick={() => setSubOpen(subOpen === 'other' ? null : 'other')}>
                <span style={S.pickerIcon}>🔹</span> Other Members
                <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{subOpen === 'other' ? '▲' : '▼'}</span>
              </button>
              {subOpen === 'other' && (
                <div style={S.subList}>
                  {members.filter(m => !m.team_id).map(m => (
                    <button key={m.id} style={{ ...S.pickerItem, paddingLeft: 36 }}
                      onClick={() => handleAssign(String(m.id))}>
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(session.role === 'user' || session.role === 'owner') && adminName && (
            <button style={S.pickerItem} onClick={() => handleAssign('0')}>
              <span style={S.pickerIcon}>⭐</span> {adminName} (Admin)
            </button>
          )}
        </div>

        <button style={S.pickerCancel} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─── EDIT TASK MODAL ──────────────────────────────────────────────────────────
function EditModal({ task, members, teams, session, adminName, onClose, onSave, showToast }) {
  const [title, setTitle] = useState(task.title || '');
  const [desc, setDesc] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(formatInputDate(task.due_date) || '');
  const [saving, setSaving] = useState(false);
  const [assignLabel, setAssignLabel] = useState(task.assigned_to || 'Myself');
  const [assignTo, setAssignTo] = useState('self');
  const [subOpen, setSubOpen] = useState(null);
  const [showAssignDrop, setShowAssignDrop] = useState(false);
  const dateRef = useRef(null);

  const myId = (session.role === 'admin' || session.role === 'owner') ? 0 : session.userId;

  function selectAssign(value, label) {
    setAssignTo(value);
    setAssignLabel(label);
    setShowAssignDrop(false);
    setSubOpen(null);
  }

  async function handleSave() {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/assign_by_me/edit-task`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          title: title.trim(),
          description: desc,
          priority,
          due_date: dueDate || null,
          assigned_to: assignTo === 'self' ? String(myId) : assignTo,
        }),
      });
      const data = await res.json();
      if (data.success) { showToast('Task updated'); onSave(); onClose(); }
      else showToast(data.message || 'Update failed', 'error');
    } catch { showToast('Network error', 'error'); }
    setSaving(false);
  }

  const dropItemStyle = {
    padding: '10px 14px', fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    color: '#eee', borderBottom: '1px solid #3C3A3A',
    background: 'none', border: 'none', width: '100%', textAlign: 'left',
    fontFamily: 'Arial, sans-serif',
  };
  const subItemStyle = {
    ...dropItemStyle,
    paddingLeft: 28, background: 'rgba(15,137,137,0.06)', color: '#aaa',
    borderBottom: '1px solid #3C3A3A',
  };

  return (
    <div style={S.pickerBackdrop} onClick={onClose}>
      <div style={{ ...S.pickerSheet, maxHeight: '90dvh' }} onClick={e => e.stopPropagation()}>
        <div style={S.pickerPill} />
        <div style={S.pickerTitle}>Edit Task</div>

        <div style={{ padding: '0 18px 24px', overflowY: 'auto' }}>
          <label style={S.formLabel}>Title *</label>
          <input style={S.formInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" />

          <label style={S.formLabel}>Description</label>
          <textarea style={{ ...S.formInput, minHeight: 70, resize: 'vertical' }}
            value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" />

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={S.formLabel}>Priority</label>
              <select style={S.formInput} value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
      <div style={{ flex: 1 }}>
                <label style={S.formLabel}>Due Date</label>
                {/* Hidden native date input — no min so user can't clear, onBlur ignored */}
                <input
                  ref={dateRef}
                  type="date"
                  value={dueDate}
                  onChange={e => { if (e.target.value) setDueDate(e.target.value); }}
                  style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', top: 0, left: 0, width: 0, height: 0 }}
                />
                {/* Visible clickable date pill */}
                <div
                  onClick={() => dateRef.current?.showPicker?.()}
                  style={{
                    ...S.formInput,
                    display: 'flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer', userSelect: 'none',
                    color: dueDate ? '#CDF4F4' : '#aaa',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0F8989" strokeWidth="2" width="15" height="15">
                    <rect x="3" y="4" width="18" height="18" rx="3"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span style={{ fontSize: 13 }}>
                    {dueDate
                      ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Pick a date'}
                  </span>
                </div>
              </div>
          </div>

          {/* Assign To dropdown */}
          <label style={S.formLabel}>Assign To</label>
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowAssignDrop(v => !v)}
              style={{
                ...S.formInput,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <span style={{ color: '#eee', fontSize: 13 }}>👤 {assignLabel}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" width="12" height="12">
                <path d={showAssignDrop ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}/>
              </svg>
            </div>

        {showAssignDrop && (
              <div style={{
                position: 'absolute', left: 0, right: 0, zIndex: 99999,
                background: '#2E2D2D', border: '1px solid rgba(15,137,137,0.35)',
                borderRadius: 10, overflow: 'hidden',
                bottom: '100%', marginBottom: 4,
                boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
                maxHeight: '50dvh', overflowY: 'auto',
              }}>
                {/* Self */}
                <button style={dropItemStyle} onClick={() => selectAssign(String(myId), 'Myself')}>
                  <span>👤</span><span style={{ flex: 1 }}>Myself</span>
                  {assignTo === String(myId) && <span style={{ color: '#0F8989' }}>✓</span>}
                </button>

                {/* All Members */}
                <button style={dropItemStyle} onClick={() => selectAssign('all', 'All Members')}>
                  <span>👥</span><span style={{ flex: 1 }}>All Members</span>
                  {assignTo === 'all' && <span style={{ color: '#0F8989' }}>✓</span>}
                </button>

                {/* Admin (non-admin only) */}
                {(session.role === 'user' || session.role === 'owner') && adminName && (
                  <button style={dropItemStyle} onClick={() => selectAssign('0', `${adminName} (Admin)`)}>
                    <span>⭐</span><span style={{ flex: 1 }}>{adminName} (Admin)</span>
                    {assignTo === '0' && <span style={{ color: '#0F8989' }}>✓</span>}
                  </button>
                )}

                {/* Teams */}
                {teams && teams.map(t => (
                  <div key={t.id}>
                    <button style={{ ...dropItemStyle, color: '#aaa', fontWeight: 700 }}
                      onClick={() => setSubOpen(subOpen === t.id ? null : t.id)}>
                      <span>🏷️</span>
                      <span style={{ flex: 1 }}>{t.name}</span>
                      <span style={{ fontSize: 11, color: '#0F8989', display: 'inline-block', transform: subOpen === t.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>›</span>
                    </button>
                    {subOpen === t.id && (
                      <>
                        <button style={{ ...subItemStyle, color: '#0F8989', fontWeight: 700 }}
                          onClick={() => selectAssign(`team_${t.id}`, `All ${t.name}`)}>
                          <span style={{ color: '#0F8989' }}>↳</span>
                          <span style={{ flex: 1 }}>All {t.name}</span>
                          {assignTo === `team_${t.id}` && <span style={{ color: '#0F8989' }}>✓</span>}
                        </button>
                        {members.filter(m => m.team_id == t.id).map(m => (
                          <button key={m.id} style={{ ...subItemStyle, paddingLeft: 36 }}
                            onClick={() => selectAssign(String(m.id), m.name)}>
                            <span style={{ flex: 1 }}>{m.name}</span>
                            {assignTo === String(m.id) && <span style={{ color: '#0F8989' }}>✓</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ))}

                {/* Other members (no team) */}
                {members.some(m => !m.team_id) && (
                  <div>
                    <button style={{ ...dropItemStyle, color: '#aaa', fontWeight: 700 }}
                      onClick={() => setSubOpen(subOpen === 'other' ? null : 'other')}>
                      <span>🔹</span>
                      <span style={{ flex: 1 }}>Other Members</span>
                      <span style={{ fontSize: 11, color: '#0F8989', display: 'inline-block', transform: subOpen === 'other' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>›</span>
                    </button>
                    {subOpen === 'other' && members.filter(m => !m.team_id).map(m => (
                      <button key={m.id} style={{ ...subItemStyle, paddingLeft: 36 }}
                        onClick={() => selectAssign(String(m.id), m.name)}>
                        <span style={{ flex: 1 }}>{m.name}</span>
                        {assignTo === String(m.id) && <span style={{ color: '#0F8989' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button style={S.btnCancel} onClick={onClose}>Cancel</button>
            <button style={{ ...S.btnSave, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onClose, danger }) {
  return (
    <div style={S.pickerBackdrop} onClick={onClose}>
      <div style={{ ...S.pickerSheet, maxHeight: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={S.pickerPill} />
        <div style={{ textAlign: 'center', padding: '20px 24px 28px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={S.btnCancel} onClick={onClose}>Cancel</button>
            <button style={{ ...S.btnSave, background: 'linear-gradient(135deg,#b91c1c,#ef4444)' }} onClick={onConfirm}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// Animation when click checkbox


function AnimCheckbox({ checked, color, onChange, disabled }) {
  const [anim, setAnim] = useState(false);
  const handleChange = () => {
    if (disabled) return;
    if (!checked) { setAnim(true); setTimeout(() => setAnim(false), 500); }
    onChange();
  };

  // stroke color for checkmark — matches Home.jsx logic
  const strokeColor = color === '#ff4d6d' ? '#7f1d1d'
    : color === '#fbbf24' ? '#713f12'
    : '#1e3a5f';

  return (
    <>
      <style>{`
        @keyframes abmCheckDraw {
          0%   { stroke-dashoffset: 20; opacity: 0; }
          40%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes abmBoxPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.3); }
          70%  { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div
        onClick={handleChange}
        style={{
          width: 20, height: 20, borderRadius: 6,
          border: `2px solid ${color}`,
          background: checked ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: disabled ? 'default' : 'pointer',
          flexShrink: 0, marginTop: 2,
          transition: 'background 0.2s, border-color 0.2s',
          animation: anim ? 'abmBoxPop 0.45s ease forwards' : 'none',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 10 10" style={{ display: 'block' }}>
            <polyline
              points="1.5,5 4,7.5 8.5,2"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="20"
              strokeDashoffset="0"
              style={{ animation: anim ? 'abmCheckDraw 0.35s ease forwards' : 'none' }}
            />
          </svg>
        )}
      </div>
    </>
  );
}

//

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task, members, teams, session, adminName, onRefresh, showToast, isCompleted }) {
const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, openUpward: false });
  const [expanded, setExpanded] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const menuRef = useRef(null);
  const pc = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.MEDIUM;

// intentionally removed — backdrop div handles closing

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    const newStatus = isCompleted ? 'OPEN' : 'COMPLETED';
    try {
      await fetch(`${BASE_URL}/api/assign_by_me/update-status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      onRefresh();
    } catch { showToast('Network error', 'error'); }
    setTimeout(() => setToggling(false), 500);
  }

  async function handleAssign(taskId, newAssigneeId) {
    try {
      const res = await fetch(`${BASE_URL}/api/assign_by_me/update-assignee`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, newAssigneeId }),
      });
      const data = await res.json();
      if (data.success) { showToast('Assignee updated'); onRefresh(); }
      else showToast(data.message || 'Failed', 'error');
    } catch { showToast('Network error', 'error'); }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`${BASE_URL}/api/assign_by_me/delete-task/${task.id}`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (data.success) { showToast('Task deleted'); onRefresh(); }
      else showToast('Delete failed', 'error');
    } catch { showToast('Network error', 'error'); }
    setDeleteOpen(false);
  }

const hasDesc = !!(task.description && task.description.trim() && task.description !== 'null');

  return (
    <>
      <div style={{ ...S.taskCard, borderLeft: `4px solid ${pc.border}`, opacity: isCompleted ? 0.55 : toggling ? 0.4 : 1, transform: toggling ? 'scale(0.97)' : 'scale(1)', transition: 'opacity 0.4s, transform 0.4s' }}>

{/* Row 1: Checkbox + Title only */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AnimCheckbox checked={isCompleted} color={pc.border} onChange={handleToggle} disabled={toggling} />
          <div style={{ flex: 1, minWidth: 0, color: isCompleted ? '#888' : '#eee', fontSize: 13.5, fontWeight: 500, lineHeight: 1.3, textAlign: 'left', wordBreak: 'break-word' }}>
            {task.title}
          </div>
        </div>

        {/* Row 2: Section + Assignee (left) | Info + Date + 3dot (right) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 8, paddingLeft: 26 }}>

          {/* Left: section + assignee */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
            {task.section && !isCompleted && (
<span style={{ fontSize: 9, color: '#0F8989', padding: '1px 5px', borderRadius: 3, background: 'rgba(15,137,137,0.1)', border: '1px solid rgba(15,137,137,0.4)', whiteSpace: 'nowrap', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>
                {task.section}
              </span>
            )}
            {isCompleted ? (
              <span style={{ ...S.badge, color: '#14b8a6', background: 'rgba(15,137,137,0.18)', border: '1px solid rgba(15,137,137,0.3)' }}>
                👤 {task.assigned_to}
              </span>
            ) : (
              <button style={{ ...S.assignBtn }} onClick={() => setAssignOpen(true)}>
                👤 {task.assigned_to || 'Assign'} ▾
              </button>
            )}
          </div>

          {/* Right: info + date + 3dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Info icon */}
            {hasDesc && (
              <button
                onClick={() => setExpanded(v => !v)}
                style={{ background: 'none', border: 'none', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expanded ? '#0F8989' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8.5"/><line x1="12" y1="11" x2="12" y2="16"/>
                </svg>
              </button>
            )}

            {/* Date */}
            {task.due_date && !isCompleted && (
              <>
                <input
                  type="date"
                  defaultValue={formatInputDate(task.due_date)}
                  onChange={async e => {
                    if (!e.target.value) return;
                    try {
                      const res = await fetch(`${BASE_URL}/api/assign_by_me/edit-task`, {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: task.id, due_date: e.target.value }),
                      });
                      const data = await res.json();
                      if (data.success) { showToast('Date updated'); onRefresh(); }
                      else showToast('Failed to update date', 'error');
                    } catch { showToast('Network error', 'error'); }
                  }}
                  id={`date-input-${task.id}`}
                  style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', top: 0, left: 0, width: 0, height: 0 }}
                />
                <span
                  onClick={() => document.getElementById(`date-input-${task.id}`)?.showPicker?.()}
                  style={{ fontSize: 11, fontWeight: 600, color: '#0F8989', cursor: 'pointer', padding: '1px 6px', borderRadius: 4, background: '#095959', minWidth: 60, textAlign: 'center', whiteSpace: 'nowrap' }}
                >
                  📅 {formatDate(task.due_date)}
                </span>
              </>
            )}
            {task.due_date && isCompleted && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#aaa', padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', minWidth: 60, textAlign: 'center', whiteSpace: 'nowrap' }}>
                📅 {formatDate(task.due_date)}
              </span>
            )}

            {/* 3-dot menu */}
            <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}
                onClick={() => {
                  if (!menuOpen && menuRef.current) {
                    const rect = menuRef.current.getBoundingClientRect();
                    const menuHeight = 100, menuWidth = 140;
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const openUpward = spaceBelow < menuHeight + 8;
                    setMenuPos({ top: openUpward ? rect.top - menuHeight : rect.bottom + 4, left: rect.right - menuWidth, openUpward });
                  }
                  setMenuOpen(v => !v);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#aaa">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Description (expandable) — clamped to prevent overflowing card */}
        {expanded && hasDesc && (
          <div style={{ marginTop: 10, borderTop: '1px solid #3C3A3A', paddingTop: 10, paddingLeft: 26, fontSize: 12.5, color: '#aaa', lineHeight: 1.5, textAlign: 'left', wordBreak: 'break-word', maxHeight: 80, overflowY: 'auto' }}>
            {task.description}
          </div>
        )}
      </div>

{menuOpen && (
        <div style={{
          position: 'fixed', top: menuPos.top, left: menuPos.left,
          background: '#2E2D2D', border: '1px solid #0F8989',
          borderRadius: menuPos.openUpward ? '10px 10px 10px 4px' : '4px 10px 10px 10px',
          zIndex: 99999, minWidth: 140, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }} onMouseDown={e => e.stopPropagation()}>
          <button style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'transparent', border: 'none', color: '#eee', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, sans-serif', borderBottom: '1px solid #3C3A3A' }}
            onClick={() => { setMenuOpen(false); setEditOpen(true); }}>✏️ Edit</button>
          <button style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'transparent', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Arial, sans-serif' }}
onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}>🗑️ Delete</button>
        </div>
      )}
   {menuOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setMenuOpen(false)} />}

      {assignOpen && (
        <AssigneePicker
          taskId={task.id}
          members={members} teams={teams}
          session={session} adminName={adminName}
          onClose={() => setAssignOpen(false)}
          onAssign={handleAssign}
        />
      )}

        {editOpen && (
          <EditModal
            task={task}
            members={members}
            teams={teams}
            session={session}
            adminName={adminName}
            onClose={() => setEditOpen(false)}
            onSave={onRefresh}
            showToast={showToast}
          />
        )}

      {deleteOpen && (
        <ConfirmModal
          title="Delete Task?"
          message="This task will be permanently removed."
          onConfirm={handleDelete}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AssignByMe() {
  const [openTasks, setOpenTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [session, setSession] = useState({});
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed'
  const sliderRef = useRef(null);
  const swipeStartX = useRef(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const { toast, showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/assign_by_me`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setOpenTasks(data.openTasks || []);
        setCompletedTasks(data.completedTasks || []);
        setMembers(data.members || []);
        setTeams(data.teams || []);
        setSession(data.session || {});
        setAdminName(data.adminName || '');
      } else {
        showToast(data.message || 'Failed to load tasks', 'error');
      }
    } catch (e) {
      showToast('Network error. Please check connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => { fetchData(); }, [fetchData]);

useEffect(() => {
  window.addEventListener('task-added', fetchData);
  return () => window.removeEventListener('task-added', fetchData);
}, [fetchData]);

useEffect(() => {
  const socket = socketIO(BASE_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
  socket.on('update_tasks', () => {
    fetchData();
  });
  return () => {
    socket.disconnect();
  };
}, [fetchData]);

  async function handleDeleteAllCompleted() {
    try {
      const res = await fetch(`${BASE_URL}/api/assign_by_me/delete-all-completed`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (data.success) { showToast('Completed tasks cleared'); fetchData(); }
      else showToast('Failed', 'error');
    } catch { showToast('Network error', 'error'); }
    setDeleteAllOpen(false);
  }

const sharedProps = { members, teams, session, adminName, onRefresh: fetchData, showToast };

  function onTouchStart(e) { swipeStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (swipeStartX.current === null) return;
    const dx = swipeStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) {
      if (dx > 0) setActiveTab('completed');
      else setActiveTab('pending');
    }
    swipeStartX.current = null;
  }

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.spinner} />
        <p style={{ color: '#14b8a6', marginTop: 16, fontSize: 13, fontFamily: "Arial, sans-serif" }}>
          Loading tasks…
        </p>
      </div>
    );
  }

  return (
   <div style={S.page} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div>
            <h1 style={S.headerTitle}>Assigned by Me</h1>
            <p style={S.headerSub}>Track tasks you've delegated</p>
          </div>
          <div style={S.statsRow}>
            <div style={S.statPill}>
              <span style={S.statNum}>{openTasks.length}</span>
              <span style={S.statLbl}>Pending</span>
            </div>
            <div style={{ ...S.statPill, background: 'rgba(15,137,137,0.2)', border: '1px solid rgba(15,137,137,0.4)' }}>
              <span style={{ ...S.statNum, color: '#14b8a6' }}>{completedTasks.length}</span>
              <span style={S.statLbl}>Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB TOGGLE ── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 14px 0' }}>

        {/* Tabs Row */}
        <div style={{ display: 'flex' }}>
          <div style={S.tabBar}>
            <button
              style={{ ...S.tab, ...(activeTab === 'pending' ? S.tabActive : {}) }}
              onClick={() => setActiveTab('pending')}
            >
              Pending
              <span style={{ ...S.tabBadge, background: activeTab === 'pending' ? '#0F8989' : '#555' }}>
                {openTasks.length}
              </span>
            </button>

            <button
              style={{ ...S.tab, ...(activeTab === 'completed' ? S.tabActive : {}) }}
              onClick={() => setActiveTab('completed')}
            >
              Completed
              <span style={{ ...S.tabBadge, background: activeTab === 'completed' ? '#0F8989' : '#555' }}>
                {completedTasks.length}
              </span>
            </button>
          </div>
        </div>

        {/* Clear All Row (RIGHT aligned, separate row) */}
        {activeTab === 'completed' && completedTasks.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button style={S.clearBtn} onClick={() => setDeleteAllOpen(true)}>
              🗑️ Clear All
            </button>
          </div>
        )}

      </div>
{/* ── TASK LIST ── */}
<div
        ref={sliderRef}
        style={{ ...S.listWrap, touchAction: 'pan-y' }}
      >
        {activeTab === 'pending' && (
          <>
            {openTasks.length === 0 ? (
              <EmptyState icon="" title="No pending tasks" sub="Tasks you assign to others appear here" />
            ) : (
              openTasks.map(task => (
                <TaskCard key={task.id} task={task} {...sharedProps} isCompleted={false} />
              ))
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            {completedTasks.length === 0 ? (
              <EmptyState icon="" title="No completed tasks" sub="Completed tasks will show here" />
            ) : (
              completedTasks.map(task => (
                <TaskCard key={task.id} task={task} {...sharedProps} isCompleted={true} />
              ))
            )}
          </>
        )}
      </div>

      {/* ── CONFIRM DELETE ALL ── */}
      {deleteAllOpen && (
        <ConfirmModal
          title="Clear Completed Tasks?"
          message="All completed tasks you assigned will be permanently deleted."
          onConfirm={handleDeleteAllCompleted}
          onClose={() => setDeleteAllOpen(false)}
        />
      )}

      {/* ── TOAST ── */}
      <div
        className={`abm-toast${toast.show ? ' show' : ''}`}
        style={{ background: toast.type === 'error' ? '#7f1d1d' : '#095959' }}
        role="alert"
      >
        <span style={{ marginRight: 7 }}>{toast.type === 'error' ? '❌' : '✅'}</span>
        {toast.msg}
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }) {
  return (
    <div style={S.emptyWrap}>
      <div style={S.emptyIcon}>{icon}</div>
      <div style={S.emptyTitle}>{title}</div>
      <div style={S.emptySub}>{sub}</div>
    </div>
  );
}



// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100%',
    background: '#3C3A3A',           // ← Notification page bg
    fontFamily: "Arial, sans-serif",
    paddingBottom: 100,
  },
  loadingWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh',
  },
  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(15,137,137,0.2)',
    borderTop: '3px solid #0F8989',
    borderRadius: '50%',
    animation: 'abmSpin 0.7s linear infinite',
  },

  // Header
  header: {
    background: '#2E2D2D',           // ← Notification darker panel
    padding: '20px 18px 16px',
    borderBottom: '1px solid rgba(15,137,137,0.3)',
  },
  headerInner: {
    maxWidth: 640, margin: '0 auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerTitle: {
    margin: 0, fontSize: 20, fontWeight: 800,
    color: '#CDF4F4',                // ← Notification annTitle color
    letterSpacing: -0.3,
  },
  headerSub: {
    margin: '3px 0 0', fontSize: 12, color: '#aaa', fontWeight: 400,
  },
  statsRow: { display: 'flex', gap: 8, marginTop: 4 },
  statPill: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 12, padding: '6px 14px',
    minWidth: 54,
  },
  statNum: { fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1 },
  statLbl: { fontSize: 9.5, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // Tabs — matches Notification toggleRow exactly
  tabWrap: {
    maxWidth: 640, margin: '0 auto',
    padding: '12px 14px 0',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  tabBar: {
    display: 'flex', flex: 1,
    background: '#2E2D2D',           // ← Notification toggleRow bg
    borderRadius: 30,
    padding: 5,
    gap: 4,
  },
  tab: {
    flex: 1, padding: '10px 12px',
    border: 'none', background: 'transparent',
    color: '#aaa', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', borderRadius: 25,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'all 0.18s ease',
    fontFamily: "Arial, sans-serif",
    letterSpacing: 0.1,
  },
  tabActive: {
    background: '#0F8989',           // ← Notification activeTab bg
    color: '#fff',
    fontWeight: 'bold',
  },
  tabBadge: {
    fontSize: 10, fontWeight: 800, color: '#fff',
    padding: '1px 6px', borderRadius: 20,
    minWidth: 18, textAlign: 'center',
  },
  clearBtn: {
    padding: '8px 12px',
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 100, color: '#ef4444',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: "Arial, sans-serif",
    whiteSpace: 'nowrap',
  },

  // List
  listWrap: {
    maxWidth: 640, margin: '12px auto 0',
    padding: '0 14px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },

  // Task Card — matches Notification annCard
taskCard: {
    background: '#444',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: '12px 12px 10px',
    position: 'relative',
    transition: 'opacity 0.4s, transform 0.4s',
    overflow: 'visible',
  },
  checkbox: {
    width: 20, height: 20,
    borderRadius: 6, border: '2px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0, outline: 'none',
    transition: 'all 0.18s ease',
  },
  badge: {
    fontSize: 10.5, fontWeight: 700,
    padding: '2.5px 8px', borderRadius: 20,
    letterSpacing: 0.3, whiteSpace: 'nowrap',
  },
assignBtn: {
    padding: '1px 5px',
    background: 'rgba(15,137,137,0.12)',
    border: '1px solid rgba(15,137,137,0.3)',
    borderRadius: 3, color: '#14b8a6',
    fontSize: 9, fontWeight: 700, cursor: 'pointer',
    fontFamily: "Arial, sans-serif",
    whiteSpace: 'nowrap',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
  },
  dotsBtn: {
    width: 28, height: 28,
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: '#ccc', fontSize: 20, fontWeight: 900,
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%', padding: 0, lineHeight: 1,
  },
  dropMenu: {
    position: 'absolute', right: 0, top: 32,
    background: '#2E2D2D',           // ← Notification dark panel
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, overflow: 'hidden',
    zIndex: 9999, minWidth: 130,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  dropItem: {
    display: 'block', width: '100%',
    padding: '10px 14px', textAlign: 'left',
    background: 'transparent', border: 'none',
    color: '#eee', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: "Arial, sans-serif",
  },
  dropDivider: { height: 1, background: 'rgba(255,255,255,0.08)' },

  // Picker / Sheet
  pickerBackdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)', zIndex: 9000,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    animation: 'abmFade 0.15s ease',
  },
  pickerSheet: {
    width: '100%', maxWidth: 520,
    background: '#2E2D2D',           // ← Notification dark panel
    borderRadius: '22px 22px 0 0',
    border: '1px solid rgba(15,137,137,0.2)',
    paddingBottom: 24,
    maxHeight: '80dvh', overflowY: 'auto',
    animation: 'abmSlide 0.24s cubic-bezier(.22,.68,0,1.18)',
    boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
  },
  pickerPill: {
    width: 40, height: 4,
    background: 'rgba(15,137,137,0.4)',
    borderRadius: 4, margin: '12px auto 0',
  },
  pickerTitle: {
    fontSize: 16, fontWeight: 800,
    color: '#CDF4F4',
    padding: '14px 18px 8px',
    letterSpacing: -0.2,
  },
  pickerList: { padding: '0 10px' },
  pickerItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '12px 8px',
    background: 'transparent', border: 'none',
    color: '#eee', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', textAlign: 'left',
    borderRadius: 10,
    fontFamily: "Arial, sans-serif",
  },
  pickerItemGroup: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '12px 8px',
    background: 'transparent', border: 'none',
    color: '#aaa', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', textAlign: 'left',
    fontFamily: "Arial, sans-serif",
  },
  pickerIcon: { fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 },
  subList: {
    background: 'rgba(15,137,137,0.06)',
    borderLeft: '2px solid rgba(15,137,137,0.25)',
    marginLeft: 18, borderRadius: '0 0 8px 8px',
  },
  pickerCancel: {
    display: 'block', margin: '12px 18px 0',
    width: 'calc(100% - 36px)',
    padding: '13px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14, color: '#aaa',
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: "Arial, sans-serif",
  },

  // Edit modal form
  formLabel: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: '#14b8a6', textTransform: 'uppercase',
    letterSpacing: 0.7, marginBottom: 5, marginTop: 14,
    textAlign: "left",
  },
  formInput: {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px',
    background: '#3C3A3A',           // ← Notification container bg as input bg
    border: '1.5px solid rgba(15,137,137,0.3)',
    borderRadius: 8, color: '#eee',
    fontSize: 14, outline: 'none',
    fontFamily: "Arial, sans-serif",
  },

  // Buttons
  btnCancel: {
    flex: 1, padding: '12px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12, color: '#aaa',
    fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: "Arial, sans-serif",
  },
  btnSave: {
    flex: 1, padding: '12px',
    background: '#0F8989',           // ← Notification addBtn bg
    border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: "Arial, sans-serif",
    boxShadow: '0 4px 16px rgba(15,137,137,0.3)',
  },

  // Empty state
  emptyWrap: {
    textAlign: 'center', padding: '48px 24px',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: '#aaa', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#777' },
};

const CSS = `
  @keyframes abmSpin  { to { transform: rotate(360deg); } }
  @keyframes abmFade  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes abmSlide { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .abm-task-card:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(15,137,137,0.15); }

  .abm-toast {
    position: fixed;
    bottom: -80px; left: 50%;
    transform: translateX(-50%);
    color: #e2e8f0;
    padding: 11px 22px;
    border-radius: 32px;
    font-size: 13px; font-weight: 600;
    font-family: Arial, sans-serif;
    box-shadow: 0 6px 28px rgba(0,0,0,0.4);
    z-index: 99999;
    white-space: nowrap;
    display: flex; align-items: center;
    transition: bottom 0.32s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease;
    opacity: 0; pointer-events: none;
    max-width: calc(100vw - 40px);
    border: 1px solid rgba(15,137,137,0.25);
  }
  .abm-toast.show { bottom: 90px; opacity: 1; }

  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }

  select option { background: #3C3A3A; color: #eee; }

  @media (min-width: 600px) {
    .abm-toast.show { bottom: 36px; }
  }
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .abm-toast.show { bottom: calc(90px + env(safe-area-inset-bottom)); }
  }
`;