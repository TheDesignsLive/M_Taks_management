// Profile.jsx  Updated to Teal & Black/Gray Theme
import React, { useState, useRef, useEffect } from 'react';
import { io as socketIO } from 'socket.io-client';

const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live';

function useToast() {
  const [toast, setToast] = useState({ msg: '', type: 'success', show: false });
  function showToast(msg, type = 'success') {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }
  return { toast, showToast };
}

// Profile.jsx — replace ONLY this Avatar function (around line 20)
// ✅ CHANGED: Use BASE_URL instead of hardcoded desktop URL
// Since mobile server now serves images from the shared folder via /public/images/
// the same filename works on both desktop (/images/file.jpg) and mobile (/public/images/file.jpg)

// Profile.jsx — replace ONLY the Avatar function

function Avatar({ profilePic, name, size = 88 }) {
  const [imgError, setImgError] = useState(false);
  const letter = name ? name.charAt(0).toUpperCase() : '?';

  if (profilePic && !imgError) {
    return (
      <img
        // ✅ Always load from DESKTOP server — that's where images physically live
        src={`https://tms.thedesigns.live/images/${profilePic}`}
        alt={name}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', display: 'block',
        }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(145deg, #0f172a 0%, #14b8a6 60%, #2dd4bf 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      flexShrink: 0, userSelect: 'none',
      letterSpacing: 1,
    }}>
      {letter}
    </div>
  );
}

function InfoRow({ icon, label, value, valueStyle }) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoIcon}>{icon}</div>
<div style={{ ...styles.infoText, textAlign: 'left' }}> {/* ✅ Added textAlign: 'left' */}        <div style={styles.infoLabel}>{label}</div>
        <div style={{ ...styles.infoValue, ...(valueStyle || {}) }}>{value || '—'}</div>
      </div>
    </div>
  );
}

