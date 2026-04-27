import React, { useState, useEffect, useRef } from 'react';
// 1. Apni doosri file ko yahan import karein
import Abc1234 from './abc1234.jsx'; 

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
  const [activeTab, setActiveTab] = useState(0);   // 0=Login, 1=Signup
  const [view, setView] = useState('auth');         // 'auth' | 'forgot' | 'reset'
  const [signupStep, setSignupStep] = useState(1);  // 1,2,3

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

  // ── Scroll animation ──
  useEffect(() => {
    fetch(`${BASE_URL}/api/auth/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        // If already logged in, show Abc1234
        if (data.loggedIn) setIsLoggedIn(true);
      })
      .catch(() => {});

    const revealEls = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('active');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
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
        // ✅ Switch to abc1234.jsx component
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
    if (phone.length !== 10) { setPhoneError('Invalid phone number.'); hasError = true; }
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
            // ✅ Switch to abc1234.jsx component
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
      const res = await fetch(`${BASE_URL}/api/forgot-password/check`, {
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
    // Reset logic exactly as you provided...
    setResetPassError(''); setResetConfError('');
    let hasError = false;
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(newPass)) { setResetPassError('Weak password.'); hasError = true; }
    if (newPass !== confPass) { setResetConfError('Passwords mismatch.'); hasError = true; }
    if (!newPass || !confPass) { showAlert('Error', 'Please fill all fields', false); return; }
    if (hasError) return;
    try {
      const res = await fetch(`${BASE_URL}/api/forgot-password/reset`, {
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
      return <Abc1234 />; // ✅ This replaces everything with your new JSX file
  }

  // ─── RENDER LOGIN PAGE ───────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      <AlertDialog {...alert} onClose={closeAlert} />

      <nav id="navbar">
        <a href="/" className="nav-brand">
          <img src="/images/tms.svg" alt="TMS" /> TMS Workspace
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#workflow">How it Works</a>
          <a href="#auth" onClick={() => { setView('auth'); setActiveTab(0); }}>Sign In</a>
        </div>
      </nav>

      <div className="bg-graphics">
        <div className="bg-mesh" />
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
        <div className="shape shape-4" />
      </div>

      <div className="floating-element float-1">
        <i className="fa-solid fa-bolt" style={{ color: '#fcd34d' }} />
        <div><span className="title">Real-time Sync</span><span className="desc">Updates across all devices</span></div>
      </div>
      <div className="floating-element float-2">
        <i className="fa-solid fa-users" style={{ color: '#60a5fa' }} />
        <div><span className="title">Team Collaboration</span><span className="desc">Work together seamlessly</span></div>
      </div>
      <div className="floating-element float-3">
        <i className="fa-solid fa-shield-halved" style={{ color: '#4ade80' }} />
        <div><span className="title">Bank-grade Security</span><span className="desc">Your data is protected</span></div>
      </div>

      <section className="hero-section" id="auth">
        <div className="hero-content">
          <h1>Master Your Workflow</h1>
          <p>The intelligent workspace that adapts to how your team works. Organize, collaborate, and execute faster.</p>
        </div>

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
                <h2>Create Account</h2>
                <p className="tagline">Sign up to manage your tasks efficiently</p>
                {signupStep === 1 && (
                  <div>
                    <div className="input-group">
                      <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <input type="email" placeholder="Email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    </div>
                    <button type="button" className="next-btn" onClick={nextStep1}>Next</button>
                  </div>
                )}
                {signupStep === 2 && (
                  <div>
                    <p>Enter the verification code sent to your email</p>
                    <div className="input-group">
                      <input type="text" placeholder="Verification Code" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required />
                    </div>
                    <div className="input-group" style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => setSignupStep(1)}>Back</button>
                      <button type="button" className="next-btn" onClick={nextStep2}>Verify</button>
                    </div>
                  </div>
                )}
                {signupStep === 3 && (
                  <div>
                    <div className="input-group">
                      <input type="text" placeholder="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                    </div>
                    <div className="input-group">
                      <input
                        type="text" placeholder="Phone Number" maxLength="10"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      />
                      {phoneError && <div className="error-msg" style={{ display: 'block' }}>{phoneError}</div>}
                    </div>
                    <PasswordInput id="signupPassword" placeholder="Password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
                    {passError && <div className="error-msg" style={{ display: 'block', marginTop: -10, marginBottom: 10 }}>{passError}</div>}
                    <PasswordInput id="confirmPassword" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    {confirmError && <div className="error-msg" style={{ display: 'block', marginTop: -10, marginBottom: 10 }}>{confirmError}</div>}
                    <div className="input-group">
                      <label style={{ fontWeight: 'normal', fontSize: 13, color: '#666' }}>Profile Picture (Optional)</label>
                      <input type="file" accept="image/*" onChange={e => setProfilePic(e.target.files[0])} />
                    </div>
                    <div className="input-group" style={{ display: 'flex', gap: 10 }}>
                      <button type="button" onClick={() => setSignupStep(2)}>Back</button>
                      <button type="submit">Create Account</button>
                    </div>
                  </div>
                )}
              </form>
            )}

            {view === 'forgot' && (
              <div>
                <h2>Forgot Password</h2>
                <div className="input-group">
                  <input type="text" placeholder="Enter Email or Phone" value={contact} onChange={e => setContact(e.target.value)} />
                </div>
                <button className="btn-primary" type="button" onClick={sendOtp}>Send OTP</button>
                {otpSent && (
                  <div>
                    <div className="input-group" style={{ marginTop: 15 }}>
                      <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
                    </div>
                    <button className="btn-primary" type="button" onClick={verifyOtp}>Verify OTP</button>
                  </div>
                )}
                <span onClick={() => { setView('auth'); setActiveTab(0); }} className="forgot-password-link">Back to Login</span>
              </div>
            )}

            {view === 'reset' && (
              <div>
                <h2>Reset Password</h2>
                <PasswordInput id="newpass" placeholder="New Password" value={newPass} onChange={e => setNewPass(e.target.value)} />
                {resetPassError && <div className="error-msg" style={{ display: 'block', marginTop: -10, marginBottom: 10 }}>{resetPassError}</div>}
                <PasswordInput id="confpass" placeholder="Confirm Password" value={confPass} onChange={e => setConfPass(e.target.value)} />
                {resetConfError && <div className="error-msg" style={{ display: 'block', marginTop: -10, marginBottom: 10 }}>{resetConfError}</div>}
                <button className="btn-primary" type="button" onClick={resetPassword}>Reset Password</button>
              </div>
            )}
          </div>
        </div>

        <a href="#stats" className="scroll-indicator reveal">
          Scroll to Explore
          <i className="fa-solid fa-chevron-down" />
        </a>
      </section>

      <section className="stats-section" id="stats">
        <div className="stat-box reveal"><h2>10k+</h2><p>Active Teams</p></div>
        <div className="stat-box reveal"><h2>2M+</h2><p>Tasks Completed</p></div>
        <div className="stat-box reveal"><h2>99.9%</h2><p>Uptime Guarantee</p></div>
      </section>

      <section className="features-section" id="features">
        <div className="section-title reveal">
          <h2>Why Choose TMS?</h2>
          <p>Everything you need to manage projects, track progress, and collaborate with your team in one unified workspace.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card reveal">
            <div className="feature-icon"><i className="fa-solid fa-layer-group" /></div>
            <h3>Smart Task Management</h3>
            <p>Organize work your way. Create lists, set priorities, assign team members, and track progress through intuitive boards.</p>
          </div>
          <div className="feature-card reveal">
            <div className="feature-icon"><i className="fa-solid fa-chart-line" /></div>
            <h3>Advanced Reporting</h3>
            <p>Get visual insights into your team's productivity. Track completion rates, identify bottlenecks, and optimize your workflow.</p>
          </div>
          <div className="feature-card reveal">
            <div className="feature-icon"><i className="fa-solid fa-shield-cat" /></div>
            <h3>Role-Based Access</h3>
            <p>Complete control over who sees what. Create custom roles, manage permissions, and securely onboard clients.</p>
          </div>
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="section-title reveal">
          <h2>How It Works</h2>
          <p>From idea to execution in three simple steps.</p>
        </div>
        <div className="workflow-container">
          {[
            { n: 1, h: 'Create Your Workspace', p: 'Sign up, set up your company profile, and invite your team members. Assign specific roles and permissions.' },
            { n: 2, h: 'Organize Your Tasks', p: 'Break down projects into actionable tasks. Set deadlines, assign priorities, and categorize work.' },
            { n: 3, h: 'Track & Deliver', p: 'Move tasks through customized stages. Watch deliverables in real-time with instant synchronization.' },
          ].map(({ n, h, p }) => (
            <div className="workflow-step reveal" key={n}>
              <div className="step-number">{n}</div>
              <div className="step-content"><h3>{h}</h3><p>{p}</p></div>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-content">
          <div className="footer-col">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/images/tms.svg" width="25" alt="" /> TMS Workspace
            </h4>
            <p style={{ maxWidth: 300 }}>Platform to streamline your business operations and supercharge team productivity.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4><a href="#">Features</a><a href="#">Pricing</a><a href="#">Integrations</a>
          </div>
          <div className="footer-col">
            <h4>Resources</h4><a href="#">Help Center</a><a href="#">API Documentation</a><a href="#">Community</a>
          </div>
          <div className="footer-col">
            <h4>Company</h4><a href="#">About Us</a><a href="#">Careers</a><a href="#">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">&copy; 2026 TMS Workspace. All rights reserved.</div>
      </footer>
    </>
  );
}

const CSS = `
* { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
html { scroll-behavior:smooth; }
body { background:#0f172a; color:#f8fafc; overflow-x:hidden; }
.bg-graphics { position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:0; pointer-events:none; overflow:hidden; }
.bg-mesh { position:absolute; width:100%; height:100%; background-image:radial-gradient(at 0% 0%,rgba(20,184,166,.12) 0px,transparent 50%),radial-gradient(at 100% 0%,rgba(2,132,199,.12) 0px,transparent 50%),radial-gradient(at 100% 100%,rgba(15,118,110,.15) 0px,transparent 50%),radial-gradient(at 0% 100%,rgba(3,105,161,.12) 0px,transparent 50%); }
.shape { position:absolute; filter:blur(90px); border-radius:50%; opacity:.5; animation:drift 20s infinite alternate ease-in-out; }
.shape-1 { top:-10%; left:-10%; width:45vw; height:45vw; background:#2dd4bf; }
.shape-2 { bottom:-20%; right:-10%; width:55vw; height:55vw; background:#0ea5e9; animation-delay:-5s; }
.shape-3 { top:30%; left:50%; width:35vw; height:35vw; background:#10b981; opacity:.3; animation-delay:-10s; }
.shape-4 { top:70%; left:-5%; width:25vw; height:25vw; background:#6366f1; opacity:.4; animation-delay:-7s; }
@keyframes drift { 0%{transform:scale(1) translate(0,0) rotate(0deg)} 50%{transform:scale(1.2) translate(8vw,8vh) rotate(180deg)} 100%{transform:scale(.9) translate(-8vw,-8vh) rotate(360deg)} }
.floating-element { position:absolute; background:rgba(255,255,255,.05); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,.1); padding:12px 20px; border-radius:12px; display:flex; align-items:center; gap:12px; box-shadow:0 8px 32px rgba(0,0,0,.2); animation:float 6s ease-in-out infinite; z-index:1; }
.float-1 { top:20vh; left:8vw; animation-delay:0s; }
.float-2 { top:65vh; right:8vw; animation-delay:2s; }
.float-3 { bottom:12vh; left:12vw; animation-delay:4s; }
.floating-element i { font-size:24px; }
.floating-element div { display:flex; flex-direction:column; }
.floating-element span.title { font-weight:600; font-size:14px; }
.floating-element span.desc { font-size:12px; color:#94a3b8; }
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
nav { position:fixed; top:0; width:100%; padding:20px 50px; display:flex; justify-content:space-between; align-items:center; z-index:100; background:rgba(15,23,42,.5); backdrop-filter:blur(15px); border-bottom:1px solid rgba(255,255,255,.05); }
.nav-brand { display:flex; align-items:center; gap:12px; font-size:24px; font-weight:800; color:#fff; text-decoration:none; }
.nav-brand img { width:35px; border-radius:50%; }
.reveal { opacity:0; transform:translateY(40px); transition:all .8s ease-out; }
.reveal.active { opacity:1; transform:translateY(0); }
.hero-section { position:relative; min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:100px 20px 40px; z-index:10; }
.hero-content { text-align:center; margin-bottom:40px; }
.hero-content h1 { font-size:clamp(2.5rem,5vw,4.5rem); font-weight:800; background:linear-gradient(to right,#2dd4bf,#0ea5e9); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.auth-wrapper { animation:fadeIn 1.2s ease-out forwards; }
.container { width:420px; background:#fff; border-radius:12px; padding:25px; box-shadow:0 20px 50px rgba(0,0,0,.4); color:#333; }
.logo-container { text-align:center; margin-bottom:20px; }
.logo-container img { width:80px; height:80px; object-fit:cover; border-radius:50%; border:3px solid #14b8a6; }
.tabs { display:flex; position:relative; border-bottom:2px solid #e5e5e5; margin-bottom:20px; }
.tab { flex:1; text-align:center; padding:10px; cursor:pointer; font-weight:bold; color:#666; }
.tab.active { color:#0f766e; }
.underline { position:absolute; bottom:-2px; left:0; width:50%; height:3px; background:#14b8a6; transition:.3s; }
.input-group { margin-bottom:15px; position:relative; }
.input-group input, .input-group select { width:100%; padding:10px; border-radius:6px; border:1px solid #ccc; outline:none; }
button { width:100%; padding:11px; border:none; border-radius:6px; background:#14b8a6; color:#fff; font-size:15px; cursor:pointer; transition:.3s; }
button:hover { background:#0f766e; }
.forgot-password-link { display:block; text-align:center; margin-top:16px; font-size:15px; color:#0f766e; cursor:pointer; }
.error-msg { color:#ff4d4d; font-size:11px; margin-top:4px; display:none; }
.dialog-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,.65); backdrop-filter:blur(4px); display:none; justify-content:center; align-items:center; z-index:9999; }
.modal-content { background:#fff; width:340px; padding:25px; border-radius:12px; text-align:center; box-shadow:0 15px 40px rgba(0,0,0,.25); color:#333; }
.stats-section { padding:60px 20px; background:rgba(255,255,255,.02); display:flex; justify-content:center; gap:8vw; flex-wrap:wrap; }
.stat-box h2 { font-size:3rem; color:#2dd4bf; }
.features-section { padding:120px 20px; display:flex; flex-direction:column; align-items:center; }
.features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:30px; max-width:1200px; width:100%; }
.feature-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.05); padding:40px 30px; border-radius:20px; text-align:center; }
.workflow-section { padding:100px 20px; background:rgba(0,0,0,.2); display:flex; flex-direction:column; align-items:center; }
.workflow-container { max-width:1000px; width:100%; display:flex; flex-direction:column; gap:40px; }
.workflow-step { display:flex; align-items:center; gap:30px; }
.step-number { width:60px; height:60px; background:#0f172a; border:2px solid #14b8a6; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; color:#2dd4bf; }
.step-content { background:rgba(255,255,255,.03); padding:25px; border-radius:16px; flex:1; }
footer { background:#090e17; padding:60px 20px 20px; }
.footer-content { max-width:1200px; margin:0 auto; display:flex; justify-content:space-between; flex-wrap:wrap; gap:40px; }
.footer-col a { color:#94a3b8; text-decoration:none; display:block; margin-bottom:10px; }
`;