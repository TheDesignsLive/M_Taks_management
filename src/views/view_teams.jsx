// view_teams.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client'; // ✅ ADD
import ViewRoles from './ViewRoles';

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

// ─── ICONS ───────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const PencilIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width={size} height={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width={size} height={size}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const BuildingIcon = () => (
 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="16" width="6" height="4" rx="1"/><rect x="17" y="16" width="6" height="4" rx="1"/><path d="M12 5v4M12 9h-8v7M12 9h8v7"/></svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f39c12" strokeWidth="2" width="36" height="36">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const DangerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" width="36" height="36">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const OkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.5" width="36" height="36">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);
const DotOk = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const DotErr = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ open, icon, title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div style={S.backdrop} onClick={onCancel}>
      <div style={{ ...S.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalPill} />
        <div style={{ textAlign: 'center', padding: '20px 16px 8px' }}>
          <div style={{ marginBottom: 12 }}>{icon}</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#CDF4F4', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...S.btn, background: 'rgba(255,255,255,0.07)', color: '#aaa', border: '1px solid rgba(255,255,255,0.12)' }} onClick={onCancel}>Cancel</button>
            <button
              style={{ ...S.btn, background: confirmClass === 'danger' ? '#e74c3c' : '#0F8989', color: '#fff', opacity: loading ? 0.7 : 1 }}
              onClick={onConfirm} disabled={loading}>
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ALERT MODAL ──────────────────────────────────────────────────────────────
function AlertModal({ open, icon, title, message, onClose }) {
  if (!open) return null;
  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalPill} />
        <div style={{ textAlign: 'center', padding: '20px 16px 8px' }}>
          <div style={{ marginBottom: 12 }}>{icon}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#CDF4F4', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
          <button style={{ ...S.btn, background: '#0F8989', color: '#fff', width: '100%' }} onClick={onClose}>Okay</button>
        </div>
      </div>
    </div>
  );
}

// ─── FIELD ────────────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={S.label}>{label}</label>}
      {children}
      {error && <div style={S.errText}>{error}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ViewTeams({ onBack }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast, showToast } = useToast();

  // Add this new state line
  const [showRoles, setShowRoles] = useState(false);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Confirm/Alert modals
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '', loading: false });
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', success: true });

  const showAlert = (title, message, success = true) => setAlertModal({ open: true, title, message, success });

  // ── FETCH ─────────────────────────────────────────────────────────────────
  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/teams`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setTeams(json.teams);
      } else {
        showToast(json.message || 'Failed to load departments', 'error');
      }
    } catch (err) {
      showToast('Network error. Could not load departments.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // ── SOCKET — real-time team updates ───────────────────────────────────────
  useEffect(() => {
    const socket = io(BASE_URL, { withCredentials: true });
    socket.on('update_teams', () => {
      fetchTeams();
    });
    return () => socket.disconnect();
  }, [fetchTeams]);

  // ── FILTERED ──────────────────────────────────────────────────────────────
  const filtered = teams.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── ADD ───────────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!addName.trim()) { setAddError('Department name is required.'); return; }
    setAddLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/teams/add`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setAddOpen(false);
        setAddName('');
        setAddError('');
        showAlert('Created!', json.message, true);
        fetchTeams();
      } else {
        showToast(json.message, 'error');
      }
    } catch { showToast('Server error.', 'error'); }
    setAddLoading(false);
  }

  // ── EDIT ──────────────────────────────────────────────────────────────────
  async function handleEdit() {
    if (!editName.trim()) { setEditError('Department name is required.'); return; }
    setEditLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/teams/edit/${editId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setEditOpen(false);
        showAlert('Updated!', json.message, true);
        fetchTeams();
      } else {
        showToast(json.message, 'error');
      }
    } catch { showToast('Server error.', 'error'); }
    setEditLoading(false);
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  async function confirmDelete() {
    setDeleteModal(m => ({ ...m, loading: true }));
    try {
      const res = await fetch(`${BASE_URL}/api/teams/delete/${deleteModal.id}`, { credentials: 'include' });
      const json = await res.json();
      setDeleteModal(m => ({ ...m, open: false, loading: false }));
      if (json.success) {
        showAlert('Deleted!', json.message, true);
        fetchTeams();
      } else {
        showToast(json.message, 'error');
      }
    } catch {
      setDeleteModal(m => ({ ...m, loading: false }));
      showToast('Server error.', 'error');
    }
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <style>{CSS}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={S.spinner} />
          <p style={{ color: '#14b8a6', marginTop: 16, fontFamily: "Arial, sans-serif", fontSize: 13 }}>Loading departments…</p>
        </div>
      </div>
    );
  }

  // Add this logic block before the return statement
