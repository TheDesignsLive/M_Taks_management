import { useState, useEffect, useRef } from "react";

// ── Notification helper (mirrors Notification.jsx contract) ──────────────────
function Notification({ notifications, removeNotification }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, width: "calc(100vw - 32px)" }}>
      {notifications.map((n) => (
        <div key={n.id} style={{
          background: n.type === "success" ? "#0F8989" : n.type === "error" ? "#e74c3c" : "#444",
          color: "#fff", borderRadius: 10, padding: "13px 16px",
          display: "flex", alignItems: "flex-start", gap: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          animation: "slideIn 0.3s ease",
        }}>
          <span style={{ fontSize: 18, marginTop: 1 }}>
            {n.type === "success" ? "✓" : n.type === "error" ? "✕" : "ℹ"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{n.message}</div>
          </div>
          <button onClick={() => removeNotification(n.id)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      ))}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}

function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const add = (type, title, message) => {
    const id = Date.now();
    setNotifications((p) => [...p, { id, type, title, message }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 4000);
  };
  const remove = (id) => setNotifications((p) => p.filter((n) => n.id !== id));
  return { notifications, add, remove };
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user }) {
  if (user.profile_pic) {
    return <img src={`/images/${user.profile_pic}`} alt={user.name}
      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #0F8989" }} />;
  }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#0F8989,#095959)",
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 14, textTransform: "uppercase", flexShrink: 0,
      border: "2px solid rgba(15,137,137,0.4)",
    }}>{user.name?.charAt(0)}</div>
  );
}

// ── Icon components (SVG, no emoji) ─────────────────────────────────────────
const Icon = {
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  Edit: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
  Delete: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Lock: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  Unlock: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Warning: () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Trash2: () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Check: () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Department: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  Roles: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Image: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  User: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Mail: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Phone: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6.29 6.29l1.28-1.28a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Key: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
};

