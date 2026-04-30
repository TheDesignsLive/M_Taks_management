// ViewRoles.jsx
import React, { useState, useEffect, useCallback } from 'react';



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
const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f39c12" strokeWidth="2" width="36" height="36">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const DangerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" width="36" height="36">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const OkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.5" width="36" height="36">
    <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
  </svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const DotOk = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" width="14" height="14">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const DotErr = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── CONTROL TYPE COLORS ─────────────────────────────────────────────────────
const CONTROL_COLORS = {
  OWNER:   { bg: 'rgba(255,208,0,0.15)',   border: 'rgba(255,208,0,0.4)',   color: '#FFD000' },
  ADMIN:   { bg: 'rgba(231,76,60,0.15)',   border: 'rgba(231,76,60,0.4)',   color: '#e74c3c' },
  PARTIAL: { bg: 'rgba(15,137,137,0.18)',  border: 'rgba(15,137,137,0.4)', color: '#14b8a6' },
  NONE:    { bg: 'rgba(170,170,170,0.12)', border: 'rgba(170,170,170,0.3)', color: '#aaa'   },
};
function controlStyle(type) {
  return CONTROL_COLORS[type] || CONTROL_COLORS.NONE;
}

// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
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

// ─── ALERT MODAL ─────────────────────────────────────────────────────────────
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

// ─── FORM FIELD ──────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={S.label}>{label}</label>}
      {children}
      {error && <div style={S.errText}>{error}</div>}
    </div>
  );
}

function Input({ style: extra, ...props }) {
  return <input style={{ ...S.input, ...extra }} {...props} />;
}

function SelectField({ children, style: extra, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <select style={{ ...S.input, appearance: 'none', WebkitAppearance: 'none', paddingRight: 36, ...extra }} {...props}>
        {children}
      </select>
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#0F8989' }}>
        <ChevronIcon />
      </span>
    </div>
  );
}

