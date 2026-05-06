//notifications.jsx mobile
import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

// 🟢 Desktop Server (Hub) se connect karo
const socket = io("https://tms.thedesigns.live", { withCredentials: true });

const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://m-tms.thedesigns.live";

// ─── ICONS ───────────────────────────────────────────────────────────────────
const PencilIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width={size} height={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width={size} height={size}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const DangerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" width="36" height="36">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ open, icon, title, message, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={S.backdrop} onClick={onCancel}>
      <div style={{ ...S.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalPill} />
        <div style={{ textAlign: "center", padding: "20px 16px 8px" }}>
          <div style={{ marginBottom: 12 }}>{icon}</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#CDF4F4", marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 22, lineHeight: 1.6 }}>{message}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{ ...S.btn, background: "rgba(255,255,255,0.07)", color: "#aaa", border: "1px solid rgba(255,255,255,0.12)" }}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              style={{ ...S.btn, background: "#e74c3c", color: "#fff" }}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Notifications = () => {
  const [data, setData] = useState({
    announcements: [],
    memberRequests: [],
    deletionRequests: [],
    teams: [],
    canManageAnnounce: false,
    canManageMembers: false,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("announce");
  const swipeStartX = useRef(null);
  const [modal, setModal] = useState({ show: false, type: "add", editId: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

  // Form states
  const [form, setForm] = useState({ title: "", desc: "", teamId: "0", file: null });
useEffect(() => {
    fetchNotifications();

    // 🔔 REAL-TIME LISTENERS (Bina refresh ke update ke liye)
socket.on('new_announcement', (newAnn) => {
    setData(prev => {
        // Prevent duplicate if already exists
        if (prev.announcements.some(a => a.id == newAnn.id)) return prev;
        return {
            ...prev,
            announcements: [newAnn, ...prev.announcements]
        };
    });
});

    socket.on('delete_announcement', (deletedId) => {
        setData(prev => ({
            ...prev,
            announcements: prev.announcements.filter(a => a.id != deletedId)
        }));
    });

    socket.on('edit_announcement', (updatedData) => {
        setData(prev => ({
            ...prev,
            announcements: prev.announcements.map(a => 
                a.id == updatedData.id ? { ...a, ...updatedData } : a
            )
        }));
    });

    return () => {
        socket.off('new_announcement');
        socket.off('delete_announcement');
        socket.off('edit_announcement');
    };
}, []);

  function onTouchStart(e) { swipeStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (swipeStartX.current === null) return;
    const dx = swipeStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) {
      if (dx > 0) setActiveTab('requests');
      else setActiveTab('announce');
    }
    swipeStartX.current = null;
  }

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications`, { credentials: "include" });
      const result = await res.json();
      if (result.success) setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.desc);
    formData.append("role_id", form.teamId);
    if (form.file) formData.append("attachment", form.file);

    const url =
      modal.type === "add"
        ? `${BASE_URL}/api/notifications/add-announcement`
        : `${BASE_URL}/api/notifications/edit-announcement/${modal.editId}`;
    const res = await fetch(url, { method: "POST", body: formData, credentials: "include" });
    const result = await res.json();
    if (result.success) {
      setModal({ show: false, type: "add", editId: null });
      fetchNotifications();
      setForm({ title: "", desc: "", teamId: "0", file: null });
    }
  };

  const handleAction = async (action, id) => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/${action}/${id}`, { credentials: "include" });
      const result = await res.json();
      alert(result.message);
      if (result.success) fetchNotifications();
    } catch (err) {
      alert("Action failed");
    }
  };

  const handleDeleteAnn = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ show: false, id: null });
    const res = await fetch(`${BASE_URL}/api/notifications/delete-announcement/${id}`, { credentials: "include" });
    if ((await res.json()).success) fetchNotifications();
  };

  if (loading) return <div style={styles.loader}>Loading...</div>;

  return (
   <div
      style={{ ...styles.container, touchAction: 'pan-y' }}
      onTouchStart={data.canManageMembers ? onTouchStart : undefined}
      onTouchEnd={data.canManageMembers ? onTouchEnd : undefined}
    >
      <style>{CSS}</style>

      {/* Toggle Tab */}
      {data.canManageMembers && (
        <div style={styles.toggleRow}>
          <div
            style={{ ...styles.tab, ...(activeTab === "announce" ? styles.activeTab : {}) }}
            onClick={() => setActiveTab("announce")}
          >
            Announcements
          </div>
          <div
            style={{ ...styles.tab, ...(activeTab === "requests" ? styles.activeTab : {}) }}
            onClick={() => setActiveTab("requests")}
          >
            Requests{" "}
            {data.memberRequests.length + data.deletionRequests.length > 0 && (
              <span style={styles.badge}>!</span>
            )}
          </div>
        </div>
      )}

      {activeTab === "announce" ? (
        <div>
          <div style={styles.header}>
            <h2 style={styles.title}>Announcements</h2>
            {data.canManageAnnounce && (
              <button
                style={styles.addBtn}
                onClick={() => setModal({ show: true, type: "add", editId: null })}
              >
                <i className="fa-solid fa-plus"></i> Add
              </button>
            )}
          </div>

          {data.announcements.map((a) => (
            <div key={a.id} style={styles.annCard}>
              {data.canManageAnnounce && (
                <div style={styles.cardActions}>
                  <button
                    className="notif-icon-btn"
                    style={{ ...S.iconBtn, color: "#FFD000" }}
                    onClick={() => {
                      setForm({ title: a.title, desc: a.description, teamId: a.role_id, file: null });
                      setModal({ show: true, type: "edit", editId: a.id });
                    }}
                    title="Edit"
                  >
                    <PencilIcon size={15} />
                  </button>
                  <button
                    className="notif-icon-btn"
                    style={{ ...S.iconBtn, color: "#e74c3c" }}
                    onClick={() => setDeleteConfirm({ show: true, id: a.id })}
                    title="Delete"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              )}
              <h3 style={styles.annTitle}>{a.title}</h3>
              <div style={styles.metaRow}>
                <span>{a.added_by_name}</span>
                <span style={styles.sep}>|</span>
                <span style={{ color: "#14b8a6" }}>{a.target_team_name}</span>
              </div>
              <p style={styles.descText}>{a.description}</p>
<div style={styles.footer}>
                <span>{new Date(a.created_at).toLocaleDateString()}</span>
                {a.attachment && (
                  <a href={"https://tms.thedesigns.live/uploads/" + a.attachment} target="_blank" style={styles.attachLink}>View File</a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div id="req-section">
          <h4 style={{ color: "#2ecc71", marginBottom: 15, textAlign: "left" }}>Add Requests</h4>
          {data.memberRequests.map((r) => (
            <div key={r.id} style={{ ...styles.reqCard, borderLeft: "4px solid #2ecc71" }}>
              <div style={styles.reqFlex}>
                <div style={styles.avatar}>{r.name.charAt(0)}</div>
                <div style={{ flex: 1, marginLeft: 10, textAlign: "left" }}>
                  <h4 style={styles.reqName}>{r.name}</h4>
                  <p style={styles.reqDetail}>{r.email} | {r.role_name}</p>
                  <p style={styles.reqSubDetail}>By {r.requested_by_name} on {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div style={styles.btnStack}>
                  <button onClick={() => handleAction("approve-member", r.id)} style={styles.btnSmlGreen}>Accept</button>
                  <button onClick={() => handleAction("reject-member", r.id)} style={styles.btnSmlRed}>Reject</button>
                </div>
              </div>
            </div>
          ))}

          <h4 style={{ color: "#ff4d4d", marginTop: 20, marginBottom: 10, textAlign: "left" }}>Deletion Requests</h4>
          {data.deletionRequests.map((r) => (
            <div key={r.id} style={{ ...styles.reqCard, borderLeft: "4px solid #ff4d4d", background: "#352525" }}>
              <div style={styles.reqFlex}>
                <div style={{ ...styles.avatar, background: "#ff4d4d" }}>{r.name.charAt(0)}</div>
                <div style={{ flex: 1, marginLeft: 10, textAlign: "left" }}>
                  <h4 style={{ ...styles.reqName, color: "#ff4d4d" }}>{r.name}</h4>
                  <p style={styles.reqDetail}>{r.email} | {r.role_name}</p>
                  <p style={styles.reqSubDetail}>By {r.requested_by_name} on {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div style={styles.btnStack}>
                  <button onClick={() => handleAction("confirm-deletion", r.id)} style={styles.btnSmlRed}>Approve</button>
                  <button onClick={() => handleAction("reject-deletion", r.id)} style={styles.btnSmlGreen}>Keep</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ADD / EDIT ANNOUNCEMENT MODAL (bottom sheet) ── */}
      {modal.show && (
        <div style={S.backdrop} onClick={() => setModal({ show: false, type: "add", editId: null })}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={S.modalHead}>
              <span style={S.modalTitle}>{modal.type === "add" ? "Create" : "Edit"} Announcement</span>
              <button
                style={S.closeBtn}
                className="notif-close"
                onClick={() => setModal({ show: false, type: "add", editId: null })}
              >
                <CloseIcon />
              </button>
            </div>
            <div style={{ overflowY: "auto", maxHeight: "calc(88dvh - 80px)", paddingBottom: 20 }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Title</label>
                  <input
                    style={S.input}
                    placeholder="Title"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Description</label>
                  <textarea
                    style={{ ...S.input, height: 90, resize: "vertical" }}
                    placeholder="Description"
                    value={form.desc}
                    onChange={e => setForm({ ...form, desc: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: 14, position: "relative" }}>
                  <label style={S.label}>Target Team</label>
                  <select
                    style={{ ...S.input, appearance: "none", WebkitAppearance: "none", paddingRight: 36 }}
                    value={form.teamId}
                    onChange={e => setForm({ ...form, teamId: e.target.value })}
                  >
                    <option value="0">All Members</option>
                    {data.teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <span style={{ position: "absolute", right: 12, bottom: 11, pointerEvents: "none", color: "#0F8989" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Attachment (optional)</label>
                  <input
                    type="file"
                    style={{ ...S.input, padding: "8px 12px", color: "#aaa" }}
                    onChange={e => setForm({ ...form, file: e.target.files[0] })}
                  />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" style={{ ...S.btnSave, flex: 1 }}>
                    {modal.type === "add" ? "Save" : "Update"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ show: false, type: "add", editId: null })}
                    style={{ ...S.btnSave, flex: 1, background: "rgba(255,255,255,0.07)", color: "#aaa", boxShadow: "none", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      <ConfirmModal
        open={deleteConfirm.show}
        icon={<DangerIcon />}
        title="Delete Announcement"
        message="Permanently delete this announcement? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteAnn}
        onCancel={() => setDeleteConfirm({ show: false, id: null })}
      />
    </div>
  );
};

// ─── SHARED SHEET STYLES ──────────────────────────────────────────────────────
const S = {
  backdrop: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)",
    zIndex: 1300,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    animation: "notifFade 0.15s ease",
  },
  modal: {
    width: "100%", maxWidth: 560,
    background: "#2E2D2D",
    borderRadius: "22px 22px 0 0",
    padding: "0 18px 24px",
    maxHeight: "88dvh",
    overflowY: "auto",
    boxSizing: "border-box",
    border: "1px solid rgba(15,137,137,0.2)",
    borderBottom: "none",
    boxShadow: "0 -8px 48px rgba(0,0,0,0.5)",
    animation: "notifSlide 0.24s cubic-bezier(.22,.68,0,1.18)",
  },
  modalPill: {
    width: 40, height: 4,
    background: "rgba(15,137,137,0.4)",
    borderRadius: 4, margin: "12px auto 0",
  },
  modalHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 0 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16, fontWeight: 800,
    color: "#CDF4F4",
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: "50%",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#aaa", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
  },
label: {
    display: "block",
    fontSize: 10.5, fontWeight: 800,
    color: "#14b8a6",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 5,
    textAlign: "left",
  },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 12px",
    background: "#3C3A3A",
    border: "1.5px solid rgba(15,137,137,0.3)",
    borderRadius: 8, fontSize: 14,
    fontFamily: "Arial, sans-serif",
    color: "#eee", outline: "none",
    transition: "border-color 0.18s",
  },
  btn: {
    padding: "12px 20px",
    border: "none", borderRadius: 12,
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    fontFamily: "Arial, sans-serif",
    transition: "opacity 0.15s",
    letterSpacing: 0.3,
    flex: 1,
  },
  btnSave: {
    padding: "13px",
    background: "#0F8989",
    border: "none", borderRadius: 12,
    color: "#fff", fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "Arial, sans-serif",
    boxShadow: "0 4px 16px rgba(15,137,137,0.3)",
    transition: "opacity 0.15s",
  },
  iconBtn: {
    width: 34, height: 34,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.15s",
  },
};

// ─── COMPONENT STYLES ──────────────────────────────────────────────────────────
const styles = {
  container: {
    padding: "15px",
    background: "#3C3A3A",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },
  loader: { color: "white", textAlign: "center", marginTop: 50 },
  toggleRow: {
    display: "flex",
    background: "#2E2D2D",
    borderRadius: 30,
    padding: 5,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    textAlign: "center",
    padding: "10px 0",
    color: "#aaa",
    fontSize: 13,
    cursor: "pointer",
    borderRadius: 25,
  },
  activeTab: { background: "#0F8989", color: "#fff", fontWeight: "bold" },
  badge: {
    background: "#ff3b3b",
    color: "#fff",
    borderRadius: "50%",
    padding: "1px 6px",
    fontSize: 10,
    marginLeft: 5,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { color: "#fff", fontSize: 18, margin: 0 },
  addBtn: {
    background: "#0F8989",
    color: "white",
    border: "none",
    padding: "8px 15px",
    borderRadius: 100,
    fontSize: 12,
    fontWeight: "bold",
    cursor: "pointer",
  },
  annCard: {
    background: "#444",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeft: "5px solid #0F8989",
    position: "relative",
    textAlign: "left",
  },
  cardActions: {
    position: "absolute",
    top: 12,
    right: 12,
    display: "flex",
    gap: 8,
  },
  annTitle: {
    color: "#CDF4F4",
    fontSize: 17,
    margin: "0 0 5px 0",
    paddingRight: 90,
    textAlign: "left",
  },
  metaRow: { display: "flex", fontSize: 11, color: "#aaa", marginBottom: 10 },
  sep: { margin: "0 8px", opacity: 0.3 },
  descText: { color: "#eee", fontSize: 13, lineHeight: 1.5, margin: "10px 0" },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#888",
  },
  attachLink: { color: "#0F8989", textDecoration: "none", fontWeight: "bold" },
  reqCard: {
    background: "#2E2D2D",
    padding: "10px 12px",
    borderRadius: 8,
    marginBottom: 8,
  },
  reqFlex: { display: "flex", alignItems: "stretch", gap: "8px"},
  reqName: { 
    margin: "0 0 2px 0", // Space reduce kiya name ke niche
    color: "#fff", 
    fontSize: 14, 
    fontWeight: "bold" 
},
reqDetail: { 
    margin: "0 0 2px 0", // Email/Role line ka gap kam kiya
    fontSize: 11, 
    color: "#aaa" 
},
reqSubDetail: { 
    margin: 0, 
    fontSize: 10, 
    color: "#777" 
},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#095959",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  btnStack: { display: "flex", flexDirection: "column",justifyContent: "space-between", gap: 4, minWidth: "65px" },
  btnSmlGreen: {
    background: "#2ecc71",
    color: "white",
    border: "none",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 10,
    cursor: "pointer",
    flex: 1,
    fontWeight: "600",
  },
  btnSmlRed: {
    background: "#e74c3c",
    color: "white",
    border: "none",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 10,
    cursor: "pointer",
    flex: 1,
    fontWeight: "600",
  },
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes notifSlide { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes notifFade  { from { opacity: 0; } to { opacity: 1; } }

  .notif-icon-btn:hover { background: rgba(255,255,255,0.15) !important; }
  .notif-close:hover    { background: rgba(15,137,137,0.15) !important; }

  input:focus, select:focus, textarea:focus {
    border-color: #0F8989 !important;
    box-shadow: 0 0 0 3px rgba(15,137,137,0.12) !important;
  }
  select option { background: #2E2D2D; color: #eee; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #2E2D2D; }
  ::-webkit-scrollbar-thumb { background: #0F8989; border-radius: 10px; }
`;

export default Notifications;