// Settings.jsx
// Reads session from /api/auth/session (adminName / userName / email / role)
// API base auto-switches between localhost:5000 and production

import React, { useState, useEffect } from 'react';

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live';   // same origin in production

// ─── API helper ───────────────────────────────────────────────────────────────
function api(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  return fetch(BASE_URL + path, {
    credentials: 'include',
    headers: isForm ? {} : { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
}

// ─── OTP generator ───────────────────────────────────────────────────────────
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passRx  = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  primary:  '#085041',
  mid:      '#0f6e56',
  brand:    '#1d9e75',
  light:    '#5dcaa5',
  bg50:     '#e1f5ee',
  bg25:     '#f0faf6',
  border:   'rgba(29,158,117,0.18)',
  text:     '#0b3d3a',
  muted:    '#5f5e5a',
  faint:    '#94a3b8',
  page:     '#f0f6f4',
  danger:   '#d9534f',
  dangerBg: '#fef2f2',
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: '', type: 'success', show: false });
  function showToast(msg, type = 'success') {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }
  return { toast, showToast };
}

// ─── EyeIcon ─────────────────────────────────────────────────────────────────
function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ─── PasswordInput ────────────────────────────────────────────────────────────
function PasswordInput({ label, value, onChange, error, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={S.label}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{ ...S.input, paddingRight: 44 }}
          className={`sett-input${error ? ' sett-input-err' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: T.faint, padding: 4,
          }}
        >
          <EyeIcon visible={show} />
        </button>
      </div>
      {error && <p style={S.errText}>{error}</p>}
    </div>
  );
}

// ─── OTP Input ────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange, error }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>Verification Code</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={onChange}
        placeholder="Enter 6-digit OTP"
        maxLength={6}
        style={{ ...S.input, letterSpacing: 6, fontSize: 20, textAlign: 'center', fontWeight: 700 }}
        className={`sett-input${error ? ' sett-input-err' : ''}`}
      />
      {error && <p style={S.errText}>{error}</p>}
    </div>
  );
}

// ─── PrimaryBtn ───────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading, danger, type = 'button', style: extraStyle = {} }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%', padding: '14px', border: 'none', borderRadius: 14,
        background: danger
          ? `linear-gradient(135deg, #a32d2d, ${T.danger})`
          : `linear-gradient(135deg, ${T.primary}, ${T.brand})`,
        color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
        boxShadow: danger ? '0 4px 16px rgba(163,45,45,0.25)' : `0 4px 16px rgba(15,110,86,0.25)`,
        transition: 'opacity .2s, transform .15s',
        ...extraStyle,
      }}
      onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(.98)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function GhostBtn({ children, onClick, style: extra = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', padding: '13px', border: `1.5px solid ${T.border}`, borderRadius: 14,
        background: 'transparent', color: T.mid, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'background .2s', ...extra,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.bg25; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─── Bottom Sheet Modal ───────────────────────────────────────────────────────
function Sheet({ open, onClose, title, children, accentColor }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div
        style={S.sheet}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={S.sheetPill} />
        <div style={S.sheetHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: accentColor || `linear-gradient(135deg, ${T.primary}, ${T.brand})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {accentColor
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              }
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{title}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.bg50, border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', color: T.mid,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '0 4px' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function Steps({ current, total, labels }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22, gap: 0 }}>
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i <= current ? `linear-gradient(135deg, ${T.primary}, ${T.brand})` : T.bg50,
              color: i <= current ? '#fff' : T.faint,
              boxShadow: i === current ? `0 2px 10px rgba(15,110,86,0.35)` : 'none',
              transition: 'all .3s',
            }}>
              {i < current
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                : i + 1}
            </div>
            {labels && (
              <div style={{
                fontSize: 9, color: i <= current ? T.mid : T.faint,
                marginTop: 3, fontWeight: 600, textAlign: 'center', letterSpacing: 0.3,
              }}>
                {labels[i]}
              </div>
            )}
          </div>
          {i < total - 1 && (
            <div style={{
              flex: 2, height: 2,
              background: i < current ? T.brand : T.bg50,
              transition: 'background .3s',
              marginBottom: labels ? 14 : 0,
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── OTP Sent Banner ─────────────────────────────────────────────────────────
function OtpBanner({ email }) {
  return (
    <div style={{
      background: T.bg50, borderRadius: 12, padding: '12px 14px', marginBottom: 18,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: T.brand, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2,4 12,13 22,4"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.primary, marginBottom: 2 }}>OTP sent successfully</div>
        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
          Check your inbox at <strong style={{ color: T.mid }}>{email}</strong>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CHANGE PASSWORD SHEET
// ─────────────────────────────────────────────────────────────────────────────
function ChangePasswordSheet({ open, onClose, userEmail, showToast }) {
  const [step, setStep]         = useState(0);
  const [otp, setOtp]           = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [confPwd, setConfPwd]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState({});

  function reset() {
    setStep(0); setOtp(''); setOtpInput(''); setNewPwd(''); setConfPwd(''); setErr({});
  }
  function handleClose() { reset(); onClose(); }

  async function sendOtp() {
    setLoading(true);
    const g = generateOtp();
    setOtp(g);
    try {
      const res = await api('/api/settings/send-otp', {
        method: 'POST',
        body: JSON.stringify({ contact: userEmail, otp: g, sent_for: 'change_password' }),
      });
      const data = await res.json();
      if (data.success) {
        setStep(1);
      } else {
        showToast(data.message || 'Failed to send OTP.', 'error');
      }
    } catch {
      showToast('Network error. Check your connection.', 'error');
    }
    setLoading(false);
  }

  function verifyOtp() {
    if (!otpInput.trim()) { setErr({ otp: 'Enter the OTP.' }); return; }
    if (otpInput.trim() !== otp) { setErr({ otp: 'Invalid OTP. Try again.' }); setOtpInput(''); return; }
    setErr({});
    setStep(2);
  }

  async function changePassword() {
    const errs = {};
    if (!passRx.test(newPwd)) errs.newPwd = 'Min 8 chars, 1 uppercase, 1 lowercase, 1 number.';
    if (newPwd !== confPwd)   errs.confPwd = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErr(errs); return; }

    setLoading(true);
    try {
      const res  = await api('/api/settings/change-password', {
        method: 'POST',
        body: JSON.stringify({ new_password: newPwd }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Password updated successfully ✅');
        handleClose();
      } else {
        showToast(data.message || 'Update failed.', 'error');
      }
    } catch {
      showToast('Network error. Try again.', 'error');
    }
    setLoading(false);
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Change Password">
      <Steps current={step} total={3} labels={['Send OTP', 'Verify', 'Reset']} />

      {step === 0 && (
        <>
          <div style={S.infoBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
              We'll send a verification code to <strong style={{ color: T.primary }}>{userEmail}</strong>
            </div>
          </div>
          <PrimaryBtn onClick={sendOtp} loading={loading}>Send Verification OTP</PrimaryBtn>
          <GhostBtn onClick={handleClose} style={{ marginTop: 10 }}>Cancel</GhostBtn>
        </>
      )}

      {step === 1 && (
        <>
          <OtpBanner email={userEmail} />
          <OtpInput
            value={otpInput}
            onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setErr({}); }}
            error={err.otp}
          />
          <PrimaryBtn onClick={verifyOtp}>Verify OTP</PrimaryBtn>
          <GhostBtn onClick={() => { setOtpInput(''); setErr({}); setStep(0); }} style={{ marginTop: 10 }}>Resend OTP</GhostBtn>
        </>
      )}

      {step === 2 && (
        <>
          <PasswordInput
            label="New Password"
            value={newPwd}
            onChange={e => { setNewPwd(e.target.value); setErr(v => ({ ...v, newPwd: '' })); }}
            error={err.newPwd}
            placeholder="Min 8 characters"
          />
          <PasswordInput
            label="Confirm Password"
            value={confPwd}
            onChange={e => { setConfPwd(e.target.value); setErr(v => ({ ...v, confPwd: '' })); }}
            error={err.confPwd}
            placeholder="Repeat new password"
          />
          <PrimaryBtn onClick={changePassword} loading={loading}>Update Password</PrimaryBtn>
          <GhostBtn onClick={handleClose} style={{ marginTop: 10 }}>Cancel</GhostBtn>
        </>
      )}
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CHANGE EMAIL SHEET
// ─────────────────────────────────────────────────────────────────────────────
function ChangeEmailSheet({ open, onClose, userEmail, onEmailChanged, showToast }) {
  const [step, setStep]               = useState(0);
  const [curOtp, setCurOtp]           = useState('');
  const [curOtpInput, setCurOtpInput] = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [newOtp, setNewOtp]           = useState('');
  const [newOtpInput, setNewOtpInput] = useState('');
  const [loading, setLoading]         = useState(false);
  const [err, setErr]                 = useState({});

  function reset() {
    setStep(0); setCurOtp(''); setCurOtpInput(''); setNewEmail('');
    setNewOtp(''); setNewOtpInput(''); setErr({});
  }
  function handleClose() { reset(); onClose(); }

  async function sendCurrentOtp() {
    setLoading(true);
    const g = generateOtp(); setCurOtp(g);
    try {
      const res = await api('/api/settings/send-otp', {
        method: 'POST',
        body: JSON.stringify({ contact: userEmail, otp: g, sent_for: 'change_email' }),
      });
      const data = await res.json();
      if (data.success) setStep(1);
      else showToast(data.message || 'Failed to send OTP.', 'error');
    } catch { showToast('Network error. Check your connection.', 'error'); }
    setLoading(false);
  }

  function verifyCurOtp() {
    if (!curOtpInput.trim()) { setErr({ curOtp: 'Enter the OTP.' }); return; }
    if (curOtpInput.trim() !== curOtp) { setErr({ curOtp: 'Invalid OTP.' }); setCurOtpInput(''); return; }
    setErr({}); setStep(2);
  }

  async function sendNewOtp() {
    if (!emailRx.test(newEmail)) { setErr({ newEmail: 'Enter a valid email address.' }); return; }
    if (newEmail === userEmail)  { setErr({ newEmail: 'New email must differ from current.' }); return; }
    setLoading(true);
    const g = generateOtp(); setNewOtp(g);
    try {
      const res = await api('/api/settings/send-otp', {
        method: 'POST',
        body: JSON.stringify({ contact: newEmail, otp: g, sent_for: 'change_email' }),
      });
      const data = await res.json();
      if (data.success) setStep(3);
      else showToast(data.message || 'Failed to send OTP.', 'error');
    } catch { showToast('Network error. Check your connection.', 'error'); }
    setLoading(false);
  }

  async function verifyNewAndChange() {
    if (!newOtpInput.trim()) { setErr({ newOtp: 'Enter the OTP.' }); return; }
    if (newOtpInput.trim() !== newOtp) { setErr({ newOtp: 'Invalid OTP.' }); setNewOtpInput(''); return; }
    setLoading(true);
    try {
      const res  = await api('/api/settings/change-email', {
        method: 'POST',
        body: JSON.stringify({ new_email: newEmail }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Email updated successfully ✅');
        onEmailChanged(newEmail);
        handleClose();
      } else {
        showToast(data.message || 'Update failed.', 'error');
      }
    } catch { showToast('Network error. Try again.', 'error'); }
    setLoading(false);
  }

  return (
    <Sheet open={open} onClose={handleClose} title="Change Email">
      <Steps current={step} total={4} labels={['Verify', 'Confirm', 'New Email', 'Done']} />

      {step === 0 && (
        <>
          <div style={S.infoBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>
              First, verify your current email:<br/>
              <strong style={{ color: T.primary }}>{userEmail}</strong>
            </div>
          </div>
          <PrimaryBtn onClick={sendCurrentOtp} loading={loading}>Send OTP to Current Email</PrimaryBtn>
          <GhostBtn onClick={handleClose} style={{ marginTop: 10 }}>Cancel</GhostBtn>
        </>
      )}

      {step === 1 && (
        <>
          <OtpBanner email={userEmail} />
          <OtpInput
            value={curOtpInput}
            onChange={e => { setCurOtpInput(e.target.value.replace(/\D/g, '')); setErr({}); }}
            error={err.curOtp}
          />
          <PrimaryBtn onClick={verifyCurOtp}>Verify OTP</PrimaryBtn>
          <GhostBtn onClick={() => { setCurOtpInput(''); setErr({}); setStep(0); }} style={{ marginTop: 10 }}>Resend OTP</GhostBtn>
        </>
      )}

      {step === 2 && (
        <>
          <div style={S.successBanner}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{ fontSize: 13, color: T.primary, fontWeight: 600 }}>Current email verified!</span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>New Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setErr({}); }}
              placeholder="Enter new email address"
              style={S.input}
              className={`sett-input${err.newEmail ? ' sett-input-err' : ''}`}
            />
            {err.newEmail && <p style={S.errText}>{err.newEmail}</p>}
          </div>
          <PrimaryBtn onClick={sendNewOtp} loading={loading}>Send OTP to New Email</PrimaryBtn>
          <GhostBtn onClick={handleClose} style={{ marginTop: 10 }}>Cancel</GhostBtn>
        </>
      )}

      {step === 3 && (
        <>
          <OtpBanner email={newEmail} />
          <OtpInput
            value={newOtpInput}
            onChange={e => { setNewOtpInput(e.target.value.replace(/\D/g, '')); setErr({}); }}
            error={err.newOtp}
          />
          <PrimaryBtn onClick={verifyNewAndChange} loading={loading}>Confirm & Change Email</PrimaryBtn>
          <GhostBtn onClick={() => setStep(2)} style={{ marginTop: 10 }}>Back</GhostBtn>
        </>
      )}
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOGOUT CONFIRM SHEET
// ─────────────────────────────────────────────────────────────────────────────
function LogoutSheet({ open, onClose, userEmail, onLogout }) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await api('/api/settings/logout', { method: 'POST' });
    } catch {}
    onLogout();
    setLoading(false);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Confirm Logout">
      <div style={{ textAlign: 'center', padding: '8px 0 22px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#fff3cd',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </div>
        <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, margin: '0 0 20px' }}>
          You'll be signed out of your account<br/>
          <strong style={{ color: T.primary }}>{userEmail}</strong>
        </p>
        <PrimaryBtn danger onClick={handleLogout} loading={loading}>Yes, Logout</PrimaryBtn>
        <GhostBtn onClick={onClose} style={{ marginTop: 10 }}>Stay Logged In</GhostBtn>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE PROFILE SHEET
// ─────────────────────────────────────────────────────────────────────────────
function DeleteProfileSheet({ open, onClose, userEmail, isAdmin, showToast, onDeleted }) {
  const [step, setStep]         = useState(0);
  const [otp, setOtp]           = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState({});

  function reset() { setStep(0); setOtp(''); setOtpInput(''); setErr({}); }
  function handleClose() { reset(); onClose(); }

  async function sendOtp() {
    setLoading(true);
    const g = generateOtp(); setOtp(g);
    try {
      const res = await api('/api/settings/send-otp', {
        method: 'POST',
        body: JSON.stringify({ contact: userEmail, otp: g, sent_for: 'delete_profile' }),
      });
      const data = await res.json();
      if (data.success) setStep(1);
      else showToast(data.message || 'Failed to send OTP.', 'error');
    } catch { showToast('Network error. Check your connection.', 'error'); }
    setLoading(false);
  }

  async function verifyAndDelete() {
    if (!otpInput.trim()) { setErr({ otp: 'Enter the OTP.' }); return; }
    if (otpInput.trim() !== otp) { setErr({ otp: 'Invalid OTP.' }); setOtpInput(''); return; }
    setLoading(true);
    try {
      const res  = await api('/api/settings/delete-profile', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Profile deleted.'); onDeleted(); }
      else showToast(data.message || 'Delete failed.', 'error');
    } catch { showToast('Network error.', 'error'); }
    setLoading(false);
  }

  if (!isAdmin) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title="Delete Profile"
        accentColor="linear-gradient(135deg, #a32d2d, #d9534f)"
      >
        <div style={{ textAlign: 'center', padding: '8px 0 22px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, margin: '0 0 20px' }}>
            Please contact your <strong style={{ color: T.primary }}>admin</strong> to remove your profile.
          </p>
          <PrimaryBtn onClick={onClose}>Understood</PrimaryBtn>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Delete Profile"
      accentColor="linear-gradient(135deg, #a32d2d, #d9534f)"
    >
      <Steps current={step} total={2} labels={['Send OTP', 'Confirm']} />

      {step === 0 && (
        <>
          <div style={{ ...S.infoBanner, background: '#fef2f2', borderColor: 'rgba(217,83,79,0.2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>
              <strong>This action is permanent.</strong> All your data and employees will be deleted.
              A verification code will be sent to <strong>{userEmail}</strong>.
            </div>
          </div>
          <PrimaryBtn danger onClick={sendOtp} loading={loading}>Send Verification OTP</PrimaryBtn>
          <GhostBtn onClick={handleClose} style={{ marginTop: 10 }}>Cancel</GhostBtn>
        </>
      )}

      {step === 1 && (
        <>
          <OtpBanner email={userEmail} />
          <OtpInput
            value={otpInput}
            onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setErr({}); }}
            error={err.otp}
          />
          <PrimaryBtn danger onClick={verifyAndDelete} loading={loading}>Confirm Permanent Deletion</PrimaryBtn>
          <GhostBtn onClick={handleClose} style={{ marginTop: 10 }}>Cancel</GhostBtn>
        </>
      )}
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SETTINGS ITEM
// ─────────────────────────────────────────────────────────────────────────────
function SettingsItem({ icon, label, subtitle, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 18px',
        borderBottom: `0.5px solid ${T.border}`,
        textAlign: 'left', fontFamily: 'inherit',
        transition: 'background .15s',
      }}
      className="sett-item"
      onMouseEnter={e => { e.currentTarget.style.background = danger ? '#fef2f2' : T.bg25; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 14, flexShrink: 0,
        background: danger ? '#fef2f2' : T.bg50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `0.5px solid ${danger ? 'rgba(217,83,79,0.2)' : T.border}`,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: danger ? T.danger : T.text,
          marginBottom: subtitle ? 2 : 0,
        }}>
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11.5, color: T.faint, lineHeight: 1.4, wordBreak: 'break-all' }}>{subtitle}</div>
        )}
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={danger ? T.danger : T.faint} strokeWidth="2.5" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage({ onLogout }) {
  // ── Fetch session on mount ──────────────────────────────────────────────────
  const [session, setSession]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    api('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.loggedIn) {
          setSession(data);
          setUserEmail(data.email || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Derive name / role from session ────────────────────────────────────────
  // auth.js stores adminName for admin, userName for user
  const userName  = session?.adminName || session?.userName || session?.name || '';
  const userRole  = session?.role || 'user';
  const isAdmin   = userRole === 'admin';
  const initial   = userName?.[0]?.toUpperCase() || '?';

  // ── Sheet open state ────────────────────────────────────────────────────────
  const [pwdOpen,    setPwdOpen]    = useState(false);
  const [emailOpen,  setEmailOpen]  = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { toast, showToast } = useToast();

  // ── Handle logout ───────────────────────────────────────────────────────────
  function handleLogout() {
    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      window.location.href = '/';
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: T.page, fontFamily: "'DM Sans', sans-serif", color: T.muted, fontSize: 15,
      }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{CSS}</style>

      {/* ── Header Banner ── */}
      <div style={S.banner}>
        <div style={S.bannerInner}>
          <div style={S.avatarWrap}>
            <div style={S.avatar}>{initial}</div>
            <div style={S.avatarRing} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={S.bannerName}>{userName || 'Your Account'}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 5 }}>
              <span style={S.roleBadge}>{isAdmin ? 'Admin' : 'Member'}</span>
              <span style={S.emailBadge}>{userEmail}</span>
            </div>
          </div>
        </div>
        {/* Decorative wave */}
        <svg
          viewBox="0 0 390 38"
          preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 38, display: 'block' }}
        >
          <path d="M0 38 Q98 0 195 18 Q292 36 390 8 L390 38 Z" fill={T.page} />
        </svg>
      </div>

      {/* ── Body ── */}
      <div style={S.body}>

        {/* Account */}
        <div style={S.sectionLabel}>Account</div>
        <div style={S.card}>
          <SettingsItem
            label="Change Password"
            subtitle="Update your login password"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            }
            onClick={() => setPwdOpen(true)}
          />
          <SettingsItem
            label="Change Email"
            subtitle={`Current: ${userEmail}`}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="3"/>
                <polyline points="2,4 12,13 22,4"/>
              </svg>
            }
            onClick={() => setEmailOpen(true)}
          />
        </div>

        {/* Session */}
        <div style={S.sectionLabel}>Session</div>
        <div style={S.card}>
          <SettingsItem
            label="Logout"
            subtitle="Sign out from this device"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            }
            onClick={() => setLogoutOpen(true)}
          />
        </div>

        {/* Danger Zone */}
        <div style={S.sectionLabel}>Danger Zone</div>
        <div style={{ ...S.card, borderColor: 'rgba(217,83,79,0.2)' }}>
          <SettingsItem
            label="Delete Profile"
            subtitle={
              isAdmin
                ? 'Permanently delete your account & data'
                : 'Contact admin to remove your account'
            }
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.danger} strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            }
            onClick={() => setDeleteOpen(true)}
            danger
          />
        </div>

        {/* App info */}
        <div style={S.appInfo}>
          <div style={S.appInfoDot}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.mid }}>TMS Workspace</div>
            <div style={{ fontSize: 11, color: T.faint, marginTop: 1 }}>Version 2.0 · © 2026 All rights reserved</div>
          </div>
        </div>

      </div>

      {/* ── Sheets ── */}
      <ChangePasswordSheet
        open={pwdOpen}
        onClose={() => setPwdOpen(false)}
        userEmail={userEmail}
        showToast={showToast}
      />
      <ChangeEmailSheet
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        userEmail={userEmail}
        onEmailChanged={setUserEmail}
        showToast={showToast}
      />
      <LogoutSheet
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      <DeleteProfileSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        userEmail={userEmail}
        isAdmin={isAdmin}
        showToast={showToast}
        onDeleted={handleLogout}
      />

      {/* ── Toast ── */}
      <div
        className={`sett-toast${toast.show ? ' show' : ''}`}
        style={{ background: toast.type === 'error' ? '#a32d2d' : T.primary }}
        role="alert"
        aria-live="polite"
      >
        <span style={{ marginRight: 8, display: 'inline-flex', alignItems: 'center' }}>
          {toast.type === 'error'
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9fe1cb" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          }
        </span>
        {toast.msg}
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100%',
    background: T.page,
    fontFamily: "'DM Sans', 'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    paddingBottom: 100,
  },
  banner: {
    background: `linear-gradient(150deg, ${T.primary} 0%, ${T.mid} 50%, ${T.brand} 100%)`,
    padding: '36px 20px 56px',
    position: 'relative', overflow: 'hidden',
  },
  bannerInner: {
    maxWidth: 560, margin: '0 auto',
    display: 'flex', alignItems: 'center', gap: 16,
    position: 'relative', zIndex: 1,
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 68, height: 68, borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)',
    border: '2.5px solid rgba(255,255,255,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, fontWeight: 800, color: '#fff',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  avatarRing: {
    position: 'absolute', inset: -4, borderRadius: '50%',
    border: '1.5px solid rgba(255,255,255,0.15)',
  },
  bannerName: {
    margin: 0, fontSize: 20, fontWeight: 800, color: '#fff',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  roleBadge: {
    background: 'rgba(255,255,255,0.16)', color: '#d1faf5',
    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
    letterSpacing: 0.6, backdropFilter: 'blur(4px)',
  },
  emailBadge: {
    color: 'rgba(255,255,255,0.65)', fontSize: 11,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    maxWidth: 180,
  },
  body: {
    maxWidth: 560, margin: '-18px auto 0',
    padding: '0 14px',
    position: 'relative', zIndex: 2,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: 800, color: T.faint,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 6, marginTop: 20, paddingLeft: 4,
  },
  card: {
    background: '#fff', borderRadius: 18, overflow: 'hidden',
    boxShadow: `0 1px 12px rgba(8,80,65,0.07), 0 0 0 0.5px ${T.border}`,
    marginBottom: 4,
  },
  appInfo: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '24px auto 0', maxWidth: 280,
    justifyContent: 'center', opacity: 0.6,
  },
  appInfoDot: {
    width: 32, height: 32, borderRadius: '50%',
    background: `linear-gradient(135deg, ${T.primary}, ${T.brand})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  // Sheet
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(4,52,44,0.52)', zIndex: 1300,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 540,
    background: '#fff',
    borderRadius: '22px 22px 0 0',
    padding: '0 20px 48px',
    maxHeight: '92dvh', overflowY: 'auto',
    boxSizing: 'border-box',
    boxShadow: '0 -8px 48px rgba(4,52,44,0.18)',
    WebkitOverflowScrolling: 'touch',
    animation: 'settSlide .3s ease',
  },
  sheetPill: {
    width: 40, height: 4, background: T.bg50, borderRadius: 4, margin: '12px auto 0',
  },
  sheetHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, marginBottom: 20,
  },
  // Form
  label: {
    display: 'block', fontSize: 10.5, fontWeight: 800, color: T.mid,
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5,
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 14px', border: `1.5px solid ${T.border}`,
    borderRadius: 12, fontSize: 15, fontFamily: 'inherit',
    color: T.text, background: T.bg25, outline: 'none',
    transition: 'border-color .18s, box-shadow .18s',
    WebkitAppearance: 'none',
  },
  errText: { fontSize: 11.5, color: '#a32d2d', marginTop: 5, fontWeight: 600 },
  infoBanner: {
    background: T.bg50, borderRadius: 12, padding: '12px 14px', marginBottom: 18,
    display: 'flex', alignItems: 'flex-start', gap: 10,
    border: `0.5px solid ${T.border}`,
  },
  successBanner: {
    background: T.bg50, borderRadius: 12, padding: '10px 14px', marginBottom: 18,
    display: 'flex', alignItems: 'center', gap: 8,
    border: `0.5px solid ${T.border}`,
  },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

  @keyframes settSlide {
    from { transform: translateY(64px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes settShake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    60%     { transform: translateX(6px); }
  }

  .sett-input:focus {
    border-color: #1d9e75 !important;
    box-shadow: 0 0 0 3px rgba(29,158,117,0.14) !important;
    background: #fff !important;
  }
  .sett-input-err {
    border-color: #e24b4a !important;
    animation: settShake .36s ease;
  }

  /* last item no border */
  .sett-item:last-child { border-bottom: none !important; }

  /* Toast */
  .sett-toast {
    position: fixed;
    bottom: -80px;
    left: 50%;
    transform: translateX(-50%);
    color: #fff;
    padding: 11px 22px;
    border-radius: 32px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
    box-shadow: 0 6px 28px rgba(4,52,44,0.24);
    z-index: 9999;
    white-space: nowrap;
    display: flex;
    align-items: center;
    transition: bottom .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease;
    opacity: 0;
    pointer-events: none;
    max-width: calc(100vw - 40px);
  }
  .sett-toast.show {
    bottom: 96px;
    opacity: 1;
  }
  @media (min-width: 600px) {
    .sett-toast.show { bottom: 36px; }
  }
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .sett-toast.show {
      bottom: calc(96px + env(safe-area-inset-bottom));
    }
    @media (min-width: 600px) {
      .sett-toast.show { bottom: calc(36px + env(safe-area-inset-bottom)); }
    }
  }
  .sett-item { -webkit-tap-highlight-color: transparent; }

  /* Responsive sheet — centered on desktop */
  @media (min-width: 600px) {
    [role="dialog"] {
      border-radius: 22px !important;
      max-height: 85vh !important;
    }
    [style*="align-items: flex-end"] {
      align-items: center !important;
    }
  }
`;