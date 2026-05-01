// AssignByMe.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  LOW:    { border: '#0F8989', bg: 'rgba(15,137,137,0.15)', text: '#14b8a6' },
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
function EditModal({ task, onClose, onSave, showToast }) {
  const [title, setTitle] = useState(task.title || '');
  const [desc, setDesc] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(formatInputDate(task.due_date) || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/assign_by_me/edit-task`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, title: title.trim(), description: desc, priority, due_date: dueDate || null }),
      });
      const data = await res.json();
      if (data.success) { showToast('Task updated'); onSave(); onClose(); }
      else showToast(data.message || 'Update failed', 'error');
    } catch { showToast('Network error', 'error'); }
    setSaving(false);
  }

  return (
    <div style={S.pickerBackdrop} onClick={onClose}>
      <div style={{ ...S.pickerSheet, maxHeight: '85dvh' }} onClick={e => e.stopPropagation()}>
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
              <input type="date" style={S.formInput} value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>
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

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task, members, teams, session, adminName, onRefresh, showToast, isCompleted }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const menuRef = useRef(null);
  const pc = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.MEDIUM;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('touchstart', handler);
    document.addEventListener('mousedown', handler);
    return () => { document.removeEventListener('touchstart', handler); document.removeEventListener('mousedown', handler); };
  }, [menuOpen]);

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

  return (
    <>
      <div style={{ ...S.taskCard, borderLeft: `4px solid ${pc.border}`, opacity: isCompleted ? 0.75 : 1 }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Checkbox */}
          <button
            style={{ ...S.checkbox, borderColor: pc.border, background: isCompleted ? pc.border : 'transparent', flexShrink: 0, marginTop: 2 }}
            onClick={handleToggle}
            disabled={toggling}
            aria-label={isCompleted ? 'Mark pending' : 'Mark complete'}
          >
            {isCompleted && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
          </button>

          {/* Title + desc */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: isCompleted ? '#aaa' : '#fff',
              textDecoration: 'none',
              wordBreak: 'break-word', lineHeight: 1.35,
            }}>
              {task.title}
            </div>
            {task.description && task.description !== 'null' && task.description !== '' && (
              <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 3, wordBreak: 'break-word', lineHeight: 1.4 }}>
                {task.description}
              </div>
            )}
          </div>

          {/* 3-dot menu */}
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button style={S.dotsBtn} onClick={() => setMenuOpen(v => !v)}>⋮</button>
            {menuOpen && (
              <div style={S.dropMenu}>
                <button style={S.dropItem} onClick={() => { setMenuOpen(false); setEditOpen(true); }}>✏️ Edit</button>
                <div style={S.dropDivider} />
                <button style={{ ...S.dropItem, color: '#ef4444' }} onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}>🗑️ Delete</button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: badges + assignee + date */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {/* Priority */}
          <span style={{ ...S.badge, color: pc.text, background: pc.bg, border: `1px solid ${pc.border}44` }}>
            {task.priority}
          </span>

          {/* Section */}
          {task.section && (
            <span style={{ ...S.badge, color: '#ccc', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {task.section}
            </span>
          )}

          {/* Assignee */}
          {isCompleted ? (
            <span style={{ ...S.badge, color: '#14b8a6', background: 'rgba(15,137,137,0.18)', border: '1px solid rgba(15,137,137,0.3)', marginLeft: 'auto' }}>
              👤 {task.assigned_to}
            </span>
          ) : (
            <button style={{ ...S.assignBtn, marginLeft: 'auto' }} onClick={() => setAssignOpen(true)}>
              👤 {task.assigned_to || 'Assign'} ▾
            </button>
          )}

          {/* Date */}
          {task.due_date && (
            <span style={{ ...S.badge, color: '#aaa', background: 'rgba(255,255,255,0.06)' }}>
              📅 {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>

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
    <div style={S.page}>
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
      <div style={S.listWrap}>
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
    background: '#444',              // ← Notification annCard bg
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '12px 14px',
    position: 'relative',
    transition: 'transform 0.15s, box-shadow 0.15s',
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
    padding: '3px 10px',
    background: 'rgba(15,137,137,0.18)',
    border: '1px solid rgba(15,137,137,0.35)',
    borderRadius: 20, color: '#14b8a6',
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
    fontFamily: "Arial, sans-serif",
    whiteSpace: 'nowrap',
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