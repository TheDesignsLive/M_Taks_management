import React, { useState, useEffect } from "react";

const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:5000" : "https://m-tms.thedesigns.live";

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

  // ✅ FIXED: Emidietly opens Step 2, backend call runs in background
  const generateAndSendOtp = (targetEmail, reason) => {
    // 1. Bina wait kiye turant Step 2 kholo
    setModal(prev => ({ ...prev, step: 2 }));

    // 2. Backend call ko background mein fire karo (await nahi laga rahe)
    fetch(`${BASE_URL}/api/settings/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail, reason: reason }),
      credentials: 'include'
    })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        // Background mein state update kar do verification ke liye
        setForm(prev => ({ ...prev, generatedOtp: result.otp }));
      } else {
        console.error("OTP send failed in background");
      }
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
        credentials: "include"
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

  if (loading) return <div style={styles.loader}>Loading...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.headerTitle}>Settings</h2>
      
      <div style={styles.menuCard}>
        <div style={styles.menuItem} onClick={() => setModal({ show: true, type: "pass", step: 1 })}>
          <span>Change Password</span><span>🔒</span>
        </div>
        <div style={styles.menuItem} onClick={() => setModal({ show: true, type: "email", step: 1 })}>
          <span>Change Gmail</span><span>📧</span>
        </div>
        <div style={{...styles.menuItem, color: "#ff6b6b"}} onClick={() => {
            if (data.role !== "admin") return showAlert("Denied", "Contact admin to delete profile", false);
            setModal({ show: true, type: "delete", step: 1 });
        }}>
          <span>Delete Profile</span><span>⚠️</span>
        </div>
        <div 
  style={{...styles.menuItem, color: "#ff6b6b", border: "none"}} 
  onClick={() => setAlertBox({
    show: true, 
    title: "Confirm Logout", 
    msg: `Logout from ${data.email}?`, 
    isSuccess: false, 
    action: async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        const result = await res.json();
        if (result.status === 'success') window.location.href = "/";
      } catch (err) { 
        setAlertBox({ show: true, title: "Error", msg: "Network error", isSuccess: false }); 
      }
    }
  })}
>
  <span>Logout</span><span>🚪</span>
</div>
      </div>

      {modal.show && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{modal.type === "pass" ? "Change Password" : modal.type === "email" ? "Change Email" : "Delete Profile"}</h3>
            
            {modal.step === 1 && (
              <div style={{textAlign: "center"}}>
                <p style={styles.infoText}>Step 1: Verify current email<br/><strong>{data.email}</strong></p>
                <button style={styles.primaryBtn} onClick={() => generateAndSendOtp(data.email, modal.type === "pass" ? "change_password" : "change_email")}>Send OTP</button>
              </div>
            )}

            {modal.step === 2 && (
              <div>
                <input style={styles.input} placeholder="OTP for current email" onChange={e => setForm({...form, otp: e.target.value})} />
                <button style={styles.primaryBtn} onClick={handleVerifyOtp}>Verify Old Email</button>
              </div>
            )}

            {modal.type === "email" && modal.step === 3 && (
              <div>
                <input style={styles.input} type="email" placeholder="Enter New Gmail" onChange={e => setForm({...form, newEmail: e.target.value})} />
                <button style={styles.primaryBtn} onClick={() => generateAndSendOtp(form.newEmail, "change_email")}>Send OTP to New Email</button>
              </div>
            )}

            {modal.type === "email" && modal.step === 4 && (
              <div>
                <p style={styles.infoText}>OTP sent to <strong>{form.newEmail}</strong></p>
                <input style={styles.input} placeholder="OTP for new email" onChange={e => setForm({...form, otp: e.target.value})} />
                <button style={styles.primaryBtn} onClick={() => { if(form.otp === form.generatedOtp) handleFinalSubmit(); else showAlert("Error", "Wrong OTP", false); }}>Confirm & Update</button>
              </div>
            )}

            {modal.type === "pass" && modal.step === 3 && (
              <div>
                <input style={styles.input} type="password" placeholder="New Password" onChange={e => setForm({...form, newPass: e.target.value})} />
                <input style={styles.input} type="password" placeholder="Confirm Password" onChange={e => setForm({...form, confPass: e.target.value})} />
                <button style={styles.primaryBtn} onClick={handleFinalSubmit}>Update Password</button>
              </div>
            )}

            <button style={styles.cancelBtn} onClick={() => setModal({ show: false, type: "", step: 1 })}>Cancel</button>
          </div>
        </div>
      )}

{alertBox.show && (
  <div className="dialog-overlay" style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' }}>
    <div className="modal-content" style={{ background:'#fff', width:'340px', padding:'30px', borderRadius:'16px', textAlign:'center' }}>
      <i 
        className={alertBox.isSuccess ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} 
        style={{ fontSize: 40, marginBottom: 10, color: alertBox.isSuccess ? '#2ecc71' : '#ef4444' }}
      />
      <h3 style={{ marginTop: 0, color: '#333' }}>{alertBox.title}</h3>
      <p style={{ color: '#555', fontSize: 15, marginBottom: 25 }}>{alertBox.msg}</p>
      
      <div className="modal-buttons" style={{ display: 'flex', gap: '10px' }}>
        <button 
          className={`btn ${alertBox.isSuccess ? 'btn-success' : 'btn-danger'}`}
          style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: alertBox.isSuccess ? '#14b8a6' : '#ef4444', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          onClick={() => { if(alertBox.action) alertBox.action(); setAlertBox({show: false}); }}
        >
          Okay
        </button>
        {alertBox.title === "Confirm Logout" && (
          <button 
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#e2e8f0', color: '#333', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} 
            onClick={() => setAlertBox({show: false})}
          >
            Cancel
          </button>
        )}
      </div>
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
  primaryBtn: { width: "100%", padding: "12px", background: "#0F8989", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "bold", marginBottom: "10px", flex: 1 },
  cancelBtn: { width: "100%", padding: "10px", background: "none", border: "none", color: "#999", fontWeight: "bold" }
};

export default Settings;