// ─── PERMISSIONS GUIDE ───────────────────────────────────────────────────────
function PermissionsGuide() {
  return (
    <div style={S.permGuide}>
      <div style={S.permTitle}>Control Type Guide</div>
      {[
        { type: 'OWNER', desc: 'Full system access. Can manage everything including other admins.' },
        { type: 'ADMIN', desc: 'High-level access. Can manage members, roles, and admin tasks.' },
        { type: 'PARTIAL', desc: 'Supervisor access. Can view all team tasks but cannot add or remove members.' },
        { type: 'NONE', desc: 'Standard User. Access limited to personal tasks and platform usage.' },
      ].map(({ type, desc }) => {
        const cs = controlStyle(type);
        return (
          <div key={type} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
            <span style={{ ...S.controlBadge, background: cs.bg, border: `1px solid ${cs.border}`, color: cs.color, flexShrink: 0, marginTop: 1 }}>{type}</span>
            <span style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{desc}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ViewRoles({ onBack, onChangeToDept }) {
  const [data, setData] = useState({ roles: [], teams: [], sessionRole: '' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('name');
  const { toast, showToast } = useToast();
  

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ role_name: '', control_type: '', team_id: '' });
  const [addErrors, setAddErrors] = useState({});
  const [addLoading, setAddLoading] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ role_name: '', control_type: '', team_id: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deleteModal, setDeleteModal] = useState({ open: false, roleId: null, name: '', loading: false });

  // Alert modal
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', success: true });

  const showAlert = (title, message, success = true) => setAlertModal({ open: true, title, message, success });

  // ── FETCH ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/roles`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        showToast(json.message || 'Failed to load roles', 'error');
      }
    } catch (err) {
      showToast('Network error. Could not load roles.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── FILTER ───────────────────────────────────────────────────────────────
  const filtered = data.roles.filter(r => {
    const q = search.toLowerCase();
    if (!q) return true;
    if (filterType === 'name')    return r.role_name?.toLowerCase().includes(q);
    if (filterType === 'team')    return (r.team_name || 'no department').toLowerCase().includes(q);
    if (filterType === 'control') return r.control_type?.toLowerCase().includes(q);
    return true;
  });

  // ── VALIDATE ─────────────────────────────────────────────────────────────
  function validateAdd() {
    const errs = {};
    if (!addForm.role_name.trim()) errs.role_name = 'Role name is required.';
    if (!addForm.control_type)     errs.control_type = 'Select a control type.';
    return errs;
  }
  function validateEdit() {
    const errs = {};
    if (!editForm.role_name.trim()) errs.role_name = 'Role name is required.';
    if (!editForm.control_type)     errs.control_type = 'Select a control type.';
    return errs;
  }

  // ── ADD SUBMIT ────────────────────────────────────────────────────────────
  async function handleAddSubmit() {
    const errs = validateAdd();
    setAddErrors(errs);
    if (Object.keys(errs).length) return;
    setAddLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/roles/add`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, team_id: addForm.team_id || null }),
      });
      const json = await res.json();
      if (json.success) {
        setAddOpen(false);
        resetAdd();
        showAlert('Role Created!', json.message, true);
        fetchData();
      } else {
        showToast(json.message, 'error');
      }
    } catch { showToast('Server error.', 'error'); }
    setAddLoading(false);
  }

  // ── EDIT SUBMIT ───────────────────────────────────────────────────────────
  async function handleEditSubmit() {
    const errs = validateEdit();
    setEditErrors(errs);
    if (Object.keys(errs).length) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/roles/edit/${editId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, team_id: editForm.team_id || null }),
      });
      const json = await res.json();
      if (json.success) {
        setEditOpen(false);
        resetEdit();
        showAlert('Role Updated!', json.message, true);
        fetchData();
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
      const res = await fetch(`${BASE_URL}/api/roles/delete/${deleteModal.roleId}`, { credentials: 'include' });
      const json = await res.json();
      setDeleteModal(m => ({ ...m, open: false, loading: false }));
      if (json.success) {
        showAlert('Deleted!', json.message, true);
        fetchData();
      } else {
        showToast(json.message, 'error');
      }
    } catch {
      setDeleteModal(m => ({ ...m, loading: false }));
      showToast('Server error.', 'error');
    }
  }

  // ── RESET ────────────────────────────────────────────────────────────────
  function resetAdd()  { setAddForm({ role_name: '', control_type: '', team_id: '' }); setAddErrors({}); }
  function resetEdit() { setEditForm({ role_name: '', control_type: '', team_id: '' }); setEditErrors({}); }

  function openEdit(role) {
    setEditId(role.id);
    setEditForm({
      role_name:    role.role_name   || '',
      control_type: role.control_type || '',
      team_id:      role.team_id ? String(role.team_id) : '',
    });
    setEditErrors({});
    setEditOpen(true);
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <style>{CSS}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={S.spinner} />
          <p style={{ color: '#14b8a6', marginTop: 16, fontFamily: "Arial, sans-serif", fontSize: 13 }}>Loading roles…</p>
        </div>
      </div>
    );
  }

 

  const isAdminLike = data.sessionRole === 'admin' || data.sessionRole === 'owner';

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onBack && (
              <button style={S.backBtn} className="vr-back-btn" onClick={onBack}>
                <BackIcon />
              </button>
            )}
            <div>
              <div style={S.headerTitle}>Roles</div>
              <div style={S.headerSub}>{data.roles.length} total roles</div>
            </div>
          </div>
          <div style={S.statsRow}>
            <div style={S.statPill}>
              <span style={S.statNum}>{data.roles.length}</span>
              <span style={S.statLbl}>Total</span>
            </div>
            <div style={{ ...S.statPill, background: 'rgba(15,137,137,0.2)', border: '1px solid rgba(15,137,137,0.4)' }}>
              <span style={{ ...S.statNum, color: '#14b8a6' }}>{data.teams.length}</span>
              <span style={S.statLbl}>Depts</span>
            </div>
          </div>
        </div>

        {/* Nav pills + Add button row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
     <button style={S.navPill} className="vr-nav-pill" onClick={() => onBack && onBack()} title="Members">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
</button>
{onChangeToDept && (
  <button style={S.navPill} className="vr-nav-pill" onClick={() => onChangeToDept()} title="Departments">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="16" width="6" height="4" rx="1"/><rect x="17" y="16" width="6" height="4" rx="1"/><path d="M12 5v4M12 9h-8v7M12 9h8v7"/></svg>
  </button>
)}
<button style={S.navPillActive} className="vr-nav-pill-active" title="Roles">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
</button>
          </div>
          {isAdminLike && (
            <button style={S.addBtn} className="vr-add-btn" onClick={() => { resetAdd(); setAddOpen(true); }}>
              <PlusIcon />
              <span style={{ marginLeft: 6 }}>Add</span>
            </button>
          )}
        </div>

        {/* Search + Filter row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={S.filterSelect}
              className="vr-filter-select"
            >
              <option value="name">By Name</option>
              <option value="team">By Dept</option>
              <option value="control">By Control</option>
            </select>
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#fff' }}>
              <ChevronIcon />
            </span>
          </div>
          <div style={{ ...S.searchWrap, flex: 1, marginBottom: 0 }}>
            <span style={S.searchIcon}><SearchIcon /></span>
            <input
              style={S.searchInput}
              placeholder="Search roles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="vr-search"
            />
          </div>
        </div>
      </div>

      {/* ── ROLE CARDS ── */}
      <div style={S.body}>
        {filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#aaa', marginBottom: 6 }}>
              {search ? 'No roles match your search.' : 'No roles found.'}
            </div>
            <div style={{ fontSize: 13, color: '#777' }}>Roles you create will appear here</div>
          </div>
        ) : (
          <div style={S.grid}>
            {filtered.map(role => (
              <RoleCard
                key={role.id}
                role={role}
                isAdminLike={isAdminLike}
                onEdit={() => openEdit(role)}
                onDelete={() => setDeleteModal({ open: true, roleId: role.id, name: role.role_name, loading: false })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── ADD ROLE MODAL ── */}
      {addOpen && (
        <div style={S.backdrop} onClick={() => setAddOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={S.modalHead}>
              <span style={S.modalTitle}>Add Role</span>
              <button style={S.closeBtn} className="vr-close" onClick={() => setAddOpen(false)}><CloseIcon /></button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(88dvh - 80px)', paddingBottom: 20 }}>
              <Field label="Role Name" error={addErrors.role_name}>
                <Input
                  placeholder="Enter role name"
                  value={addForm.role_name}
                  onChange={e => setAddForm(f => ({ ...f, role_name: e.target.value }))}
                />
              </Field>

              <Field label="Control Type" error={addErrors.control_type}>
                <SelectField
                  value={addForm.control_type}
                  onChange={e => setAddForm(f => ({ ...f, control_type: e.target.value }))}
                >
                  <option value="" disabled>Select Control Type</option>
                  <option value="OWNER">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="NONE">NONE</option>
                </SelectField>
              </Field>

              <Field label="Assign Department (Optional)">
                <SelectField
                  value={addForm.team_id}
                  onChange={e => setAddForm(f => ({ ...f, team_id: e.target.value }))}
                >
                  <option value="">No Department</option>
                  {data.teams.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </SelectField>
              </Field>

              <button
                style={{ ...S.btnSave, width: '100%', opacity: addLoading ? 0.7 : 1, marginTop: 4 }}
                onClick={handleAddSubmit}
                disabled={addLoading}
              >
                {addLoading ? 'Creating…' : 'Create Role'}
              </button>

              <PermissionsGuide />
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ROLE MODAL ── */}
      {editOpen && (
        <div style={S.backdrop} onClick={() => setEditOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={S.modalHead}>
              <span style={S.modalTitle}>Edit Role</span>
              <button style={S.closeBtn} className="vr-close" onClick={() => setEditOpen(false)}><CloseIcon /></button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(88dvh - 80px)', paddingBottom: 20 }}>
              <Field label="Role Name" error={editErrors.role_name}>
                <Input
                  placeholder="Enter role name"
                  value={editForm.role_name}
                  onChange={e => setEditForm(f => ({ ...f, role_name: e.target.value }))}
                />
              </Field>

              <Field label="Control Type" error={editErrors.control_type}>
                <SelectField
                  value={editForm.control_type}
                  onChange={e => setEditForm(f => ({ ...f, control_type: e.target.value }))}
                >
                  <option value="" disabled>Select Control Type</option>
                  <option value="OWNER">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="NONE">NONE</option>
                </SelectField>
              </Field>

              <Field label="Assign Department (Optional)">
                <SelectField
                  value={editForm.team_id}
                  onChange={e => setEditForm(f => ({ ...f, team_id: e.target.value }))}
                >
                  <option value="">No Department</option>
                  {data.teams.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </SelectField>
              </Field>

              <button
                style={{ ...S.btnSave, width: '100%', opacity: editLoading ? 0.7 : 1, marginTop: 4 }}
                onClick={handleEditSubmit}
                disabled={editLoading}
              >
                {editLoading ? 'Updating…' : 'Update Role'}
              </button>

              <PermissionsGuide />
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      <ConfirmModal
        open={deleteModal.open}
        icon={<DangerIcon />}
        title="Delete Role"
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
        className={`vr-toast${toast.show ? ' show' : ''}`}
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

// ─── ROLE CARD ────────────────────────────────────────────────────────────────
function RoleCard({ role, isAdminLike, onEdit, onDelete }) {
  const cs = controlStyle(role.control_type);
  const hasDept = role.team_name && role.team_name !== 'No Department';

  return (
    <div style={S.card} className="vr-card">
      {/* Top row: shield icon + name + control badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={S.roleIcon}>
          <ShieldIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.cardName}>{role.role_name}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
            {hasDept ? role.team_name : 'No Department'}
          </div>
        </div>
        <span style={{ ...S.controlBadge, background: cs.bg, border: `1px solid ${cs.border}`, color: cs.color, flexShrink: 0 }}>
          {role.control_type}
        </span>
      </div>

      {/* Created date */}
      <div style={S.cardMeta}>
        <span style={S.metaChip}>
          {hasDept ? role.team_name : 'No Department'}
        </span>
        <span style={{ fontSize: 11, color: '#666' }}>
          {new Date(role.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Actions — only for admin/owner */}
      {isAdminLike && (
        <div style={S.cardActions}>
          <button style={{ ...S.iconBtn, color: '#FFD000', flex: 1, gap: 6, fontSize: 12, fontWeight: 700 }}
            className="vr-icon-btn" onClick={onEdit}>
            <PencilIcon size={13} />
            <span>Edit</span>
          </button>
          <button style={{ ...S.iconBtn, color: '#e74c3c', flex: 1, gap: 6, fontSize: 12, fontWeight: 700 }}
            className="vr-icon-btn" onClick={onDelete}>
            <TrashIcon size={13} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
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
    border: '1px solid rgba(15,137,137,0.3)',
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
  filterSelect: {
    padding: '10px 32px 10px 14px',
    background: '#0F8989',
    border: 'none',
    borderRadius: 24,
    color: '#fff',
    fontSize: 12, fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    fontFamily: "Arial, sans-serif",
  },
  searchWrap: {
    position: 'relative',
    marginBottom: 4,
  },
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
    color: '#eee',
    fontSize: 13,
    fontFamily: "Arial, sans-serif",
    outline: 'none',
  },

  body: { padding: '16px 14px', maxWidth: 960, margin: '0 auto' },
  empty: { textAlign: 'center', padding: '60px 20px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 12,
  },

  card: {
    background: '#444',
    border: '1px solid rgba(255,255,255,0.06)',
    borderLeft: '4px solid rgba(15,137,137,0.5)',
    borderRadius: 8,
    padding: '14px 16px',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  roleIcon: {
    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, #095959 0%, #0F8989 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#b2f0f0',
  },
  cardName: {
    fontSize: 14, fontWeight: 700, color: '#fff',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  controlBadge: {
    borderRadius: 20, padding: '3px 10px',
    fontSize: 10, fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardMeta: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaChip: {
    background: 'rgba(15,137,137,0.18)',
    border: '1px solid rgba(15,137,137,0.35)',
    color: '#14b8a6',
    borderRadius: 20, padding: '3px 12px',
    fontSize: 11, fontWeight: 700,
    maxWidth: '65%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cardActions: {
    display: 'flex', alignItems: 'center', gap: 8,
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  iconBtn: {
    height: 34,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
    fontFamily: "Arial, sans-serif",
    padding: '0 10px',
  },

  // Modal
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 1300,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    animation: 'vrFade 0.15s ease',
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
    animation: 'vrSlide 0.24s cubic-bezier(.22,.68,0,1.18)',
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
    fontSize: 16, fontWeight: 800,
    color: '#CDF4F4',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#aaa', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  },

  // Form
  label: {
    display: 'block',
    fontSize: 10.5, fontWeight: 800,
    color: '#14b8a6',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 5, marginTop: 14,
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

  // Permissions guide
  permGuide: {
    marginTop: 20, paddingTop: 16,
    borderTop: '1px dashed rgba(15,137,137,0.25)',
  },
  permTitle: {
    fontSize: 11, fontWeight: 800, color: '#14b8a6',
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 12,
  },

  // Spinner
  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(15,137,137,0.2)',
    borderTop: '3px solid #0F8989',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'vrSpin 0.7s linear infinite',
  },
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes vrSpin  { to { transform: rotate(360deg); } }
  @keyframes vrSlide { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes vrFade  { from { opacity: 0; } to { opacity: 1; } }

  .vr-add-btn:hover   { opacity: 0.88; transform: scale(1.04); }
  .vr-add-btn:active  { transform: scale(0.97); }
  .vr-back-btn:hover  { background: rgba(15,137,137,0.25) !important; }
  .vr-nav-pill:hover  { background: rgba(15,137,137,0.22) !important; }
  .vr-search:focus    { border-color: #0F8989 !important; box-shadow: 0 0 0 3px rgba(15,137,137,0.12) !important; }
  .vr-card:hover      { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(0,0,0,0.4) !important; }
  .vr-icon-btn:hover  { background: rgba(255,255,255,0.15) !important; }
  .vr-close:hover     { background: rgba(15,137,137,0.15) !important; }
  .vr-filter-select:hover { background: #0c7575 !important; }

input:focus, select:focus { border-color: #0F8989 !important; box-shadow: none !important; }
  select option { background: #2E2D2D; color: #eee; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #2E2D2D; }
  ::-webkit-scrollbar-thumb { background: #0F8989; border-radius: 10px; }

  .vr-toast {
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
  .vr-toast.show { bottom: 28px; opacity: 1; }

  @media (min-width: 600px) {
    .vr-toast.show { bottom: 36px; }
  }

  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .vr-toast.show { bottom: calc(28px + env(safe-area-inset-bottom)); }
  }

  @media (max-width: 400px) {
    .vr-filter-select { font-size: 11px !important; padding: 8px 28px 8px 10px !important; }
  }
`;