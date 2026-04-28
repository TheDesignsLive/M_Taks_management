import React, { useState, useEffect } from "react";

const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://m-tms.thedesigns.live";

const Settings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ show: false, type: "", step: 1 });
  const [form, setForm] = useState({ otp: "", generatedOtp: "", newPass: "", confPass: "", newEmail: "" });

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/settings/data`, { credentials: "include" });
      const result = await res.json();
      if (result.success) setData(result);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const generateAndSendOtp = async (targetEmail, reason) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setForm({ ...form, generatedOtp: otp });
    
    // CALLING SENT MAIL ROUTER (Exactly like desktop app)
    try {
        /*
        await fetch(`${BASE_URL}/forgot-password/send-otp`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact: targetEmail, otp: otp, sent_for: reason })
        });
        */
        console.log(`[DEBUG] OTP for ${reason}: ${otp}`); // Noob testing ke liye
        setModal(prev => ({ ...prev, step: 2 }));
    } catch (err) { alert("Failed to send OTP"); }
  };

  const handleFinalSubmit = async () => {
    let url = "";
    let body = {};
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (modal.type === "pass") {
      if (!passRegex.test(form.newPass)) return alert("Password must be 8+ chars with 1 uppercase, 1 lowercase & 1 number.");
      if (form.newPass !== form.confPass) return alert("Passwords do not match.");
      url = "/api/settings/change-password";
      body = { new_password: form.newPass };
    } else if (modal.type === "email") {
      url = "/api/settings/change-email";
      body = { new_email: form.newEmail };
    }

    try {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
      });
      const result = await res.json();
      alert(result.message);
      if (result.success) {
        setModal({ show: false, type: "", step: 1 });
        fetchSettings();
      }
    } catch (err) { alert("Update failed"); }
  };

  const confirmDelete = async () => {
    const res = await fetch(`${BASE_URL}/api/settings/delete-profile`, { credentials: "include" });
    const result = await res.json();
    if (result.success) window.location.href = "/";
    else alert(result.message);
  };

  if (loading) return <div style={styles.loader}>Loading...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.headerTitle}>Settings</h2>
      
      <div style={styles.menuCard}>
        <div style={styles.menuItem} onClick={() => setModal({ show: true, type: "pass", step: 1 })}>
          <span>Change Password</span>
          <span>🔒</span>
        </div>
        <div style={styles.menuItem} onClick={() => setModal({ show: true, type: "email", step: 1 })}>
          <span>Change Gmail</span>
          <span>📧</span>
        </div>
        <div style={{...styles.menuItem, color: "#ff6b6b"}} onClick={() => {
            if (data.role !== "admin") return alert("Please contact your admin to remove your profile.");
            setModal({ show: true, type: "delete", step: 1 });
        }}>
          <span>Delete Profile</span>
          <span>⚠️</span>
        </div>
        <div style={{...styles.menuItem, color: "#ff6b6b", border: "none"}} onClick={() => window.confirm("Logout?") && (window.location.href = "/logout")}>
          <span>Logout</span>
          <span>🚪</span>
        </div>
      </div>

      {modal.show && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{modal.type === "pass" ? "Change Password" : modal.type === "email" ? "Change Email" : "Delete Profile"}</h3>
            
            {/* STEP 1: VERIFICATION INFO */}
            {modal.step === 1 && (
              <div style={{textAlign: "center"}}>
                <p style={styles.infoText}>We will send an OTP to:<br/><strong>{data.email}</strong></p>
                <button style={styles.primaryBtn} onClick={() => generateAndSendOtp(data.email, modal.type === "pass" ? "change_password" : modal.type === "email" ? "change_email" : "delete_profile")}>
                  Send Verification OTP
                </button>
              </div>
            )}

            {/* STEP 2: OTP INPUT */}
            {modal.step === 2 && (
              <div>
                <input style={styles.input} placeholder="Enter OTP" onChange={e => setForm({...form, otp: e.target.value})} />
                <button style={styles.primaryBtn} onClick={() => {
                  if (form.otp === form.generatedOtp) {
                    if (modal.type === "delete") confirmDelete();
                    else setModal({...modal, step: 3});
                  } else alert("Invalid OTP");
                }}>Verify OTP</button>
              </div>
            )}

            {/* STEP 3: FINAL FORMS */}
            {modal.step === 3 && modal.type === "pass" && (
              <div>
                <input style={styles.input} type="password" placeholder="New Password" onChange={e => setForm({...form, newPass: e.target.value})} />
                <input style={styles.input} type="password" placeholder="Confirm Password" onChange={e => setForm({...form, confPass: e.target.value})} />
                <button style={styles.primaryBtn} onClick={handleFinalSubmit}>Update Password</button>
              </div>
            )}

            {modal.step === 3 && modal.type === "email" && (
              <div>
                <input style={styles.input} type="email" placeholder="Enter New Email" onChange={e => setForm({...form, newEmail: e.target.value})} />
                <button style={styles.primaryBtn} onClick={handleFinalSubmit}>Change Gmail</button>
              </div>
            )}

            <button style={styles.cancelBtn} onClick={() => setModal({ show: false, type: "", step: 1 })}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: "20px", background: "#121212", minHeight: "100vh", color: "#fff" },
  loader: { color: "#0F8989", textAlign: "center", marginTop: "50px" },
  headerTitle: { fontSize: "22px", marginBottom: "20px", color: "#0F8989" },
  menuCard: { background: "#1E1E1E", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" },
  menuItem: { padding: "18px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", fontSize: "16px", cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" },
  modalContent: { background: "#fff", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "350px", color: "#333" },
  modalTitle: { marginTop: 0, textAlign: "center", color: "#0F8989" },
  infoText: { fontSize: "14px", color: "#666", marginBottom: "20px", lineHeight: "1.5" },
  input: { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" },
  primaryBtn: { width: "100%", padding: "12px", background: "#0F8989", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "bold", marginBottom: "10px" },
  cancelBtn: { width: "100%", padding: "10px", background: "none", border: "none", color: "#999", fontWeight: "bold" }
};

export default Settings;