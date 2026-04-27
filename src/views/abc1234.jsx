import React from 'react';

// ─── BASE URL (Local aur Live dono ke liye) ───────────────────────────────
const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live';

const Abc1234 = () => {

  // ─── LOGOUT FUNCTION (Session Destroy karne ke liye) ─────────────────────
  const handleLogout = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Cookies/Session clear karne ke liye zaroori hai
      });

      const data = await res.json();

      if (data.status === 'success') {
        // Session destroy hone ke baad wapas login page par bhej do
        window.location.href = '/'; 
      } else {
        alert("Logout failed. Please try again.");
      }
    } catch (err) {
      console.error("Logout Error:", err);
      // Fallback: Agar backend fail bhi ho jaye toh client side reload kar do
      window.location.href = '/';
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Mesh (App.jsx jaisa look dene ke liye) */}
      <div style={styles.bgMesh} />

      <div style={styles.card}>
        <div style={styles.iconCircle}>
          <i className="fa-solid fa-house-user" style={{ fontSize: '40px', color: '#14b8a6' }}></i>
        </div>
        
        <h1 style={styles.title}>Hello, Welcome Home!</h1>
        <p style={styles.subtitle}>Aapka login successful raha. Yeh aapka naya dashboard (abc1234) hai.</p>
        
        <div style={styles.divider} />

        <p style={styles.infoText}>Click below to destroy your session and logout safely.</p>
        
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '10px' }}></i>
          Logout & Destroy Session
        </button>
      </div>
      
      <p style={styles.footer}>© 2026 TMS Workspace - Secure Session</p>
    </div>
  );
};

// ─── STYLES (Inline CSS for simplicity) ──────────────────────────────────────
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#0f172a',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  bgMesh: {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    backgroundImage: 'radial-gradient(at 0% 0%, rgba(20, 184, 166, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.15) 0px, transparent 50%)',
    zIndex: 0,
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
    textAlign: 'center',
    width: '420px',
    zIndex: 10,
    animation: 'fadeIn 0.8s ease-out',
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    background: '#f0fdfa',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 20px',
  },
  title: {
    color: '#0f172a',
    fontSize: '28px',
    marginBottom: '10px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '15px',
    lineHeight: '1.5',
  },
  divider: {
    height: '1px',
    background: '#e2e8f0',
    margin: '25px 0',
  },
  infoText: {
    color: '#94a3b8',
    fontSize: '13px',
    marginBottom: '20px',
  },
  logoutBtn: {
    width: '100%',
    padding: '12px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
  footer: {
    marginTop: '20px',
    color: '#475569',
    fontSize: '12px',
    zIndex: 10,
  }
};

export default Abc1234;