// ── Overlay / Modal shell ────────────────────────────────────────────────────
function Modal({ open, onClose, children, maxWidth = 440 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 2000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#2a2828", borderRadius: 14, width: "100%", maxWidth,
        maxHeight: "90vh", overflowY: "auto", position: "relative",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.07)",
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Form Field ───────────────────────────────────────────────────────────────
function Field({ label, icon, children, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#aaa", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
        <span style={{ color: "#0F8989" }}>{icon}</span>{label}
      </label>
      {children}
      {error && <p style={{ color: "#e74c3c", fontSize: 11, margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff",
  fontSize: 13, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};

const selectStyle = { ...inputStyle, cursor: "pointer" };

// ── Password Field ───────────────────────────────────────────────────────────
function PasswordField({ id, placeholder, value, onChange, label, icon }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} icon={icon}>
      <div style={{ position: "relative" }}>
        <input id={id} type={show ? "text" : "password"} placeholder={placeholder}
          value={value} onChange={onChange}
          style={{ ...inputStyle, paddingRight: 38 }} />
        <button type="button" onClick={() => setShow(!show)} style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", color: "#888", display: "flex",
        }}>{show ? <Icon.EyeOff /> : <Icon.Eye />}</button>
      </div>
    </Field>
  );
}

// ── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ open, onClose, onConfirm, icon, title, message, confirmLabel = "Confirm", danger = false }) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={360}>
      <div style={{ padding: "28px 24px", textAlign: "center" }}>
        <div style={{ marginBottom: 12 }}>{icon}</div>
        <h3 style={{ margin: "0 0 8px", color: "#fff", fontSize: 17 }}>{title}</h3>
        <p style={{ color: "#aaa", fontSize: 13, margin: "0 0 24px" }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, color: "#ccc", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", background: danger ? "#e74c3c" : "#0F8989", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── PASS regex ───────────────────────────────────────────────────────────────
const PASS_RE = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function ViewMember() {
  const { notifications, add: notify, remove: removeNotif } = useNotifications();

  const [data, setData] = useState({ users: [], roles: [], teams: [], sessionRole: "", adminName: "" });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState(null);   // { id, name, status }
  const [deleteTarget, setDeleteTarget] = useState(null);     // { id, name }

  // add form
  const [addForm, setAddForm] = useState({ team_id: "", role_id: "", name: "", email: "", phone: "", password: "", confirm: "" });
  const [addPic, setAddPic] = useState(null);
  const [addErrors, setAddErrors] = useState({});

  // edit form
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ team_id: "", role_id: "", name: "", email: "", phone: "", password: "", confirm: "" });
  const [editPic, setEditPic] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  const fetchData = async () => {
    try {
      const r = await fetch("/api/view_member");
      const d = await r.json();
      if (d.success) setData(d);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ── Socket.IO live refresh ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && window.io) {
      const socket = window.io();
      socket.on("update_members", fetchData);
      return () => socket.disconnect();
    }
  }, []);

  // ── Filtered users ─────────────────────────────────────────────────────────
  const filtered = data.users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Roles filtered by team ─────────────────────────────────────────────────
  const rolesForTeam = (teamId) =>
    data.roles.filter((r) =>
      teamId ? String(r.team_id) === String(teamId) : !r.team_id
    );

  // ─────────────────────────────────────────────────────────────────────────
  // ADD MEMBER
  // ─────────────────────────────────────────────────────────────────────────
  const validateAdd = () => {
    const e = {};
    if (!addForm.team_id) e.team_id = "Select department";
    if (!addForm.role_id) e.role_id = "Select role";
    if (!addForm.name.trim()) e.name = "Name required";
    if (!addForm.email.trim()) e.email = "Email required";
    if (addForm.phone && addForm.phone.length !== 10) e.phone = "Enter 10-digit number";
    if (!PASS_RE.test(addForm.password)) e.password = "Min 8 chars, 1 upper, 1 lower, 1 number";
    if (addForm.password !== addForm.confirm) e.confirm = "Passwords do not match";
    setAddErrors(e);
    return !Object.keys(e).length;
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!validateAdd()) return;
    const fd = new FormData();
    Object.entries({ name: addForm.name, email: addForm.email, phone: addForm.phone, password: addForm.password, role_id: addForm.role_id }).forEach(([k, v]) => fd.append(k, v));
    if (addPic) fd.append("profile_pic", addPic);
    try {
      const r = await fetch("/api/view_member/add", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) { setAddOpen(false); setAddForm({ team_id: "", role_id: "", name: "", email: "", phone: "", password: "", confirm: "" }); setAddPic(null); fetchData(); notify("success", "Member Added", d.message); }
      else notify("error", "Failed", d.message);
    } catch { notify("error", "Error", "Server error"); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT MEMBER
  // ─────────────────────────────────────────────────────────────────────────
  const openEdit = (user) => {
    setEditId(user.id);
    setEditForm({ team_id: user.team_id || "", role_id: user.role_id, name: user.name, email: user.email, phone: user.phone || "", password: "", confirm: "" });
    setEditPic(null);
    setEditErrors({});
    setEditOpen(true);
  };

  const validateEdit = () => {
    const e = {};
    if (!editForm.team_id) e.team_id = "Select department";
    if (!editForm.role_id) e.role_id = "Select role";
    if (!editForm.name.trim()) e.name = "Name required";
    if (!editForm.email.trim()) e.email = "Email required";
    if (editForm.phone && editForm.phone.length !== 10) e.phone = "Enter 10-digit number";
    if (editForm.password && !PASS_RE.test(editForm.password)) e.password = "Min 8 chars, 1 upper, 1 lower, 1 number";
    if (editForm.password && editForm.password !== editForm.confirm) e.confirm = "Passwords do not match";
    setEditErrors(e);
    return !Object.keys(e).length;
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!validateEdit()) return;
    const fd = new FormData();
    Object.entries({ name: editForm.name, email: editForm.email, phone: editForm.phone, password: editForm.password, role_id: editForm.role_id }).forEach(([k, v]) => fd.append(k, v));
    if (editPic) fd.append("profile_pic", editPic);
    try {
      const r = await fetch(`/api/view_member/edit/${editId}`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) { setEditOpen(false); fetchData(); notify("success", "Updated", "Member updated successfully"); }
      else notify("error", "Failed", d.message);
    } catch { notify("error", "Error", "Server error"); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SUSPEND / DELETE
  // ─────────────────────────────────────────────────────────────────────────
  const confirmSuspend = async () => {
    try {
      const r = await fetch(`/api/view_member/suspend/${suspendTarget.id}`);
      const d = await r.json();
      if (d.success) { fetchData(); notify("success", "Done", d.message); }
      else notify("error", "Failed", d.message);
    } catch { notify("error", "Error", "Server error"); }
    setSuspendTarget(null);
  };

  const confirmDelete = async () => {
    try {
      const r = await fetch(`/api/view_member/delete/${deleteTarget.id}`);
      const d = await r.json();
      if (d.success) { fetchData(); notify("success", "Deleted", d.message); }
      else notify("error", "Failed", d.message);
    } catch { notify("error", "Error", "Server error"); }
    setDeleteTarget(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STATUS BADGE
  // ─────────────────────────────────────────────────────────────────────────
  const StatusBadge = ({ status }) => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px",
      borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      background: status === "ACTIVE" ? "rgba(46,204,113,0.15)" : "rgba(231,76,60,0.15)",
      color: status === "ACTIVE" ? "#2ecc71" : "#e74c3c",
      border: `1px solid ${status === "ACTIVE" ? "rgba(46,204,113,0.3)" : "rgba(231,76,60,0.3)"}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: status === "ACTIVE" ? "#2ecc71" : "#e74c3c", display: "inline-block" }} />
      {status}
    </span>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // MEMBER FORM (shared between Add / Edit)
  // ─────────────────────────────────────────────────────────────────────────
  const MemberForm = ({ mode }) => {
    const isEdit = mode === "edit";
    const form = isEdit ? editForm : addForm;
    const setForm = isEdit ? setEditForm : setAddForm;
    const errors = isEdit ? editErrors : addErrors;
    const onSubmit = isEdit ? submitEdit : submitAdd;
    const setPic = isEdit ? setEditPic : setAddPic;

    const filteredRoles = rolesForTeam(form.team_id);

    return (
      <form onSubmit={onSubmit}>
        <div style={{ padding: "20px 20px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: 16, fontWeight: 700 }}>
              {isEdit ? "Edit Member" : "Add Member"}
            </h3>
            <button type="button" onClick={() => isEdit ? setEditOpen(false) : setAddOpen(false)}
              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#aaa" }}>
              <Icon.Close />
            </button>
          </div>

          {/* Department */}
          <Field label="Department" icon={<Icon.Department />} error={errors.team_id}>
            <select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value, role_id: "" })} style={selectStyle} required>
              <option value="" disabled>Select Department</option>
              {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>

          {/* Role */}
          <Field label="Role" icon={<Icon.Roles />} error={errors.role_id}>
            <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} style={selectStyle} required>
              <option value="" disabled>Select Role</option>
              {filteredRoles.map((r) => <option key={r.id} value={r.id}>{r.role_name}</option>)}
            </select>
          </Field>

          {/* Name */}
          <Field label="Full Name" icon={<Icon.User />} error={errors.name}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" style={inputStyle} />
          </Field>

          {/* Email */}
          <Field label="Email" icon={<Icon.Mail />} error={errors.email}>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" style={inputStyle} />
          </Field>

          {/* Phone */}
          <Field label="Phone" icon={<Icon.Phone />} error={errors.phone}>
            <input type="tel" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} placeholder="10-digit phone (optional)" style={inputStyle} />
          </Field>

          {/* Password */}
          <PasswordField label={isEdit ? "New Password (optional)" : "Password"} icon={<Icon.Key />}
            placeholder={isEdit ? "Leave blank to keep current" : "Password"}
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {errors.password && <p style={{ color: "#e74c3c", fontSize: 11, margin: "-10px 0 10px" }}>{errors.password}</p>}

          {/* Confirm */}
          <PasswordField label="Confirm Password" icon={<Icon.Key />}
            placeholder="Confirm password" value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          {errors.confirm && <p style={{ color: "#e74c3c", fontSize: 11, margin: "-10px 0 10px" }}>{errors.confirm}</p>}

          {/* Profile Pic */}
          <Field label="Profile Picture" icon={<Icon.Image />}>
            <label style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)",
              borderRadius: 8, cursor: "pointer", color: "#aaa", fontSize: 12,
            }}>
              <Icon.Image />
              <span>{isEdit ? (editPic?.name || "Choose new image…") : (addPic?.name || "Choose image…")}</span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setPic(e.target.files[0])} />
            </label>
            <p style={{ color: "#555", fontSize: 10, margin: "4px 0 0" }}>jpeg, jpg, png, gif, webp — max 5 MB</p>
          </Field>
        </div>

        <div style={{ padding: "12px 20px 20px" }}>
          <button type="submit" style={{
            width: "100%", padding: "12px 0", background: "linear-gradient(135deg,#0F8989,#095959)",
            border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700,
            cursor: "pointer", letterSpacing: "0.03em",
          }}>{isEdit ? "Update Member" : "Add Member"}</button>
        </div>
      </form>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#3C3A3A", color: "#fff", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Notification notifications={notifications} removeNotification={removeNotif} />

      {/* ── Top Bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "linear-gradient(180deg,#2a2828 0%,rgba(42,40,40,0.95) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
      }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>Members</h1>
            {data.adminName && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#0F8989", fontWeight: 600 }}>{data.adminName}</p>}
          </div>

          {/* Icon buttons for Department / Roles / Add */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(data.sessionRole === "admin" || data.sessionRole === "owner") && (
              <IconNavBtn icon={<Icon.Department />} label="Dept" onClick={() => window.location.href = "/view-teams"} />
            )}
            <IconNavBtn icon={<Icon.Roles />} label="Roles" onClick={() => window.location.href = "/view-roles"} />
            <button onClick={() => setAddOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: "linear-gradient(135deg,#0F8989,#095959)", border: "none",
              borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.02em", flexShrink: 0,
            }}>
              <Icon.Plus /> Add
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "0 16px 12px", position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: "50%", transform: "translateY(-50%)", color: "#888", pointerEvents: "none" }}>
            <Icon.Search />
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member by name…"
            style={{ ...inputStyle, paddingLeft: 38, background: "rgba(255,255,255,0.06)" }} />
        </div>
      </div>

      {/* ── Member count ── */}
      <div style={{ padding: "10px 16px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#888" }}>{filtered.length} member{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Member Cards ── */}
      <div style={{ padding: "6px 16px 100px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#555", padding: 60 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#555", padding: 60, fontSize: 14 }}>No members found</div>
        ) : (
          filtered.map((user, idx) => (
            <div key={user.id} style={{
              background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px 14px",
              marginBottom: 10, border: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", gap: 12,
              animation: `fadeUp 0.3s ease ${idx * 0.04}s both`,
            }}>
              {/* Avatar */}
              <Avatar user={user} />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>{user.name}</span>
                  <StatusBadge status={user.status} />
                </div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "#0F8989", background: "rgba(15,137,137,0.12)", padding: "2px 7px", borderRadius: 20, fontWeight: 600, border: "1px solid rgba(15,137,137,0.25)" }}>{user.role_name}</span>
                </div>
              </div>

              {/* Action icons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", flexShrink: 0 }}>
                {/* Suspend / Activate icon */}
                <ActionIcon
                  title={user.status === "ACTIVE" ? "Suspend" : "Activate"}
                  color={user.status === "ACTIVE" ? "#e74c3c" : "#2ecc71"}
                  bg={user.status === "ACTIVE" ? "rgba(231,76,60,0.1)" : "rgba(46,204,113,0.1)"}
                  onClick={() => setSuspendTarget({ id: user.id, name: user.name, status: user.status })}
                  icon={user.status === "ACTIVE" ? <Icon.Lock /> : <Icon.Unlock />}
                />
                <ActionIcon
                  title="Edit"
                  color="#FFD000"
                  bg="rgba(255,208,0,0.1)"
                  onClick={() => openEdit(user)}
                  icon={<Icon.Edit />}
                />
                <ActionIcon
                  title="Delete"
                  color="#e74c3c"
                  bg="rgba(231,76,60,0.1)"
                  onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                  icon={<Icon.Delete />}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Tablet+ Table View (hidden on mobile) ── */}
      <style>{`
        @media (min-width: 700px) {
          .member-cards { display: none !important; }
          .member-table-wrap { display: block !important; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        select option { background: #2a2828; color: #fff; }
        input::placeholder { color: #555; }
        input:focus, select:focus { border-color: #0F8989 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
      `}</style>

      {/* ── ADD DIALOG ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        {data.roles.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Icon.Warning />
            <h3 style={{ color: "#fff", marginTop: 12 }}>No Roles Found</h3>
            <p style={{ color: "#aaa", fontSize: 13 }}>Create a role in the Roles Panel first.</p>
            <button onClick={() => window.location.href = "/view-roles"} style={{ padding: "10px 24px", background: "#0F8989", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", marginTop: 8 }}>Go to Roles Panel</button>
          </div>
        ) : <MemberForm mode="add" />}
      </Modal>

      {/* ── EDIT DIALOG ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <MemberForm mode="edit" />
      </Modal>

      {/* ── SUSPEND CONFIRM ── */}
      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={confirmSuspend}
        icon={<Icon.Warning />}
        title="Confirm Action"
        message={suspendTarget ? `${suspendTarget.status === "ACTIVE" ? "Suspend" : "Activate"} "${suspendTarget.name}"?` : ""}
        confirmLabel={suspendTarget?.status === "ACTIVE" ? "Suspend" : "Activate"}
        danger={suspendTarget?.status === "ACTIVE"}
      />

      {/* ── DELETE CONFIRM ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        icon={<Icon.Trash2 />}
        title="Delete Member"
        message={deleteTarget ? `Permanently delete "${deleteTarget.name}"?` : ""}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

// ── Small helper components ─────────────────────────────────────────────────
function IconNavBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick} title={label} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#ccc",
      fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", transition: "all 0.2s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,137,137,0.2)"; e.currentTarget.style.color = "#0F8989"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#ccc"; }}
    >
      {icon}<span>{label}</span>
    </button>
  );
}

function ActionIcon({ icon, color, bg, onClick, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 30, height: 30, borderRadius: 7, border: "none",
      background: bg, color, cursor: "pointer", display: "flex",
      alignItems: "center", justifyContent: "center", transition: "all 0.15s",
      flexShrink: 0,
    }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
    >
      {icon}
    </button>
  );
}