export default function Profile() {
  const [profile, setProfile]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState('');
  const [editOpen, setEditOpen]             = useState(false);
  const [editName, setEditName]             = useState('');
  const [editPhone, setEditPhone]           = useState('');
  const [editCompany, setEditCompany]       = useState('');
  const [editFile, setEditFile]             = useState(null);
  const [editPreview, setEditPreview]       = useState(null);
  const [phoneError, setPhoneError]         = useState('');
  const [saving, setSaving]                 = useState(false);
  const [removeOpen, setRemoveOpen]         = useState(false);
  const [removing, setRemoving]             = useState(false);
  const fileRef = useRef(null);
  const { toast, showToast } = useToast();

useEffect(() => {
  fetch(`${BASE_URL}/api/profile`, { credentials: 'include' })
    .then(async r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(d => {
      if (d.success) {
        setProfile(d);
        setEditName(d.name || '');
        setEditPhone(d.phone || '');
        setEditCompany(d.company || '');
      } else {
        setFetchError(d.message || 'Failed to load profile.');
      }
    })
    .catch(() => setFetchError('Network error. Please check your connection.'))
    .finally(() => setLoading(false));
}, []);

useEffect(() => {
  const socket = socketIO(BASE_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
  socket.on('update_profile', () => {
    fetch(`${BASE_URL}/api/profile`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setProfile(d);
          setEditName(d.name || '');
          setEditPhone(d.phone || '');
          setEditCompany(d.company || '');
        }
      })
      .catch(() => {});
  });
  return () => { socket.disconnect(); };
}, []);

  function openEdit() {
    setEditName(profile.name || '');
    setEditPhone(profile.phone || '');
    setEditCompany(profile.company || '');
    setEditFile(null);
    setEditPreview(null);
    setPhoneError('');
    setEditOpen(true);
  }

  function handleFilePick(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.', 'error'); return; }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { showToast('Only JPG, PNG, WEBP allowed.', 'error'); return; }
    setEditFile(file);
    setEditPreview(URL.createObjectURL(file));
  }

  async function handleEditSubmit() {
    if (!editName.trim()) { showToast('Name is required.', 'error'); return; }
    if (editPhone && !/^\d{10}$/.test(editPhone)) {
      setPhoneError('Enter a valid 10-digit phone number.'); return;
    }
    setPhoneError('');
    setSaving(true);
    const formData = new FormData();
    formData.append('name', editName.trim());
    formData.append('phone', editPhone.trim());
    if (profile.isAdmin) formData.append('company', editCompany.trim());
    if (editFile) formData.append('profile_pic', editFile);
    try {
      const res = await fetch(`${BASE_URL}/api/profile/update-profile`, {
        method: 'POST', credentials: 'include', body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setProfile(prev => ({
          ...prev, name: data.name, phone: data.phone,
          company: data.company, profilePic: data.profilePic || prev.profilePic,
        }));
        setEditOpen(false);
        showToast('Profile updated successfully');
      } else {
        showToast(data.message || 'Update failed.', 'error');
      }
    } catch { showToast('Network error. Please try again.', 'error'); }
    setSaving(false);
  }

  async function handleRemovePic() {
    setRemoving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/profile/remove-picture`, {
        method: 'POST', credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setProfile(prev => ({ ...prev, profilePic: null }));
        setRemoveOpen(false);
        showToast('Profile picture removed.');
      } else {
        showToast(data.message || 'Could not remove picture.', 'error');
      }
    } catch { showToast('Network error. Please try again.', 'error'); }
    setRemoving(false);
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinnerRing}><div style={styles.spinnerArc} /></div>
        <p style={{ color: '#14b8a6', marginTop: 16, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
          Loading profile…
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={styles.centered}>
        <div style={styles.errorBox}>
          <div style={styles.errorIcon}><AlertIcon /></div>
          <p style={{ color: '#ff6b6b', margin: '0 0 16px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", textAlign: 'center', lineHeight: 1.6 }}>
            {fetchError}
          </p>
          <button style={styles.retryBtn} className="pg-retry" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.isAdmin;
  const isActive = profile?.status === 'Active';
  const statusColor = isActive ? '#14b8a6' : '#f59e0b';
  const statusBg    = isActive ? 'rgba(20, 184, 166, 0.15)' : 'rgba(245, 158, 11, 0.15)';

  return (
    <div style={styles.page}>
      <style>{CSS}</style>

      {/* ── BANNER ── */}
      <div style={styles.banner}>
        <div style={styles.bannerInner}>
          <div style={styles.avatarOuter}>
            <div style={styles.avatarInner}>
              <Avatar profilePic={profile?.profilePic} name={profile?.name} size={80} />
            </div>
          </div>

          <div style={styles.bannerText}>
            <h2 style={styles.bannerName}>{profile?.name}</h2>
            <div style={styles.bannerBadges}>
              <span style={styles.roleBadge}>
                {isAdmin ? 'Admin' : (profile?.userRoleName || 'Member')}
              </span>
              <span style={{ ...styles.statusBadge, color: statusColor, background: statusBg }}>
                {profile?.status || 'Active'}
              </span>
            </div>
          </div>

          <button style={styles.editFab} className="pg-fab" onClick={openEdit} aria-label="Edit Profile">
            <PencilIcon color="#fff" size={15} />
          </button>
        </div>

        {/* Wave curve bottom */}
        <svg viewBox="0 0 390 38" preserveAspectRatio="none"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: 38, display: 'block' }}>
          <path d="M0 38 Q98 0 195 18 Q292 36 390 8 L390 38 Z" fill="#3d3b3b" />
        </svg>
      </div>

      {/* ── CARDS ── */}
      <div style={styles.body}>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardAccent} />
            <span style={styles.cardTitle}>Personal information</span>
          </div>
          <InfoRow icon={<MailIcon />}       label="Email address"  value={profile?.email} />
          <InfoRow icon={<PhoneIcon />}     label="Phone number"   value={profile?.phone || 'Not added'} />
          <InfoRow icon={<BuildingIcon />} label="Company"         value={profile?.company || 'N/A'} />
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardAccent} />
            <span style={styles.cardTitle}>Account details</span>
          </div>
          <InfoRow icon={<ShieldIcon />} label="Account type"   value={isAdmin ? 'Admin' : 'User'} />
          {!isAdmin && (
            <InfoRow icon={<TagIcon />}  label="Role"           value={profile?.userRoleName || 'N/A'} />
          )}
          <InfoRow
            icon={<CircleIcon />}
            label="Account status"
            value={profile?.status || 'Active'}
            valueStyle={{ color: statusColor, fontWeight: 600 }}
          />
        </div>

        <button style={styles.editCta} className="pg-cta" onClick={openEdit}>
          <PencilIcon color="#fff" size={15} />
          <span style={{ marginLeft: 8 }}>Edit profile information</span>
        </button>
      </div>

      {/* ════ EDIT MODAL ════ */}
      {editOpen && (
        <div style={styles.backdrop} className="pg-backdrop" onClick={() => setEditOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={styles.modalPill} />

            <div style={styles.modalHead}>
              <div style={styles.modalTitle}>
                <div style={styles.modalTitleBadge}><PencilIcon color="#fff" size={13} /></div>
                Edit profile
              </div>
              <button style={styles.closeBtn} className="pg-close" onClick={() => setEditOpen(false)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>

            <div style={styles.avatarEditRow}>
              <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                {editPreview
                  ? <img src={editPreview} alt="preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '3px solid #14b8a6' }} />
                  : <Avatar profilePic={profile?.profilePic} name={editName || profile?.name} size={64} />
                }
                <button style={styles.camBtn} className="pg-cam" onClick={() => fileRef.current?.click()} aria-label="Change photo">
                  <CamIcon />
                </button>
              </div>
              <div style={{ marginLeft: 14, minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {editName || profile?.name || 'Your name'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Tap camera to change photo</div>
                {profile?.profilePic && (
                  <button style={styles.removePicBtn} className="pg-removepic"
                    onClick={() => { setEditOpen(false); setRemoveOpen(true); }}>
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <input type="file" ref={fileRef} accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handleFilePick} />

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Full name *</label>
              <input style={styles.formInput} className="pg-input" placeholder="Your full name"
                value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} autoComplete="name" />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone number</label>
              <input style={{ ...styles.formInput, ...(phoneError ? styles.inputErr : {}) }} className="pg-input"
                placeholder="10-digit number" value={editPhone}
                onChange={e => { setEditPhone(e.target.value.replace(/\D/g, '')); setPhoneError(''); }}
                maxLength={10} inputMode="numeric" autoComplete="tel" />
              {phoneError && <div style={styles.errText}>{phoneError}</div>}
            </div>

            {isAdmin && (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Company name</label>
                <input style={styles.formInput} className="pg-input" placeholder="Your company"
                  value={editCompany} onChange={e => setEditCompany(e.target.value)} maxLength={100} autoComplete="organization" />
              </div>
            )}

            <div style={styles.fileNote}>Supported: JPG, PNG, WEBP &nbsp;&middot;&nbsp; Max 5 MB</div>

            <div style={styles.modalFoot}>
              <button style={styles.btnCancel} className="pg-cancel" onClick={() => setEditOpen(false)}>Cancel</button>
              <button
                style={{ ...styles.btnSave, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                className="pg-save" onClick={handleEditSubmit} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ REMOVE PHOTO MODAL ════ */}
      {removeOpen && (
        <div style={styles.backdrop} className="pg-backdrop" onClick={() => setRemoveOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: 360, paddingBottom: 28 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={styles.modalPill} />
            <div style={{ textAlign: 'center', padding: '22px 12px 8px' }}>
              <div style={styles.removeIcon}><TrashIcon /></div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Remove profile picture?</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 22, lineHeight: 1.6 }}>
                Your photo will be removed and replaced with your initials.
              </div>
              <div style={styles.modalFoot}>
                <button style={styles.btnCancel} className="pg-cancel" onClick={() => setRemoveOpen(false)}>Keep it</button>
                <button
                  style={{ ...styles.btnSave, background: 'linear-gradient(135deg, #7f1d1d, #ef4444)', opacity: removing ? 0.7 : 1, cursor: removing ? 'not-allowed' : 'pointer' }}
                  className="pg-save" onClick={handleRemovePic} disabled={removing}>
                  {removing ? 'Removing…' : 'Yes, remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div
        className={`pg-toast${toast.show ? ' show' : ''}`}
        style={{ background: toast.type === 'error' ? '#ef4444' : '#14b8a6' }}
        role="alert" aria-live="polite"
      >
        <span style={styles.toastDot}>{toast.type === 'error' ? <DotErrorIcon /> : <DotOkIcon />}</span>
        {toast.msg}
      </div>
    </div>
  );
}

// ─── ICONS (Color updated to Teal) ───
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="16" height="16">
    <rect x="2" y="4" width="20" height="16" rx="3"/><polyline points="2,4 12,13 22,4"/>
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="16" height="16">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="16" height="16">
    <rect x="2" y="7" width="20" height="15" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="17"/><line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="16" height="16">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const TagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="16" height="16">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const CircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="16" height="16">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const PencilIcon = ({ color = '#fff', size = 16 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" width={size} height={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const CamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" width="13" height="13">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="14" height="14">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="28" height="28">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="36" height="36">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const DotOkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="15" height="15">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const DotErrorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="15" height="15">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── STYLES (Teal & Black Theme) ───
const T = {
  primary:   '#0f172a',
  mid:       '#115e59',
  brand:     '#14b8a6',
  light:     '#2dd4bf',
  bg50:      'rgba(20, 184, 166, 0.1)',
  bg25:      '#1e1e1e',
  border:    'rgba(20, 184, 166, 0.2)',
  text:      '#ffffff',
  muted:     '#94a3b8',
  faint:     '#64748b',
  page:      '#3d3b3b',
};

const styles = {
  page: {
    minHeight: '100%',
    background: T.page,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    paddingBottom: 48,
  },
  centered: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '64vh', padding: '0 24px',
  },
  spinnerRing: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  spinnerArc: {
    width: 34, height: 34,
    border: `3px solid transparent`,
    borderTop: `3px solid ${T.brand}`,
    borderRadius: '50%',
    animation: 'pgSpin 0.72s linear infinite',
  },
  errorBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    background: '#1e1e1e', borderRadius: 18,
    padding: '28px 24px',
    boxShadow: `0 4px 24px rgba(0,0,0,0.5)`,
    border: `0.5px solid rgba(239, 68, 68, 0.3)`,
    maxWidth: 320, width: '100%',
  },
  errorIcon: { marginBottom: 14 },
  retryBtn: {
    padding: '10px 28px',
    background: `linear-gradient(135deg, ${T.primary}, ${T.brand})`,
    color: '#fff', border: 'none', borderRadius: 28,
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.2,
  },

  // ── Banner ──
  banner: {
    background: `linear-gradient(150deg, ${T.primary} 0%, #0d1117 50%, #134e4a 100%)`,
    padding: '32px 20px 52px',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerInner: {
    maxWidth: 560, margin: '0 auto',
    display: 'flex', alignItems: 'center', gap: 14,
    position: 'relative', zIndex: 1,
  },
  avatarOuter: {
    borderRadius: '50%',
    padding: 3,
    background: 'rgba(20, 184, 166, 0.4)',
    flexShrink: 0,
    boxShadow: '0 0 0 3px rgba(20, 184, 166, 0.1)',
  },
  avatarInner: {
    borderRadius: '50%',
    padding: 3,
    background: 'rgba(20, 184, 166, 0.2)',
  },
  bannerText: { flex: 1, minWidth: 0 },
  bannerName: {
    margin: 0, fontSize: 20, fontWeight: 800, color: '#fff',
    letterSpacing: 0.1,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    lineHeight: 1.25,
  },
  bannerBadges: {
    display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, flexWrap: 'wrap',
  },
  roleBadge: {
    background: 'rgba(255,255,255,0.1)',
    color: T.light,
    fontSize: 11, fontWeight: 700,
    padding: '3px 12px', borderRadius: 20,
    letterSpacing: 0.5,
    backdropFilter: 'blur(4px)',
  },
  statusBadge: {
    fontSize: 11, fontWeight: 700,
    padding: '3px 12px', borderRadius: 20,
    letterSpacing: 0.3,
  },
  editFab: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(20, 184, 166, 0.2)',
    border: '1.5px solid rgba(20, 184, 166, 0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
    transition: 'background 0.18s, transform 0.18s',
    padding: 0,
  },

  // ── Body ──
  body: {
    maxWidth: 560, margin: '12px auto 0',
    padding: '0 14px',
    position: 'relative', zIndex: 2,
  },
  card: {
    background: '#454545',
    borderRadius: 18,
    padding: '14px 16px',
    marginBottom: 12,
    boxShadow: `0 8px 32px rgba(0,0,0,0.3)`,
    border: `0.5px solid ${T.border}`,
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 2, paddingBottom: 10,
    borderBottom: `0.5px solid ${T.border}`,
  },
  cardAccent: {
    width: 4, height: 18, borderRadius: 3,
    background: `linear-gradient(180deg, ${T.brand}, ${T.light})`,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 11, fontWeight: 800, color: T.brand,
    textTransform: 'uppercase', letterSpacing: 0.9,
  },

  // ── Info Row ──
  infoRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 0',
    borderBottom: `0.5px solid rgba(20, 184, 166, 0.05)`,
  },
  infoIcon: {
    width: 34, height: 34,
    background: 'rgba(20, 184, 166, 0.08)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    border: `0.5px solid ${T.border}`,
  },
  infoText: { flex: 1, minWidth: 0 },
  infoLabel: {
    fontSize: 10, color: T.faint, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  infoValue: {
    fontSize: 14, color: '#e2e8f0', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    textAlign: 'left',
  },

  // ── Edit CTA ──
  editCta: {
    width: '100%', padding: '15px',
    background: `linear-gradient(135deg, ${T.primary} 0%, ${T.brand} 100%)`,
    color: '#fff', border: 'none', borderRadius: 16,
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    boxShadow: `0 8px 24px rgba(20, 184, 166, 0.25)`,
    letterSpacing: 0.2, transition: 'opacity 0.18s, transform 0.18s',
  },

  // ── Modal ──
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(4px)',
    zIndex: 1300,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    animation: 'pgFade 0.15s ease',
  },
  modal: {
    width: '100%', maxWidth: 520,
    background: '#1e1e1e',
    borderRadius: '22px 22px 0 0',
    padding: '0 18px 36px',
    maxHeight: '93dvh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    animation: 'pgSlide 0.25s cubic-bezier(.22,.68,0,1.18)',
    boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
    border: `1px solid ${T.border}`,
    WebkitOverflowScrolling: 'touch',
    color: '#fff',
  },
  modalPill: {
    width: 40, height: 4,
    background: '#334155',
    borderRadius: 4, margin: '12px auto 0',
  },
  modalHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16, fontWeight: 800, color: '#fff',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  modalTitleBadge: {
    width: 30, height: 30, borderRadius: '50%',
    background: `linear-gradient(135deg, ${T.primary}, ${T.brand})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 32, height: 32,
    background: 'rgba(255,255,255,0.05)',
    border: 'none', borderRadius: '50%',
    cursor: 'pointer', color: T.brand,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
  },
  avatarEditRow: {
    display: 'flex', alignItems: 'center',
    padding: '10px 0 18px',
    borderBottom: `0.5px solid ${T.border}`,
    marginBottom: 18,
  },
  camBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: '50%',
    background: `linear-gradient(135deg, ${T.primary}, ${T.brand})`,
    border: '2.5px solid #1e1e1e',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
    boxShadow: `0 2px 8px rgba(0,0,0,0.5)`,
  },
  removePicBtn: {
    marginTop: 7, background: 'none', border: 'none',
    color: '#ef4444', fontSize: 11.5, cursor: 'pointer',
    padding: 0, fontWeight: 700,
    textDecoration: 'underline',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    display: 'block',
  },
  removeIcon: {
    width: 60, height: 60, borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 14px',
  },

  // ── Form ──
  formGroup: { marginBottom: 14 },
  formLabel: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: T.brand, textTransform: 'uppercase',
    letterSpacing: 0.7, marginBottom: 5,
     textAlign: 'left', 

  },
  formInput: {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px',
    border: `1.5px solid ${T.border}`,
    borderRadius: 12, fontSize: 14,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: '#fff', background: '#121212',
    outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    WebkitAppearance: 'none',
    textAlign: 'left',  
      width: '100%',  
  },
  inputErr: {
    borderColor: '#ef4444',
    animation: 'pgShake 0.36s ease',
  },
  errText: { fontSize: 11.5, color: '#ef4444', marginTop: 5, fontWeight: 600 },
  fileNote: {
    fontSize: 11, color: T.faint,
    marginBottom: 18, lineHeight: 1.5,
    background: 'rgba(255,255,255,0.03)', borderRadius: 8,
    padding: '8px 12px',
  },
  modalFoot: { display: 'flex', gap: 10 },
  btnCancel: {
    flex: 1, padding: '13px',
    background: 'rgba(255,255,255,0.05)', border: 'none',
    borderRadius: 12, fontSize: 14, fontWeight: 700,
    color: '#94a3b8', cursor: 'pointer',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  btnSave: {
    flex: 1, padding: '13px',
    background: `linear-gradient(135deg, ${T.primary}, ${T.brand})`,
    border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 700, color: '#fff',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 4px 16px rgba(20, 184, 166, 0.2)`,
    letterSpacing: 0.1,
  },

  toastDot: {
    display: 'inline-flex', alignItems: 'center',
    marginRight: 7, verticalAlign: 'middle',
  },
};

const CSS = `
  @keyframes pgSpin  { to { transform: rotate(360deg); } }
  @keyframes pgFade  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pgSlide { from { transform: translateY(64px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes pgShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 60%{transform:translateX(6px)} }

  .pg-input:focus {
    border-color: #14b8a6 !important;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.2) !important;
    background: #000 !important;
  }
  .pg-fab:hover   { background: rgba(20, 184, 166, 0.35) !important; transform: scale(1.08); }
  .pg-cta:hover   { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 8px 30px rgba(20, 184, 166, 0.35) !important; }
  .pg-cta:active  { transform: scale(0.98); }
  .pg-close:hover { background: rgba(255,255,255,0.1) !important; }
  .pg-cam:hover   { transform: scale(1.12); }
  .pg-cancel:hover { background: rgba(255,255,255,0.1) !important; }
  .pg-save:hover:not(:disabled) { opacity: 0.9; }
  .pg-removepic:hover { opacity: 0.7; }
  .pg-retry:hover { opacity: 0.88; }

  @media (min-width: 600px) {
    .pg-backdrop { align-items: center !important; }
  }

  .pg-toast {
    position: fixed;
    bottom: -80px; left: 50%;
    transform: translateX(-50%);
    color: #fff;
    padding: 11px 22px;
    border-radius: 32px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    z-index: 9999;
    white-space: nowrap;
    display: flex; align-items: center;
    transition: bottom 0.4s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
    max-width: calc(100vw - 40px);
    letter-spacing: 0.1px;
  }
  .pg-toast.show { bottom: 26px; opacity: 1; }

  @media (min-width: 600px) {
    .pg-toast.show { bottom: 36px; }
  }

  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .pg-toast.show { bottom: calc(26px + env(safe-area-inset-bottom)); }
  }
`; 