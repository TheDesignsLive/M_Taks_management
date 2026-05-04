// view_member.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ViewTeams from './view_teams';

import ViewRoles from './ViewRoles'

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

// ─── AVATAR ──────────────────────────────────────────────────────────────────
function Avatar({ profilePic, name, size = 40 }) {
  const [err, setErr] = useState(false);
  const letter = name ? name.charAt(0).toUpperCase() : '?';
  if (profilePic && !err) {
    return (
      <img
        src={`${BASE_URL}/public/images/${profilePic}`}
        alt={name}
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #095959 0%, #0F8989 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#b2f0f0',
      fontFamily: "Arial, sans-serif",
    }}>
      {letter}
    </div>
  );
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
const EyeIcon = ({ open }) => open
  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
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
const CamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="12" height="12">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
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

function Select({ children, style: extra, value, onChange, disabled, ...props }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Extract option data from children
  const options = React.Children.toArray(children).map(child => ({
    value: child.props.value,
    label: child.props.children,
    disabled: child.props.disabled,
  }));

  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  function pick(val) {
    if (disabled) return;
    onChange({ target: { value: val } });
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', ...extra }}>
      {/* Trigger */}
      <div
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        style={{
          ...S.input,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          opacity: disabled ? 0.5 : 1,
          border: `1.5px solid ${open ? '#0F8989' : 'rgba(15,137,137,0.3)'}`,
          boxShadow: open ? '0 0 0 3px rgba(15,137,137,0.12)' : 'none',
          transition: 'border-color 0.18s, box-shadow 0.18s',
        }}
      >
        <span style={{ color: selected && !selected.disabled ? '#eee' : '#666', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected && !selected.disabled ? selected.label : options.find(o => o.disabled)?.label || 'Select'}
        </span>
        <span style={{ color: '#0F8989', display: 'inline-flex', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronIcon />
        </span>
      </div>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: 'absolute', left: 0, right: 0, zIndex: 99999,
          marginTop: 4,
          background: '#2E2D2D',
          border: '1px solid rgba(15,137,137,0.35)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {options.filter(o => !o.disabled).map((o, i, arr) => {
            const isActive = String(value) === String(o.value);
            return (
              <SelectOption
                key={o.value}
                label={o.label}
                isActive={isActive}
                isLast={i === arr.length - 1}
                onClick={() => pick(o.value)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectOption({ label, isActive, isLast, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        cursor: 'pointer',
        background: isActive ? 'rgba(15,137,137,0.18)' : hov ? 'rgba(15,137,137,0.08)' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.12s',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: isActive ? 'linear-gradient(135deg, #095959, #0F8989)' : 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#CDF4F4',
      }}>
        {label.charAt(0).toUpperCase()}
      </div>
      <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#CDF4F4' : '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {isActive && (
        <svg viewBox="0 0 24 24" fill="none" stroke="#0F8989" strokeWidth="2.5" width="14" height="14" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder, label }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ ...S.input, paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#0F8989', padding: 0, display: 'flex' }}>
          <EyeIcon open={show} />
        </button>
      </div>
    </Field>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ViewMember() {
  const [data, setData] = useState({ users: [], roles: [], teams: [], sessionRole: '', sessionUserId: null });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast, showToast } = useToast();
  const [showTeams, setShowTeams] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', role_id: '', team_id: '' });
  const [addFile, setAddFile] = useState(null);
  const [addPreview, setAddPreview] = useState(null);
  const [addErrors, setAddErrors] = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const addFileRef = useRef(null);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', role_id: '', team_id: '' });
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const editFileRef = useRef(null);

  // Confirm modals
  const [suspendModal, setSuspendModal] = useState({ open: false, userId: null, name: '', status: '', loading: false });
  const [deleteModal, setDeleteModal] = useState({ open: false, userId: null, name: '', loading: false });

  // Alert modal
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', success: true });

  const showAlert = (title, message, success = true) => setAlertModal({ open: true, title, message, success });

  // ── FETCH DATA ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/view_member`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        showToast(json.message || 'Failed to load members', 'error');
      }
    } catch (err) {
      showToast('Network error. Could not load members.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

 useEffect(() => {
    fetchData();

    // Listen for real-time member updates via Socket.IO
    if (window.io) {
      const socket = window.io(
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:5000'
          : 'https://m-tms.thedesigns.live',
        { withCredentials: true }
      );
      socket.on('update_members', () => fetchData());
      return () => socket.disconnect();
    }
  }, [fetchData]);

  // ── FILTERED USERS ───────────────────────────────────────────────────────
  const filtered = data.users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role_name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── ROLES BY TEAM ────────────────────────────────────────────────────────
  function rolesForTeam(teamId) {
    if (!teamId) return data.roles.filter(r => !r.team_id);
    return data.roles.filter(r => r.team_id == teamId);
  }

  // ── FILE PICK ────────────────────────────────────────────────────────────
  function handleFilePick(file, setFile, setPreview) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.', 'error'); return; }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { showToast('Only image files allowed.', 'error'); return; }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  }

  // ── VALIDATE ─────────────────────────────────────────────────────────────
  const passRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

  function validateAdd() {
    const errs = {};
    if (!addForm.name.trim()) errs.name = 'Name is required.';
    if (!addForm.email.trim()) errs.email = 'Email is required.';
    if (!addForm.team_id) errs.team_id = 'Select a department.';
    if (!addForm.role_id) errs.role_id = 'Select a role.';
    if (addForm.phone && !/^\d{10}$/.test(addForm.phone)) errs.phone = '10-digit phone required.';
    if (!passRegex.test(addForm.password)) errs.password = 'Min 8 chars, 1 upper, 1 lower, 1 number.';
    if (addForm.password !== addForm.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    return errs;
  }

  function validateEdit() {
    const errs = {};
    if (!editForm.name.trim()) errs.name = 'Name is required.';
    if (!editForm.email.trim()) errs.email = 'Email is required.';
    if (!editForm.role_id) errs.role_id = 'Select a role.';
    if (editForm.phone && !/^\d{10}$/.test(editForm.phone)) errs.phone = '10-digit phone required.';
    if (editForm.password && !passRegex.test(editForm.password)) errs.password = 'Min 8 chars, 1 upper, 1 lower, 1 number.';
    if (editForm.password && editForm.password !== editForm.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    return errs;
  }

  // ── ADD SUBMIT ────────────────────────────────────────────────────────────
  async function handleAddSubmit() {
    const errs = validateAdd();
    setAddErrors(errs);
    if (Object.keys(errs).length) return;
    setAddLoading(true);
    try {
      const fd = new FormData();
      Object.entries(addForm).forEach(([k, v]) => { if (k !== 'confirmPassword') fd.append(k, v); });
      if (addFile) fd.append('profile_pic', addFile);
      const res = await fetch(`${BASE_URL}/api/view_member/add`, { method: 'POST', credentials: 'include', body: fd });
      const json = await res.json();
      if (json.success) {
        setAddOpen(false);
        resetAdd();
        showAlert(
          json.isRequest ? 'Request Submitted!' : 'Member Added!',
          json.message,
          true
        );
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
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => { if (k !== 'confirmPassword') fd.append(k, v); });
      if (editFile) fd.append('profile_pic', editFile);
      const res = await fetch(`${BASE_URL}/api/view_member/edit/${editId}`, { method: 'POST', credentials: 'include', body: fd });
      const json = await res.json();
      if (json.success) {
        setEditOpen(false);
        resetEdit();
        showAlert('Member Updated!', json.message, true);
        fetchData();
      } else {
        showToast(json.message, 'error');
      }
    } catch { showToast('Server error.', 'error'); }
    setEditLoading(false);
  }

  // ── SUSPEND ───────────────────────────────────────────────────────────────
  async function confirmSuspend() {
    setSuspendModal(m => ({ ...m, loading: true }));
    try {
      const res = await fetch(`${BASE_URL}/api/view_member/suspend/${suspendModal.userId}`, { credentials: 'include' });
      const json = await res.json();
      setSuspendModal(m => ({ ...m, open: false, loading: false }));
      if (json.success) {
        showAlert('Done!', json.message, true);
        fetchData();
      } else {
        showToast(json.message, 'error');
      }
    } catch {
      setSuspendModal(m => ({ ...m, loading: false }));
      showToast('Server error.', 'error');
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  async function confirmDelete() {
    setDeleteModal(m => ({ ...m, loading: true }));
    try {
      const res = await fetch(`${BASE_URL}/api/view_member/delete/${deleteModal.userId}`, { credentials: 'include' });
      const json = await res.json();
      setDeleteModal(m => ({ ...m, open: false, loading: false }));
      if (json.success) {
        showAlert(
          json.isRequest ? 'Request Submitted!' : 'Deleted!',
          json.message,
          true
        );
        fetchData();
      } else {
        showToast(json.message, 'error');
      }
    } catch {
      setDeleteModal(m => ({ ...m, loading: false }));
      showToast('Server error.', 'error');
    }
  }

  // ── RESET FORMS ───────────────────────────────────────────────────────────
  function resetAdd() {
    setAddForm({ name: '', email: '', phone: '', password: '', confirmPassword: '', role_id: '', team_id: '' });
    setAddFile(null); setAddPreview(null); setAddErrors({});
  }
  function resetEdit() {
    setEditForm({ name: '', email: '', phone: '', password: '', confirmPassword: '', role_id: '', team_id: '' });
    setEditFile(null); setEditPreview(null); setEditErrors({});
  }

  // ── OPEN EDIT ──────────────────────────────────────────────────────────
  function openEdit(user) {
    setEditId(user.id);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      confirmPassword: '',
      role_id: String(user.role_id || ''),
      team_id: String(user.role_team_id || user.team_id || ''),
    });
    setEditFile(null);
    setEditPreview(null);
    setEditErrors({});
    setEditOpen(true);
  }

  // ── LOADING STATE ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <style>{CSS}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={S.spinner} />
          <p style={{ color: '#14b8a6', marginTop: 16, fontFamily: "Arial, sans-serif", fontSize: 13 }}>Loading members…</p>
        </div>
      </div>
    );
  }

  if (showRoles) {
    return (
      <ViewRoles
        onBack={() => setShowRoles(false)}
        onChangeToDept={
          (data.sessionRole === 'admin' || data.sessionRole === 'owner' || data.sessionControlType === 'OWNER')
            ? () => { setShowRoles(false); setShowTeams(true); }
            : null
        }
      />
    );
  }

  if (showTeams) {
    return <ViewTeams onBack={() => setShowTeams(false)} />;
  }

  const isAdminLike = data.sessionRole === 'admin' || data.sessionRole === 'owner';
  const hasRoles = data.roles.length > 0;

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div>
            <div style={S.headerTitle}>Members</div>
            <div style={S.headerSub}>{data.users.length} total members</div>
          </div>
          <div style={S.statsRow}>
            <div style={S.statPill}>
              <span style={S.statNum}>{data.users.length}</span>
              <span style={S.statLbl}>Total</span>
            </div>
            <div style={{ ...S.statPill, background: 'rgba(15,137,137,0.2)', border: '1px solid rgba(15,137,137,0.4)' }}>
              <span style={{ ...S.statNum, color: '#14b8a6' }}>{data.users.filter(u => u.status === 'ACTIVE').length}</span>
              <span style={S.statLbl}>Active</span>
            </div>
          </div>
        </div>

        {/* Nav pills + Add button row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {/* ✅ MEMBERS (DEFAULT ACTIVE) */}
            <button style={S.navPillActive} className="vt-nav-pill-active" title="Members">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </button>

            {/* Department icon: admin, owner session role, OR user with OWNER control type */}
            {(data.sessionRole === 'admin' || data.sessionRole === 'owner' || data.sessionControlType === 'OWNER') && (
              <button style={S.navPill} className="vm-nav-pill" onClick={() => setShowTeams(true)} title="Departments">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><rect x="9" y="1" width="6" height="4" rx="1"/><rect x="1" y="16" width="6" height="4" rx="1"/><rect x="17" y="16" width="6" height="4" rx="1"/><path d="M12 5v4M12 9h-8v7M12 9h8v7"/></svg>
              </button>
            )}
            {/* Roles icon: always visible for everyone */}
            <button style={S.navPill} className="vm-nav-pill" onClick={() => setShowRoles(true)} title="Roles">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </button>
          </div>
          <button style={S.addBtn} className="vm-add-btn" onClick={() => { resetAdd(); setAddOpen(true); }}>
            <PlusIcon />
            <span style={{ marginLeft: 6 }}>Add</span>
          </button>
        </div>

        {/* Search */}
        <div style={S.searchWrap}>
          <span style={S.searchIcon}><SearchIcon /></span>
          <input
            style={S.searchInput}
            placeholder="Search by name, email or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="vm-search"
          />
        </div>
      </div>

      {/* ── MEMBER CARDS ── */}
      <div style={S.body}>
        {filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#aaa', marginBottom: 6 }}>
              {search ? 'No members match your search.' : 'No members found.'}
            </div>
            <div style={{ fontSize: 13, color: '#777' }}>Members you add will appear here</div>
          </div>
        ) : (
          <div style={S.grid}>
            {filtered.map((user, i) => (
              <MemberCard
                key={user.id}
                user={user}
                index={i}
                sessionRole={data.sessionRole}
                sessionUserId={data.sessionUserId}
                onEdit={() => openEdit(user)}
                onSuspend={() => setSuspendModal({ open: true, userId: user.id, name: user.name, status: user.status, loading: false })}
                onDelete={() => setDeleteModal({ open: true, userId: user.id, name: user.name, loading: false })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── ADD MEMBER MODAL ── */}
      {addOpen && (
        <div style={S.backdrop} onClick={() => setAddOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={S.modalHead}>
              <span style={S.modalTitle}>Add Member</span>
              <button style={S.closeBtn} className="vm-close" onClick={() => setAddOpen(false)}><CloseIcon /></button>
            </div>
<div style={{ overflowY: 'auto', flex: 1, paddingBottom: 20, paddingLeft: 18, paddingRight: 18 }}>
              {!hasRoles ? (
                <div style={{ textAlign: 'center', padding: '30px 16px' }}>
                  <div style={{ marginBottom: 14 }}><AlertIcon /></div>
                  <div style={{ color: '#CDF4F4', fontWeight: 700, marginBottom: 8 }}>No Roles Found</div>
                  <div style={{ color: '#aaa', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                    Please create a role in the Roles Panel before adding a member.
                  </div>
                  <button style={{ ...S.btn, background: '#0F8989', color: '#fff' }} onClick={() => window.location.href = '/view-roles'}>
                    Go to Roles Panel
                  </button>
                </div>
              ) : (
                <>
                  {/* Avatar picker */}
                  <div style={S.avatarEditRow}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      {addPreview
                        ? <img src={addPreview} alt="preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #0F8989' }} />
                        : <Avatar name={addForm.name || 'M'} size={64} />
                      }
                      <button style={S.camBtn} onClick={() => addFileRef.current?.click()} type="button"><CamIcon /></button>
                    </div>
                    <div style={{ marginLeft: 14 }}>
                      <div style={{ fontSize: 13, color: '#aaa' }}>Tap to set profile picture</div>
                      <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>JPG, PNG, GIF, WEBP · Max 5MB</div>
                    </div>
                  </div>
                  <input ref={addFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleFilePick(e.target.files[0], setAddFile, setAddPreview)} />

                  <Field label="Department" error={addErrors.team_id}>
                    <Select value={addForm.team_id}
                      onChange={e => setAddForm(f => ({ ...f, team_id: e.target.value, role_id: '' }))}>
                      <option value="" disabled>Select Department</option>
                      {data.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  </Field>

                  <Field label="Role" error={addErrors.role_id}>
                    <Select value={addForm.role_id}
                      onChange={e => setAddForm(f => ({ ...f, role_id: e.target.value }))}
                      disabled={!addForm.team_id}>
                      <option value="" disabled>Select Role</option>
                      {rolesForTeam(addForm.team_id).map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                    </Select>
                  </Field>

                  <Field label="Full Name" error={addErrors.name}>
                    <Input placeholder="Full name" value={addForm.name}
                      onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
                  </Field>

                  <Field label="Email" error={addErrors.email}>
                    <Input type="email" placeholder="Email address" value={addForm.email}
                      onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
                  </Field>

                  <Field label="Phone (optional)" error={addErrors.phone}>
                    <Input placeholder="10-digit number" value={addForm.phone} inputMode="numeric"
                      onChange={e => setAddForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} maxLength={10} />
                  </Field>

                  <PasswordInput
                    label="Password"
                    value={addForm.password}
                    onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min 8 chars, upper, lower, number"
                  />
                  {addErrors.password && <div style={{ ...S.errText, marginTop: -10, marginBottom: 14 }}>{addErrors.password}</div>}

                  <PasswordInput
                    label="Confirm Password"
                    value={addForm.confirmPassword}
                    onChange={e => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat password"
                  />
                  {addErrors.confirmPassword && <div style={{ ...S.errText, marginTop: -10, marginBottom: 14 }}>{addErrors.confirmPassword}</div>}

                  <button style={{ ...S.btnSave, width: '100%', opacity: addLoading ? 0.7 : 1 }}
                    onClick={handleAddSubmit} disabled={addLoading}>
                    {addLoading ? 'Adding…' : 'Add Member'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MEMBER MODAL ── */}
      {editOpen && (
        <div style={S.backdrop} onClick={() => setEditOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={S.modalHead}>
              <span style={S.modalTitle}>Edit Member</span>
              <button style={S.closeBtn} className="vm-close" onClick={() => setEditOpen(false)}><CloseIcon /></button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(88dvh - 80px)', paddingBottom: 20 }}>
              {/* Avatar picker */}
              <div style={S.avatarEditRow}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {editPreview
                    ? <img src={editPreview} alt="preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #0F8989' }} />
                    : <Avatar name={editForm.name || 'M'} size={64} />
                  }
                  <button style={S.camBtn} onClick={() => editFileRef.current?.click()} type="button"><CamIcon /></button>
                </div>
                <div style={{ marginLeft: 14 }}>
                  <div style={{ fontSize: 13, color: '#aaa' }}>Tap to change profile picture</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>JPG, PNG, GIF, WEBP · Max 5MB</div>
                </div>
              </div>
              <input ref={editFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFilePick(e.target.files[0], setEditFile, setEditPreview)} />

              <Field label="Department">
                <Select value={editForm.team_id}
                  onChange={e => setEditForm(f => ({ ...f, team_id: e.target.value, role_id: '' }))}>
                  <option value="" disabled>Select Department</option>
                  {data.teams.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </Select>
              </Field>

              <Field label="Role" error={editErrors.role_id}>
                <Select value={editForm.role_id}
                  onChange={e => setEditForm(f => ({ ...f, role_id: e.target.value }))}>
                  <option value="" disabled>Select Role</option>
                  {rolesForTeam(editForm.team_id).map(r => <option key={r.id} value={String(r.id)}>{r.role_name}</option>)}
                </Select>
              </Field>

              <Field label="Full Name" error={editErrors.name}>
                <Input placeholder="Full name" value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </Field>

              <Field label="Email" error={editErrors.email}>
                <Input type="email" placeholder="Email address" value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </Field>

              <Field label="Phone (optional)" error={editErrors.phone}>
                <Input placeholder="10-digit number" value={editForm.phone} inputMode="numeric"
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} maxLength={10} />
              </Field>

              <PasswordInput
                label="New Password (optional)"
                value={editForm.password}
                onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to keep current"
              />
              {editErrors.password && <div style={{ ...S.errText, marginTop: -10, marginBottom: 14 }}>{editErrors.password}</div>}

              {editForm.password && (
                <>
                  <PasswordInput
                    label="Confirm New Password"
                    value={editForm.confirmPassword}
                    onChange={e => setEditForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                  />
                  {editErrors.confirmPassword && <div style={{ ...S.errText, marginTop: -10, marginBottom: 14 }}>{editErrors.confirmPassword}</div>}
                </>
              )}

              <button style={{ ...S.btnSave, width: '100%', opacity: editLoading ? 0.7 : 1 }}
                onClick={handleEditSubmit} disabled={editLoading}>
                {editLoading ? 'Updating…' : 'Update Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUSPEND CONFIRM ── */}
      <ConfirmModal
        open={suspendModal.open}
        icon={<AlertIcon />}
        title="Confirm Action"
        message={`${suspendModal.status === 'ACTIVE' ? 'Suspend' : 'Activate'} "${suspendModal.name}"?`}
        confirmLabel={suspendModal.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
        confirmClass={suspendModal.status === 'ACTIVE' ? 'danger' : 'success'}
        loading={suspendModal.loading}
        onConfirm={confirmSuspend}
        onCancel={() => setSuspendModal(m => ({ ...m, open: false }))}
      />

      {/* ── DELETE CONFIRM ── */}
      <ConfirmModal
        open={deleteModal.open}
        icon={<DangerIcon />}
        title="Delete Member"
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
        className={`vm-toast${toast.show ? ' show' : ''}`}
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

// ─── MEMBER CARD ─────────────────────────────────────────────────────────────
function MemberCard({ user, index, sessionRole, sessionUserId, onEdit, onSuspend, onDelete }) {
  const isActive = user.status === 'ACTIVE';
  const isSelf = sessionUserId && user.id === sessionUserId;
  // ── Only change: expand state for actions ──
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={S.card}
      className="vm-card"
      onClick={() => setExpanded(v => !v)}
    >
      {/* Top row: avatar + name + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar profilePic={user.profile_pic} name={user.name} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={S.cardName}>{user.name}</span>
            {isSelf && <span style={S.selfBadge}>You</span>}
          </div>
          <div style={S.cardEmail}>{user.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...S.statusDot, background: isActive ? '#2ecc71' : '#e74c3c' }} title={user.status} />
          {/* Chevron indicator */}
          <span style={{
            color: '#0F8989',
            display: 'inline-flex',
            transition: 'transform 0.22s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            <ChevronIcon />
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div style={S.cardMeta}>
        <span style={S.metaChip}>{user.role_name || 'No Role'}</span>
        <span style={{ ...S.statusText, color: isActive ? '#2ecc71' : '#e74c3c' }}>
          {user.status}
        </span>
      </div>

      {/* Actions — only visible when expanded */}
      {expanded && (
        <div
          style={S.cardActions}
          onClick={e => e.stopPropagation()} // prevent card toggle when clicking buttons
        >
          <button
            style={{ ...S.actionBtn, background: isActive ? 'rgba(231,76,60,0.15)' : 'rgba(46,204,113,0.15)', color: isActive ? '#e74c3c' : '#2ecc71' }}
            className="vm-action-btn"
            onClick={onSuspend}
          >
            {isActive ? 'Suspend' : 'Activate'}
          </button>
          <button style={{ ...S.iconBtn, color: '#FFD000' }} className="vm-icon-btn" onClick={onEdit} title="Edit">
            <PencilIcon size={15} />
          </button>
          <button style={{ ...S.iconBtn, color: '#e74c3c' }} className="vm-icon-btn" onClick={onDelete} title="Delete">
            <TrashIcon size={15} />
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
    padding: '8px 14px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "Arial, sans-serif",
  },
  navPillActive: {
    background: 'rgba(15,137,137,0.3)',
    border: '1px solid rgba(15,137,137,0.6)',
    color: '#CDF4F4',
    borderRadius: 20,
    padding: '8px 14px',
    cursor: 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
  },
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
    cursor: 'pointer',
  },
  cardName: {
    fontSize: 14, fontWeight: 700, color: '#fff',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  cardEmail: {
    fontSize: 11, color: '#aaa', marginTop: 2,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left',
  },
  statusDot: {
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
    boxShadow: '0 0 6px currentColor',
  },
  cardMeta: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 0,
  },
  metaChip: {
    background: 'rgba(15,137,137,0.18)',
    border: '1px solid rgba(15,137,137,0.35)',
    color: '#14b8a6',
    borderRadius: 20, padding: '3px 12px',
    fontSize: 11, fontWeight: 700,
    maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  statusText: {
    fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
  },
  selfBadge: {
    background: 'rgba(255,208,0,0.12)',
    color: '#FFD000',
    border: '1px solid rgba(255,208,0,0.3)',
    borderRadius: 10, padding: '2px 8px',
    fontSize: 10, fontWeight: 700,
  },
  cardActions: {
    display: 'flex', alignItems: 'center', gap: 8,
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: 12,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1, padding: '7px 0',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, cursor: 'pointer',
    fontSize: 12, fontWeight: 700,
    fontFamily: "Arial, sans-serif",
    transition: 'opacity 0.15s',
  },
  iconBtn: {
    width: 34, height: 34,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },

  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 1300,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    animation: 'vmFade 0.15s ease',
  },
modal: {
    width: '100%', maxWidth: 560,
    background: '#2E2D2D',
    borderRadius: '22px 22px 0 0',
    padding: '0 0 24px',
    maxHeight: '88dvh',
    overflowY: 'hidden',
    boxSizing: 'border-box',
    border: '1px solid rgba(15,137,137,0.2)',
    borderBottom: 'none',
    boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
    animation: 'vmSlide 0.24s cubic-bezier(.22,.68,0,1.18)',
    display: 'flex',
    flexDirection: 'column',
  },
modalPill: {
    width: 40, height: 4,
    background: 'rgba(15,137,137,0.4)',
    borderRadius: 4, margin: '12px auto 0',
    flexShrink: 0,
  },
modalHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 18px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    marginBottom: 16,
    flexShrink: 0,
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

  avatarEditRow: {
    display: 'flex', alignItems: 'center',
    padding: '8px 0 18px',
    marginBottom: 4,
  },
  camBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: '50%',
    background: '#0F8989',
    border: '2px solid #2E2D2D',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  },

  label: {
    display: 'block',
    textAlign: 'left',
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

  spinner: {
    width: 40, height: 40,
    border: '3px solid rgba(15,137,137,0.2)',
    borderTop: '3px solid #0F8989',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'vmSpin 0.7s linear infinite',
  },
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes vmSpin  { to { transform: rotate(360deg); } }
  @keyframes vmSlide { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes vmFade  { from { opacity: 0; } to { opacity: 1; } }

  .vm-add-btn:hover   { opacity: 0.88; transform: scale(1.04); }
  .vm-add-btn:active  { transform: scale(0.97); }
  .vm-nav-pill:hover  { background: rgba(15,137,137,0.22) !important; }
  .vm-search:focus    { border-color: #0F8989 !important; box-shadow: 0 0 0 3px rgba(15,137,137,0.12) !important; }
  .vm-card:hover      { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(0,0,0,0.4) !important; }
  .vm-action-btn:hover { opacity: 0.8; }
  .vm-icon-btn:hover  { background: rgba(255,255,255,0.15) !important; }
  .vm-close:hover     { background: rgba(15,137,137,0.15) !important; }

  input:focus, select:focus { border-color: #0F8989 !important; box-shadow: none !important; }
  select option { background: #2E2D2D; color: #eee; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #2E2D2D; }
  ::-webkit-scrollbar-thumb { background: #0F8989; border-radius: 10px; }

  .vm-toast {
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
  .vm-toast.show { bottom: 28px; opacity: 1; }

  @media (min-width: 600px) {
    .vm-toast.show { bottom: 36px; }
  }

  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .vm-toast.show { bottom: calc(28px + env(safe-area-inset-bottom)); }
  }
`;
