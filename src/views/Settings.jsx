import React, { useState, useEffect } from "react";

const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://m-tms.thedesigns.live";

// ─── ICONS ───────────────────────────────────────────────────────────────────
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const OkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.5" width="38" height="38">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);
const WarnIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f39c12" strokeWidth="2" width="38" height="38">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const DangerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" width="38" height="38">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const EyeIcon = ({ open }) => open
  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ─── PASSWORD INPUT ───────────────────────────────────────────────────────────
function PasswordInput({ placeholder, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        onChange={onChange}
        style={{ ...S.input, paddingRight: 42 }}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#0F8989", padding: 0, display: "flex" }}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Settings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ show: false, type: "", step: 1 });
  const [form, setForm] = useState({ otp: "", generatedOtp: "", newPass: "", confPass: "", newEmail: "" });
  const [alertBox, setAlertBox] = useState({ show: false, title: "", msg: "", isSuccess: true });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/settings/data`, { credentials: "include" });
      const result = await res.json();
      if (result.success) setData(result);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const showAlert = (title, msg, isSuccess = true) => {
    setAlertBox({ show: true, title, msg, isSuccess });
  };

  const generateAndSendOtp = (targetEmail, reason) => {
    setModal(prev => ({ ...prev, step: 2 }));
    fetch(`${BASE_URL}/api/settings/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, reason }),
      credentials: "include",
    })
      .then(res => res.json())
      .then(result => {
        if (result.success) setForm(prev => ({ ...prev, generatedOtp: result.otp }));
        else console.error("OTP send failed in background");
      })
      .catch(err => console.error("Network Error in background:", err));
  };

  const handleVerifyOtp = () => {
    if (form.otp === form.generatedOtp) {
      if (modal.type === "delete") {
        confirmDelete();
      } else if (modal.type === "email" && modal.step === 2) {
        setModal({ ...modal, step: 3 });
      } else if (modal.type === "email" && modal.step === 4) {
        handleFinalSubmit();
      } else {
        setModal({ ...modal, step: 3 });
      }
    } else {
      showAlert("Invalid OTP", "OTP mismatch!", false);
    }
  };

  const handleFinalSubmit = async () => {
    let url = modal.type === "pass" ? "/api/settings/change-password" : "/api/settings/change-email";
    let body = modal.type === "pass" ? { new_password: form.newPass } : { new_email: form.newEmail };

    if (modal.type === "pass") {
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passRegex.test(form.newPass)) return showAlert("Weak Password", "Must be 8+ chars with uppercase, lowercase & number", false);
      if (form.newPass !== form.confPass) return showAlert("Mismatch", "Passwords do not match", false);
    }

    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const result = await res.json();
      showAlert(result.success ? "Success" : "Error", result.message, result.success);
      if (result.success) {
        setModal({ show: false, type: "", step: 1 });
        fetchSettings();
      }
    } catch (err) { showAlert("Error", "Update failed", false); }
  };

  const confirmDelete = async () => {
    const res = await fetch(`${BASE_URL}/api/settings/delete-profile`, { credentials: "include" });
    const result = await res.json();
    if (result.success) window.location.href = "/";
    else showAlert("Error", result.message, false);
  };

  const closeModal = () => setModal({ show: false, type: "", step: 1 });

  const modalTitle = modal.type === "pass" ? "Change Password" : modal.type === "email" ? "Change Email" : "Delete Profile";

  // step label
  const stepLabels = {
    pass:   ["", "Verify Identity", "Enter OTP", "New Password"],
    email:  ["", "Verify Identity", "Enter OTP", "New Email", "Verify New Email"],
    delete: ["", "Verify Identity", "Enter OTP"],
  };
  const currentStepLabel = (stepLabels[modal.type] || [])[modal.step] || "";

  if (loading) return (
    <div style={{ background: "#3C3A3A", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={S.spinner} />
        <p style={{ color: "#14b8a6", marginTop: 16, fontFamily: "Arial, sans-serif", fontSize: 13 }}>Loading…</p>
      </div>
      <style>{CSS}</style>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={S.header}>
        <div style={S.headerTitle}>Settings</div>
        {data && (
          <div style={S.emailBadge}>
            <MailIcon />
            <span style={{ marginLeft: 6, fontSize: 12, color: "#aaa" }}>{data.email}</span>
          </div>
        )}
      </div>

      {/* ── MENU ── */}
      <div style={S.body}>
        {/* Security Section */}
        <div style={S.sectionLabel}>SECURITY</div>
        <div style={S.card}>
          <div style={S.menuItem} onClick={() => setModal({ show: true, type: "pass", step: 1 })}>
            <div style={S.menuLeft}>
              <div style={{ ...S.menuIcon, background: "rgba(15,137,137,0.15)", color: "#0F8989" }}><LockIcon /></div>
              <div>
                <div style={S.menuTitle}>Change Password</div>
                <div style={S.menuSub}>Update your login password</div>
              </div>
            </div>
            <span style={S.chevron}><ChevronRight /></span>
          </div>
          <div style={S.divider} />
          <div style={S.menuItem} onClick={() => setModal({ show: true, type: "email", step: 1 })}>
            <div style={S.menuLeft}>
              <div style={{ ...S.menuIcon, background: "rgba(15,137,137,0.15)", color: "#0F8989" }}><MailIcon /></div>
              <div>
                <div style={S.menuTitle}>Change Email</div>
                <div style={S.menuSub}>Update your Gmail address</div>
              </div>
            </div>
            <span style={S.chevron}><ChevronRight /></span>
          </div>
        </div>

        {/* Account Section */}
        <div style={{ ...S.sectionLabel, marginTop: 24 }}>ACCOUNT</div>
        <div style={S.card}>
          <div
            style={S.menuItem}
            onClick={() => {
              if (data.role !== "admin") return showAlert("Denied", "Contact admin to delete profile", false);
              setModal({ show: true, type: "delete", step: 1 });
            }}
          >
            <div style={S.menuLeft}>
              <div style={{ ...S.menuIcon, background: "rgba(231,76,60,0.12)", color: "#e74c3c" }}><TrashIcon /></div>
              <div>
                <div style={{ ...S.menuTitle, color: "#e74c3c" }}>Delete Profile</div>
                <div style={S.menuSub}>Permanently remove your account</div>
              </div>
            </div>
            <span style={{ ...S.chevron, color: "#e74c3c" }}><ChevronRight /></span>
          </div>
          <div style={S.divider} />
          <div
            style={S.menuItem}
            onClick={() => setAlertBox({
              show: true,
              title: "Confirm Logout",
              msg: `Logout from ${data.email}?`,
              isSuccess: false,
              action: async () => {
                try {
                  const res = await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
                  const result = await res.json();
                  if (result.status === "success") window.location.href = "/";
                } catch (err) {
                  setAlertBox({ show: true, title: "Error", msg: "Network error", isSuccess: false });
                }
              },
            })}
          >
            <div style={S.menuLeft}>
              <div style={{ ...S.menuIcon, background: "rgba(231,76,60,0.12)", color: "#e74c3c" }}><LogoutIcon /></div>
              <div>
                <div style={{ ...S.menuTitle, color: "#e74c3c" }}>Logout</div>
                <div style={S.menuSub}>Sign out of your session</div>
              </div>
            </div>
            <span style={{ ...S.chevron, color: "#e74c3c" }}><ChevronRight /></span>
          </div>
        </div>
      </div>

      {/* ── MODAL (bottom sheet) ── */}
      {modal.show && (
        <div style={S.backdrop} onClick={closeModal}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={S.modalHead}>
              <div>
                <div style={S.modalTitle}>{modalTitle}</div>
                {currentStepLabel && <div style={S.stepLabel}>{currentStepLabel}</div>}
              </div>
              <button style={S.closeBtn} className="st-close" onClick={closeModal}><CloseIcon /></button>
            </div>

            {/* Step 1 */}
            {modal.step === 1 && (
              <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
                <div style={S.stepIcon}>
                  {modal.type === "delete" ? <TrashIcon /> : <LockIcon />}
                </div>
                <p style={S.infoText}>
                  We'll send a verification OTP to<br />
                  <span style={{ color: "#CDF4F4", fontWeight: 700 }}>{data.email}</span>
                </p>
                <button
                  style={S.primaryBtn}
                  onClick={() => generateAndSendOtp(data.email, modal.type === "pass" ? "change_password" : "change_email")}
                >
                  Send OTP
                </button>
              </div>
            )}

            {/* Step 2 — OTP verify */}
            {modal.step === 2 && (
              <div>
                <p style={S.infoText}>Enter the OTP sent to <span style={{ color: "#CDF4F4", fontWeight: 700 }}>{data.email}</span></p>
                <label style={S.label}>One-Time Password</label>
                <input
                  style={S.input}
                  placeholder="Enter OTP"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={e => setForm({ ...form, otp: e.target.value })}
                />
                <button style={S.primaryBtn} onClick={handleVerifyOtp}>Verify OTP</button>
              </div>
            )}

            {/* Email — Step 3: enter new email */}
            {modal.type === "email" && modal.step === 3 && (
              <div>
                <p style={S.infoText}>Enter the new Gmail address you want to use</p>
                <label style={S.label}>New Email Address</label>
                <input
                  style={S.input}
                  type="email"
                  placeholder="newaddress@gmail.com"
                  onChange={e => setForm({ ...form, newEmail: e.target.value })}
                />
                <button style={S.primaryBtn} onClick={() => generateAndSendOtp(form.newEmail, "change_email")}>
                  Send OTP to New Email
                </button>
              </div>
            )}

            {/* Email — Step 4: verify new email OTP */}
            {modal.type === "email" && modal.step === 4 && (
              <div>
                <p style={S.infoText}>OTP sent to <span style={{ color: "#CDF4F4", fontWeight: 700 }}>{form.newEmail}</span></p>
                <label style={S.label}>One-Time Password</label>
                <input
                  style={S.input}
                  placeholder="Enter OTP"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={e => setForm({ ...form, otp: e.target.value })}
                />
                <button
                  style={S.primaryBtn}
                  onClick={() => { if (form.otp === form.generatedOtp) handleFinalSubmit(); else showAlert("Error", "Wrong OTP", false); }}
                >
                  Confirm & Update
                </button>
              </div>
            )}

            {/* Password — Step 3: new password */}
            {modal.type === "pass" && modal.step === 3 && (
              <div>
                <p style={S.infoText}>Choose a strong new password</p>
                <label style={S.label}>New Password</label>
                <PasswordInput placeholder="Min 8 chars, upper, lower, number" onChange={e => setForm({ ...form, newPass: e.target.value })} />
                <label style={S.label}>Confirm Password</label>
                <PasswordInput placeholder="Repeat new password" onChange={e => setForm({ ...form, confPass: e.target.value })} />
                <button style={S.primaryBtn} onClick={handleFinalSubmit}>Update Password</button>
              </div>
            )}

            <button style={S.cancelBtn} onClick={closeModal}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── ALERT MODAL ── */}
      {alertBox.show && (
        <div style={S.backdrop} onClick={() => setAlertBox({ show: false })}>
          <div style={{ ...S.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalPill} />
            <div style={{ textAlign: "center", padding: "20px 16px 8px" }}>
              <div style={{ marginBottom: 12 }}>
                {alertBox.isSuccess ? <OkIcon /> : alertBox.title === "Confirm Logout" ? <WarnIcon /> : <DangerIcon />}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#CDF4F4", marginBottom: 8 }}>{alertBox.title}</div>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 22, lineHeight: 1.6 }}>{alertBox.msg}</div>
              <div style={{ display: "flex", gap: 10 }}>
                {alertBox.title === "Confirm Logout" && (
                  <button
                    style={{ ...S.btn, background: "rgba(255,255,255,0.07)", color: "#aaa", border: "1px solid rgba(255,255,255,0.12)" }}
                    onClick={() => setAlertBox({ show: false })}
                  >
                    Cancel
                  </button>
                )}
                <button
                  style={{ ...S.btn, background: alertBox.isSuccess ? "#0F8989" : "#e74c3c", color: "#fff" }}
                  onClick={() => { if (alertBox.action) alertBox.action(); setAlertBox({ show: false }); }}
                >
                  {alertBox.title === "Confirm Logout" ? "Logout" : "Okay"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "#3C3A3A",
    fontFamily: "Arial, sans-serif",
    paddingBottom: 60,
  },
  header: {
    background: "#2E2D2D",
    padding: "20px 18px 18px",
    borderBottom: "1px solid rgba(15,137,137,0.3)",
  },
  headerTitle: {
    fontSize: 20, fontWeight: 800, color: "#CDF4F4",
    letterSpacing: -0.3, margin: "0 0 6px 0",
  },
  emailBadge: {
    display: "flex", alignItems: "center",
    color: "#0F8989",
  },
  body: {
    padding: "20px 16px",
    maxWidth: 560,
    margin: "0 auto",
  },
  sectionLabel: {
    fontSize: 10.5, fontWeight: 800, color: "#0F8989",
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    background: "#444",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  menuItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 16px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  menuLeft: {
    display: "flex", alignItems: "center", gap: 14,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  menuTitle: {
    fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2,
  },
  menuSub: {
    fontSize: 11, color: "#888",
  },
  chevron: {
    color: "#555",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "0 16px",
  },

  // Modal
  backdrop: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)",
    zIndex: 1300,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    animation: "stFade 0.15s ease",
  },
  modal: {
    width: "100%", maxWidth: 560,
    background: "#2E2D2D",
    borderRadius: "22px 22px 0 0",
    padding: "0 18px 28px",
    maxHeight: "88dvh",
    overflowY: "auto",
    boxSizing: "border-box",
    border: "1px solid rgba(15,137,137,0.2)",
    borderBottom: "none",
    boxShadow: "0 -8px 48px rgba(0,0,0,0.5)",
    animation: "stSlide 0.24s cubic-bezier(.22,.68,0,1.18)",
  },
  modalPill: {
    width: 40, height: 4,
    background: "rgba(15,137,137,0.4)",
    borderRadius: 4, margin: "12px auto 0",
  },
  modalHead: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    padding: "16px 0 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16, fontWeight: 800,
    color: "#CDF4F4", letterSpacing: -0.2,
    marginBottom: 3,
  },
  stepLabel: {
    fontSize: 11, color: "#0F8989", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 0.6,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: "50%",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#aaa", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0, flexShrink: 0,
  },
  stepIcon: {
    width: 56, height: 56, borderRadius: "50%",
    background: "rgba(15,137,137,0.15)",
    border: "1.5px solid rgba(15,137,137,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px", color: "#0F8989",
  },
  infoText: {
    fontSize: 13, color: "#aaa", lineHeight: 1.7,
    marginBottom: 18, textAlign: "center",
  },
  label: {
    display: "block",
    fontSize: 10.5, fontWeight: 800,
    color: "#14b8a6",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "11px 13px",
    background: "#3C3A3A",
    border: "1.5px solid rgba(15,137,137,0.3)",
    borderRadius: 8, fontSize: 14,
    fontFamily: "Arial, sans-serif",
    color: "#eee", outline: "none",
    marginBottom: 12,
    transition: "border-color 0.18s",
  },
  primaryBtn: {
    width: "100%", padding: "13px",
    background: "#0F8989",
    border: "none", borderRadius: 12,
    color: "#fff", fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "Arial, sans-serif",
    boxShadow: "0 4px 16px rgba(15,137,137,0.3)",
    marginBottom: 10,
    transition: "opacity 0.15s",
  },
  cancelBtn: {
    width: "100%", padding: "11px",
    background: "none", border: "none",
    color: "#666", fontWeight: 700,
    cursor: "pointer", fontFamily: "Arial, sans-serif",
    fontSize: 13,
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
  spinner: {
    width: 40, height: 40,
    border: "3px solid rgba(15,137,137,0.2)",
    borderTop: "3px solid #0F8989",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "stSpin 0.7s linear infinite",
  },
};

const CSS = `
  @keyframes stSpin  { to { transform: rotate(360deg); } }
  @keyframes stSlide { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes stFade  { from { opacity: 0; } to { opacity: 1; } }

  .st-close:hover { background: rgba(15,137,137,0.15) !important; }

  div[style*="cursor: pointer"]:hover > div[style*="background: #444"],
  div[style*="cursor: pointer"]:active { background: rgba(255,255,255,0.04); }

  input:focus { border-color: #0F8989 !important; box-shadow: 0 0 0 3px rgba(15,137,137,0.12) !important; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #2E2D2D; }
  ::-webkit-scrollbar-thumb { background: #0F8989; border-radius: 10px; }
`;

export default Settings;