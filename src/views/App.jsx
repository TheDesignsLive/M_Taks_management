import React, { useState, useEffect, useRef } from 'react';
// 1. Apni doosri file ko yahan import karein
import Layout from './layout.jsx';

// ─── BASE URL ───────────────────────────────────────────────────────────────
const BASE_URL =
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live'; 

// ─── CUSTOM ALERT DIALOG ──────────────────────────────────────────────────────
function AlertDialog({ show, title, message, isSuccess, onClose }) {
  if (!show) return null;
  return (
    <div className="dialog-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <i
          className={isSuccess ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}
          style={{ fontSize: 40, marginBottom: 10, color: isSuccess ? '#2ecc71' : '#e74c3c' }}
        />
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: '#555', fontSize: 15, marginBottom: 10 }}>{message}</p>
        <div className="modal-buttons">
          <button
            className={`btn ${isSuccess ? 'btn-success' : 'btn-danger'}`}
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PASSWORD INPUT WITH TOGGLE ───────────────────────────────────────────────
function PasswordInput({ id, placeholder, value, onChange }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-group" style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
      />
      <i
        className={`fa-solid ${visible ? 'fa-eye' : 'fa-eye-slash'} toggle-password`}
        onClick={() => setVisible(!visible)}
      />
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Success State (This decides which JSX to show) ──
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ── UI State ──
  const [activeTab, setActiveTab] = useState(0);   // 0=Login, 1=Signup
  const [view, setView] = useState('auth');         // 'auth' | 'forgot' | 'reset'
  const [signupStep, setSignupStep] = useState(1);  // 1,2,3

  // ── Alert ──
  const [alert, setAlert] = useState({ show: false, title: '', message: '', isSuccess: false });
  const showAlert = (title, message, isSuccess) =>
    setAlert({ show: true, title, message, isSuccess });
  const closeAlert = () => setAlert(a => ({ ...a, show: false }));

  // ── Login ──
  const [loginType, setLoginType] = useState('user');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ── Signup ──
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [signupOtp, setSignupOtp] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState(null);

  // ── Errors ──
  const [phoneError, setPhoneError] = useState('');
  const [passError, setPassError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  // ── Forgot Password ──
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [otpSent, setOtpSent] = useState(false);

  // ── Reset Password ──
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [resetPassError, setResetPassError] = useState('');
  const [resetConfError, setResetConfError] = useState('');

// ── Browser Tab Logo & Title ──
  useEffect(() => {
    // 1. Set Title
    document.title = "TMS Workspace";

    // 2. Set Favicon (Logo)
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/jpeg';
    link.rel = 'icon';
    link.href = '/public/images/tms.svg'; // Aapka logo path
    document.getElementsByTagName('head')[0].appendChild(link);

    // Baki aapka purana session check
    fetch(`${BASE_URL}/api/auth/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  // ─── TAB SWITCH ────────────────────────────────────────────────────────────
  function showTab(index) {
    setActiveTab(index);
    setView('auth');
    setSignupStep(1);
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPassword, login_type: loginType })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsLoggedIn(true);
      } else {
        showAlert('Login Failed', 'Incorrect Email or Password', false);
      }
    } catch (err) {
      showAlert('Error', 'Network error. Please try again.', false);
    }
  }

  // ─── SIGNUP STEP 1 → 2 ─────────────────────────────────────────────────────
  async function nextStep1() {
    if (!fullName || !signupEmail) {
      showAlert('Validation', 'Please fill all fields', false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      showAlert('Validation', 'Enter a valid email address.', false);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail })
      });
      const data = await res.json();
      if (data.exists) {
        showAlert('Error', 'Email already exists ❌', false);
        setSignupEmail('');
        return;
    }
      const newOtp = Math.floor(100000 + Math.random() * 900000);
      setSignupOtp(newOtp);
      setSignupStep(2);
      await fetch(`${BASE_URL}/api/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: signupEmail, otp: newOtp, sent_for: 'signup' })
      });
    } catch (err) {
      showAlert('Error', 'Server error', false);
    }
  }

  function nextStep2() {
    if (Number(verificationCode) !== signupOtp) {
      showAlert('Error', 'Invalid OTP. Try again.', false);
      return;
    }
    showAlert('Success', 'OTP Verified Successfully!', true);
    setSignupStep(3);
  }

  // ─── SIGNUP SUBMIT ─────────────────────────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault();
    setPhoneError(''); setPassError(''); setConfirmError('');
    let hasError = false;
    if (phone.length !== 10) { setPhoneError('Please enter a valid 10-digit phone number.'); hasError = true; }
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(signupPassword)) { setPassError('Weak password.'); hasError = true; }
    if (signupPassword !== confirmPassword) { setConfirmError('Passwords mismatch.'); hasError = true; }
    if (hasError) return;

    const formData = new FormData();
    formData.append('name', fullName);
    formData.append('company_name', companyName);
    formData.append('email', signupEmail);
    formData.append('phone', phone);
    formData.append('password', signupPassword);
    if (profilePic) formData.append('profile_pic', profilePic);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        showAlert('Success', 'Account created!', true);
        setTimeout(() => {
            setIsLoggedIn(true);
        }, 1500);
      } else {
        showAlert('Signup Error', data.message, false);
      }
    } catch (err) {
      showAlert('Error', 'Network error. Try again.', false);
    }
  }

  async function sendOtp() {
    if (!contact) { showAlert('Error', 'Please enter email or phone', false); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contact })
      });
      const data = await res.json();
      if (data.status === 'not_found') {
        showAlert('Not Found', 'Email or Phone not found in our records.', false);
        setContact('');
        return;
      }
      const newOtp = Math.floor(100000 + Math.random() * 900000);
      setGeneratedOtp(newOtp);
      setOtpSent(true);
      await fetch(`${BASE_URL}/api/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, otp: newOtp, sent_for: 'forget_password' })
      });
    } catch (err) { showAlert('Error', 'Server error', false); }
  }

  function verifyOtp() {
    if (Number(otp) === generatedOtp) { setView('reset'); } 
    else { setOtp(''); showAlert('Invalid', 'Incorrect OTP. Try again.', false); }
  }

  async function resetPassword() {
    setResetPassError(''); setResetConfError('');
    let hasError = false;
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(newPass)) { setResetPassError('Weak password.'); hasError = true; }
    if (newPass !== confPass) { setResetConfError('Passwords mismatch.'); hasError = true; }
    if (!newPass || !confPass) { showAlert('Error', 'Please fill all fields', false); return; }
    if (hasError) return;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contact, new_password: newPass })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showAlert('Success', 'Password reset successfully!', true);
        setView('auth'); setActiveTab(0);
      } else {
        showAlert('Error', data.message || 'Error resetting password', false);
      }
    } catch (err) { showAlert('Error', 'Server error', false); }
  }

  // ─── COMPONENT SWITCHING LOGIC ───────────────────────────────────────────────
  if (isLoggedIn) {
      return <Layout />; 
  }

  // ─── RENDER ───────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      <AlertDialog {...alert} onClose={closeAlert} />

      <div className="bg-graphics">
        <div className="bg-mesh" />
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
        <div className="shape shape-4" />
      </div>

      <div className="auth-screen">
        <div className="auth-wrapper">
          <div className="container">
            <div className="logo-container">
              <img src="/images/tms_logo.jpeg" alt="TMS Logo" />
            </div>

            {view === 'auth' && (
              <div id="authTabs">
                <div className="tabs">
                  <div className={`tab ${activeTab === 0 ? 'active' : ''}`} onClick={() => showTab(0)}>Login</div>
                  <div className={`tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => showTab(1)}>Signup</div>
                  <div className="underline" style={{ left: activeTab * 50 + '%' }} />
                </div>
              </div>
            )}

            {view === 'auth' && activeTab === 0 && (
              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <select value={loginType} onChange={e => setLoginType(e.target.value)}>
                    <option value="user">Login as User</option>
                    <option value="admin">Login as Admin</option>
                  </select>
                </div>
                <div className="input-group">
                  <input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <PasswordInput id="loginPassword" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                <button type="submit">Login</button>
                <span onClick={() => { setView('forgot'); setOtpSent(false); }} className="forgot-password-link">Forgot Password?</span>
              </form>
            )}

            {view === 'auth' && activeTab === 1 && (
              <form onSubmit={handleSignup}>
                {signupStep === 1 && (
                  <div>
                    <div className="input-group">
                      <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <input type="email" placeholder="Email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    </div>
                    <button type="button" onClick={nextStep1}>Next</button>
                  </div>
                )}
                {signupStep === 2 && (
                  <div>
                    <p style={{textAlign:'center', marginBottom:'15px', color:'#555', fontSize:'14px'}}>Enter the verification code sent to your email</p>
                    <div className="input-group">
                      <input type="text" placeholder="Verification Code" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required />
                    </div>
                    <div className="input-group" style={{ display: 'flex', gap: 10 }}>
                      <button type="button" style={{background:'#e2e8f0', color:'#333'}} onClick={() => setSignupStep(1)}>Back</button>
                      <button type="button" onClick={nextStep2}>Verify</button>
                    </div>
                  </div>
                )}
                {signupStep === 3 && (
                  <div>
                    <div className="input-group">
                      <input type="text" placeholder="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <input type="text" placeholder="Phone Number" maxLength="10" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} required />
                    </div>
                    <PasswordInput id="signupPassword" placeholder="Password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
                    <PasswordInput id="confirmPassword" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    <div className="input-group">
                      <label style={{ fontWeight: 'normal', fontSize: 12, color: '#666' }}>Profile Picture (Optional)</label>
                      <input type="file" accept="image/*" onChange={e => setProfilePic(e.target.files[0])} />
                    </div>
                    <button type="submit">Create Account</button>
                  </div>
                )}
              </form>
            )}

            {view === 'forgot' && (
              <div>
       <h2 style={{fontSize:'20px', marginBottom:'15px', color:'#1e293b'}}>Forgot Password</h2>
                <div className="input-group">
                  <input type="text" placeholder="Enter Email or Phone" value={contact} onChange={e => setContact(e.target.value)} />
                </div>
                <button type="button" onClick={sendOtp}>Send OTP</button>
                {otpSent && (
                  <div style={{marginTop:'15px'}}>
                    <div className="input-group">
                      <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
                    </div>
                    <button type="button" onClick={verifyOtp}>Verify OTP</button>
                  </div>
                )}
                <span onClick={() => setView('auth')} className="forgot-password-link">Back to Login</span>
              </div>
            )}

            {view === 'reset' && (
              <div>
               <h2 style={{fontSize:'20px', marginBottom:'15px', color:'#1e293b'}}>Reset Password</h2>
                <PasswordInput id="newpass" placeholder="New Password" value={newPass} onChange={e => setNewPass(e.target.value)} />
                <PasswordInput id="confpass" placeholder="Confirm Password" value={confPass} onChange={e => setConfPass(e.target.value)} />
                <button type="button" onClick={resetPassword}>Reset Password</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
* { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Roboto,sans-serif; }
body { background:#0f172a; overflow:hidden; }

.bg-graphics { position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0; pointer-events:none; }
.bg-mesh { position:absolute; width:100%; height:100%; background-image:radial-gradient(at 0% 0%,rgba(20,184,166,.15) 0px,transparent 50%), radial-gradient(at 100% 100%,rgba(3,105,161,.12) 0px,transparent 50%); }
.shape { position:absolute; filter:blur(90px); border-radius:50%; opacity:.5; animation:drift 20s infinite alternate ease-in-out; }
.shape-1 { top:-10%; left:-10%; width:45vw; height:45vw; background:#2dd4bf; }
.shape-2 { bottom:-20%; right:-10%; width:55vw; height:55vw; background:#0ea5e9; }
@keyframes drift { 0%{transform:scale(1) translate(0,0)} 100%{transform:scale(1.1) translate(5vw,5vh)} }

.auth-screen { min-height:100vh; display:flex; justify-content:center; align-items:center; position:relative; z-index:10; }
.auth-wrapper { animation:fadeIn 0.8s ease-out; }
.container { width:400px; background:#fff; border-radius:16px; padding:30px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); }

.logo-container { text-align:center; margin-bottom:25px; }
.logo-container img { width:80px; height:80px; border-radius:50%; border:3px solid #14b8a6; object-fit:cover; }

.tabs { display:flex; position:relative; border-bottom:2px solid #f1f5f9; margin-bottom:25px; }
.tab { flex:1; text-align:center; padding:12px; cursor:pointer; font-weight:700; color:#64748b; transition:0.3s; }
.tab.active { color:#0f766e; }
.underline { position:absolute; bottom:-2px; left:0; width:50%; height:3px; background:#14b8a6; transition:.3s; }

.input-group { margin-bottom:18px; position:relative; }
.input-group input, .input-group select { width:100%; padding:12px; border-radius:8px; border:1px solid #cbd5e1; outline:none; font-size:14px; background:#f8fafc; color:#1e293b; -webkit-text-fill-color:#1e293b; }
.input-group input:focus { border-color:#14b8a6; background:#fff; color:#1e293b; -webkit-text-fill-color:#1e293b; }
.input-group input::placeholder { color:#94a3b8; -webkit-text-fill-color:#94a3b8; }
.input-group input:-webkit-autofill, .input-group input:-webkit-autofill:focus { -webkit-box-shadow:0 0 0 1000px #f8fafc inset; -webkit-text-fill-color:#1e293b; }

button { width:100%; padding:12px; border:none; border-radius:8px; background:#14b8a6; color:#fff; font-size:15px; font-weight:600; cursor:pointer; transition:.3s; }
button:hover { background:#0f766e; transform:translateY(-1px); }

.forgot-password-link { display:block; text-align:center; margin-top:20px; font-size:14px; color:#0f766e; cursor:pointer; font-weight:500; }
.toggle-password { position:absolute; right:12px; top:14px; cursor:pointer; color:#94a3b8; }

.dialog-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); z-index:9999; display:none; justify-content:center; align-items:center; }
.modal-content { background:#fff; width:340px; padding:30px; border-radius:16px; text-align:center; }
.btn-success { background:#14b8a6; }
.btn-danger { background:#ef4444; }

@keyframes fadeIn { from{opacity:0; transform:scale(0.95)} to{opacity:1; transform:scale(1)} }
`;