if (showRoles) {
    return (
      <ViewRoles
        onBack={() => { setShowRoles(false); onBack && onBack(); }}
        onChangeToDept={() => setShowRoles(false)}
      />
    );
  }

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* {onBack && (
              <button style={S.backBtn} className="vt-back-btn" onClick={onBack}>
                <BackIcon />
              </button>
            )} */}
       <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
  <div style={S.headerTitle}>Departments</div>
  <div style={S.headerSub}>{teams.length} total departments</div>
</div>
          </div>
          <div style={S.statsRow}>
            <div style={S.statPill}>
              <span style={S.statNum}>{teams.length}</span>
              <span style={S.statLbl}>Total</span>
            </div>
          </div>
        </div>

        {/* Nav pills + Add button row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
       <button style={S.navPill} className="vt-nav-pill" onClick={() => onBack && onBack()} title="Members">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
</button>
<button style={S.navPillActive} className="vt-nav-pill-active" title="Departments">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="16" width="6" height="4" rx="1"/><rect x="17" y="16" width="6" height="4" rx="1"/><path d="M12 5v4M12 9h-8v7M12 9h8v7"/></svg>
</button>
<button style={S.navPill} className="vt-nav-pill" onClick={() => setShowRoles(true)} title="Roles">
<i className="fa-regular fa-id-card"></i>
</button>
            
          </div>
          <button style={S.addBtn} className="vt-add-btn" onClick={() => { setAddName(''); setAddError(''); setAddOpen(true); }}>
            <PlusIcon />
            <span style={{ marginLeft: 6 }}>Add</span>
          </button>
        </div>

        {/* Search */}
        <div style={S.searchWrap}>
          <span style={S.searchIcon}><SearchIcon /></span>
          <input
            style={S.searchInput}
            placeholder="Search department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="vt-search"
          />
        </div>
      </div>

      {/* ── DEPARTMENT CARDS ── */}
      <div style={S.body}>
        {filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#aaa', marginBottom: 6 }}>
              {search ? 'No departments match your search.' : 'No departments found.'}
            </div>
            <div style={{ fontSize: 13, color: '#777' }}>Departments you add will appear here</div>
          </div>
        ) : (
          <div style={S.grid}>
            {filtered.map((team, i) => (
              <DepartmentCard
                key={team.id}
                team={team}
                index={i}
                onEdit={() => { setEditId(team.id); setEditName(team.name); setEditError(''); setEditOpen(true); }}
                onDelete={() => setDeleteModal({ open: true, id: team.id, name: team.name, loading: false })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── ADD MODAL ── */}
      {addOpen && (
        <div style={S.backdrop} onClick={() => setAddOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={S.modalHead}>
              <span style={S.modalTitle}>Add Department</span>
              <button style={S.closeBtn} className="vt-close" onClick={() => setAddOpen(false)}><CloseIcon /></button>
            </div>
            <div style={{ paddingBottom: 20 }}>
              <Field label="Department Name" error={addError}>
                <input
                  style={S.input}
                  placeholder="Enter department name"
                  value={addName}
                  autoFocus
                  onChange={e => { setAddName(e.target.value); setAddError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="vt-input"
                />
              </Field>
              <button
                style={{ ...S.btnSave, width: '100%', marginTop: 6, opacity: addLoading ? 0.7 : 1 }}
                onClick={handleAdd}
                disabled={addLoading}
              >
                {addLoading ? 'Creating…' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editOpen && (
        <div style={S.backdrop} onClick={() => setEditOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={S.modalHead}>
              <span style={S.modalTitle}>Edit Department</span>
              <button style={S.closeBtn} className="vt-close" onClick={() => setEditOpen(false)}><CloseIcon /></button>
            </div>
            <div style={{ paddingBottom: 20 }}>
              <Field label="Department Name" error={editError}>
                <input
                  style={S.input}
                  placeholder="Enter department name"
                  value={editName}
                  autoFocus
                  onChange={e => { setEditName(e.target.value); setEditError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleEdit()}
                  className="vt-input"
                />
              </Field>
              <button
                style={{ ...S.btnSave, width: '100%', marginTop: 6, opacity: editLoading ? 0.7 : 1 }}
                onClick={handleEdit}
                disabled={editLoading}
              >
                {editLoading ? 'Updating…' : 'Update Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      <ConfirmModal
        open={deleteModal.open}
        icon={<DangerIcon />}
        title="Delete Department"
        message={`Permanently delete "${deleteModal.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmClass="danger"
        loading={deleteModal.loading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(m => ({ ...m, open: false }))}
      />

      {/* ── ALERT ── */}
      <AlertModal
        open={alertModal.open}
        icon={alertModal.success ? <OkIcon /> : <DangerIcon />}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal(a => ({ ...a, open: false }))}
      />

      {/* ── TOAST ── */}
      <div
        className={`vt-toast${toast.show ? ' show' : ''}`}
        style={{ background: toast.type === 'error' ? '#7f1d1d' : '#095959' }}
      >
        <span style={{ marginRight: 8, display: 'inline-flex' }}>
          {toast.type === 'error' ? <DotErr /> : <DotOk />}
        </span>
        {toast.msg}
      </div>
    </div>
  );
}

// ─── DEPARTMENT CARD ──────────────────────────────────────────────────────────
function DepartmentCard({ team, index, onEdit, onDelete }) {
  const [expanded, setExpanded] = React.useState(false); // 🟢 State for expand

  const createdDate = team.created_at
    ? new Date(team.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div 
      style={S.card} 
      className="vt-card" 
      onClick={() => setExpanded(!expanded)} // 🟢 Toggle on click
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: expanded ? 12 : 0 }}>
        <div style={S.deptIcon}><BuildingIcon /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.cardName}>{team.name}</div>
          {expanded && <div style={S.cardSub}>Created {createdDate}</div>}
        </div>
        
        {/* 🟢 Chevron icon like ViewMember */}
        <span style={{ 
          color: '#0F8989', 
          transition: 'transform 0.22s', 
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'flex' 
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {/* Actions - Only visible when expanded */}
      {expanded && (
        <div style={S.cardActions} onClick={e => e.stopPropagation()}>
          <button style={{ ...S.actionBtn, background: 'rgba(255,208,0,0.15)', color: '#FFD000' }} onClick={onEdit}>
             <PencilIcon size={14} /> <span style={{marginLeft:6}}>Edit</span>
          </button>
          <button style={{ ...S.actionBtn, background: 'rgba(231,76,60,0.15)', color: '#e74c3c' }} onClick={onDelete}>
             <TrashIcon size={14} /> <span style={{marginLeft:6}}>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100%',
    background: '#3C3A3A',
    fontFamily: "Arial, sans-serif",
    paddingBottom: 100,
  },
  header: {
    background: '#2E2D2D',
    padding: '20px 18px 16px',
    borderBottom: '1px solid rgba(15,137,137,0.3)',
  },
  headerInner: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    margin: 0, fontSize: 20, fontWeight: 800,
    color: '#CDF4F4',
    letterSpacing: -0.3,
        marginTop: 5,

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

  backBtn: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'rgba(15,137,137,0.15)',
    border: '1px solid rgba(15,137,137,0.35)',
    color: '#14b8a6', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, flexShrink: 0,
  },
  addBtn: {
    display: 'flex', alignItems: 'center',
    background: '#0F8989',
    color: '#fff',
    border: 'none', borderRadius: 24,
    padding: '9px 18px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: "Arial, sans-serif",
    boxShadow: '0 4px 16px rgba(15,137,137,0.3)',
    letterSpacing: 0.3,
    whiteSpace: 'nowrap',
  },
  navPill: {
    background: 'rgba(15,137,137,0.12)',
    border: '1px solid rgba(15,137,137,0.25)',
    color: '#14b8a6',
    borderRadius: 20,
    padding: '6px 16px',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: "Arial, sans-serif",
    letterSpacing: 0.3,
  },
  navPillActive: {
    background: 'rgba(15,137,137,0.3)',
    border: '1px solid rgba(15,137,137,0.6)',
    color: '#CDF4F4',
    borderRadius: 20,
    padding: '6px 16px',
    fontSize: 12, fontWeight: 700, cursor: 'default',
    whiteSpace: 'nowrap',
    fontFamily: "Arial, sans-serif",
    letterSpacing: 0.3,
  },
  searchWrap: { position: 'relative', marginBottom: 4 },
  searchIcon: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: '#0F8989', pointerEvents: 'none',
  },
  searchInput: {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px 11px 42px',
    background: '#3C3A3A',
    border: '1.5px solid rgba(15,137,137,0.3)',
    borderRadius: 24,
    color: '#eee', fontSize: 13,
    fontFamily: "Arial, sans-serif",
    outline: 'none',
  },

  body: { padding: '16px 14px', maxWidth: 960, margin: '0 auto' },
  empty: { textAlign: 'center', padding: '60px 20px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
  },

card: {
    background: '#444',
    borderLeft: '4px solid rgba(15,137,137,0.5)',
    borderRadius: 8,
    padding: '14px 16px',
    transition: 'transform 0.15s, box-shadow 0.15s',
    cursor: 'pointer', // 👈 Pointer cursor
  },
  deptIcon: {
    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
    background: 'linear-gradient(135deg, #095959 0%, #0F8989 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#b2f0f0',
  },
  cardName: {
    fontSize: 14, fontWeight: 700, color: '#fff',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    textAlign: 'left',
  },
  cardSub: {
    fontSize: 11, color: '#aaa', marginTop: 2,textAlign: 'left',
  },
  indexBadge: {
    background: 'rgba(15,137,137,0.18)',
    border: '1px solid rgba(15,137,137,0.35)',
    color: '#14b8a6',
    borderRadius: 20, padding: '3px 10px',
    fontSize: 11, fontWeight: 700, flexShrink: 0,
  },
 cardActions: {
    display: 'flex', 
    alignItems: 'center', 
    gap: 8,
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: 12,
    marginTop: 12, // 👈 Space from content
  },
  actionBtn: { // 👈 Naya style buttons ke liye
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 0',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "Arial, sans-serif",
  },
  iconBtn: {
    width: 34, height: 34,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },

  // Modal
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 1300,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    animation: 'vtFade 0.15s ease',
  },
  modal: {
    width: '100%', maxWidth: 560,
    background: '#2E2D2D',
    borderRadius: '22px 22px 0 0',
    padding: '0 18px 24px',
    maxHeight: '88dvh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    border: '1px solid rgba(15,137,137,0.2)',
    borderBottom: 'none',
    boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
    animation: 'vtSlide 0.24s cubic-bezier(.22,.68,0,1.18)',
  },
  modalPill: {
    width: 40, height: 4,
    background: 'rgba(15,137,137,0.4)',
    borderRadius: 4, margin: '12px auto 0',
  },
  modalHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 0 14px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16, fontWeight: 800, color: '#CDF4F4', letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#aaa', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  },

  label: {
    display: 'block',
    fontSize: 10.5, fontWeight: 800,
    color: '#14b8a6',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 5, marginTop: 14,
    textAlign: 'left',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px',
    background: '#3C3A3A',
    border: '1.5px solid rgba(15,137,137,0.3)',
    borderRadius: 8, fontSize: 14,
    fontFamily: "Arial, sans-serif",
    color: '#eee', outline: 'none',
    transition: 'border-color 0.18s',
  },
  errText: {
    fontSize: 11, color: '#ef4444', marginTop: 5, fontWeight: 600,
  },
  btn: {
    padding: '12px 20px',
    border: 'none', borderRadius: 12,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    fontFamily: "Arial, sans-serif",
    transition: 'opacity 0.15s',
    letterSpacing: 0.3,
    flex: 1,
  },
  btnSave: {
    padding: '13px',
    background: '#0F8989',
    border: 'none', borderRadius: 12,
    color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: "Arial, sans-serif",
    boxShadow: '0 4px 16px rgba(15,137,137,0.3)',
    transition: 'opacity 0.15s',
  },
  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(15,137,137,0.2)',
    borderTop: '3px solid #0F8989',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'vtSpin 0.7s linear infinite',
  },
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes vtSpin  { to { transform: rotate(360deg); } }
  @keyframes vtSlide { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes vtFade  { from { opacity: 0; } to { opacity: 1; } }

  .vt-add-btn:hover   { opacity: 0.88; transform: scale(1.04); }
  .vt-add-btn:active  { transform: scale(0.97); }
  .vt-nav-pill:hover  { background: rgba(15,137,137,0.22) !important; }
  .vt-back-btn:hover  { background: rgba(15,137,137,0.25) !important; }
  .vt-search:focus    { border-color: #0F8989 !important; box-shadow: 0 0 0 3px rgba(15,137,137,0.12) !important; }
  .vt-card:hover      { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(0,0,0,0.4) !important; }
  .vt-icon-btn:hover  { background: rgba(255,255,255,0.15) !important; }
  .vt-close:hover     { background: rgba(15,137,137,0.15) !important; }

  input:focus, select:focus { border-color: #0F8989 !important; box-shadow: none !important; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #2E2D2D; }
  ::-webkit-scrollbar-thumb { background: #0F8989; border-radius: 10px; }

  .vt-toast {
    position: fixed;
    bottom: -80px; left: 50%;
    transform: translateX(-50%);
    color: #e2e8f0;
    padding: 11px 22px;
    border-radius: 32px;
    font-size: 13px; font-weight: 600;
    font-family: Arial, sans-serif;
    box-shadow: 0 6px 28px rgba(0,0,0,0.4);
    z-index: 9999;
    white-space: nowrap;
    display: flex; align-items: center;
    transition: bottom 0.32s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease;
    opacity: 0; pointer-events: none;
    max-width: calc(100vw - 40px);
    border: 1px solid rgba(15,137,137,0.25);
    letter-spacing: 0.2px;
  }
  .vt-toast.show { bottom: 28px; opacity: 1; }

  @media (min-width: 600px) {
    .vt-toast.show { bottom: 36px; }
  }

  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .vt-toast.show { bottom: calc(28px + env(safe-area-inset-bottom)); }
  }
`;