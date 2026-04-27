import React, { useState, useRef, useEffect } from 'react';

// ─── BASE URL ────────────────────────────────────────────────────────────────
const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live';

// ─── TOAST HOOK ──────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: '', type: 'success', show: false });
  function showToast(msg, type = 'success') {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }
  return { toast, showToast };
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
function Avatar({ profilePic, name, size = 88 }) {
  const [imgError, setImgError] = useState(false);
  const letter = name ? name.charAt(0).toUpperCase() : '?';
  if (profilePic && !imgError) {
    return (
      <img
        src={`${BASE_URL}/public/images/${profilePic}`}
        alt={name}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', display: 'block',
          border: '3px solid rgba(20,184,166,0.5)',
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #095959 0%, #14b8a6 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      border: '3px solid rgba(20,184,166,0.4)',
      flexShrink: 0, userSelect: 'none',
    }}>
      {letter}
    </div>
  );
}

// ─── INFO ROW ────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, valueStyle }) {
  return (
    <div style={styles.infoRow}>
      <div style={styles.infoIcon}>{icon}</div>
      <div style={styles.infoText}>
        <div style={styles.infoLabel}>{label}</div>
        <div style={{ ...styles.infoValue, ...(valueStyle || {}) }}>{value || '—'}</div>
      </div>
    </div>
  );
}

// ─── MAIN PROFILE COMPONENT ──────────────────────────────────────────────────
export default function Profile() {
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [editOpen, setEditOpen]     = useState(false);
  const [editName, setEditName]     = useState('');
  const [editPhone, setEditPhone]   = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editFile, setEditFile]     = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving]         = useState(false);

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removing, setRemoving]     = useState(false);

  const fileRef = useRef(null);
  const { toast, showToast } = useToast();

  // ── Fetch Profile ──
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
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5MB.', 'error');
      return;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast('Only JPG, PNG, WEBP allowed.', 'error');
      return;
    }
    setEditFile(file);
    setEditPreview(URL.createObjectURL(file));
  }

  async function handleEditSubmit() {
    if (!editName.trim()) {
      showToast('Name is required.', 'error');
      return;
    }
    if (editPhone && !/^\d{10}$/.test(editPhone)) {
      setPhoneError('Enter a valid 10-digit phone number.');
      return;
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
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setProfile(prev => ({
          ...prev,
          name: data.name,
          phone: data.phone,
          company: data.company,
          profilePic: data.profilePic || prev.profilePic,
        }));
        setEditOpen(false);
        showToast('Profile updated successfully! ✓');
      } else {
        showToast(data.message || 'Update failed.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    }
    setSaving(false);
  }

  async function handleRemovePic() {
    setRemoving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/profile/remove-picture`, {
        method: 'POST',
        credentials: 'include',
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
    } catch {
      showToast('Network error. Please try again.', 'error');
    }
    setRemoving(false);
  }

  // ── Render: Loading ──
  if (loading) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinnerWrap}>
          <div style={styles.spinner} />
        </div>
        <p style={{ color: '#14b8a6', marginTop: 14, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
          Loading profile…
        </p>
      </div>
    );
  }

  // ── Render: Error ──
  if (fetchError) {
    return (
      <div style={styles.centered}>
        <div style={styles.errorBox}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: '#ef4444', margin: 0, fontSize: 14, fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
            {fetchError}
          </p>
          <button
            style={styles.retryBtn}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.isAdmin;
  const statusColor = profile?.status === 'Active' ? '#22c55e' : '#f59e0b';

  return (
    <div style={styles.page}>
      <style>{CSS}</style>

      {/* ── Header Banner ── */}
      <div style={styles.banner}>
        <div style={styles.bannerDecor} />
        <div style={styles.bannerContent}>
          <div style={styles.avatarRing}>
            <Avatar profilePic={profile?.profilePic} name={profile?.name} size={84} />
          </div>
          <div style={styles.bannerText}>
            <h2 style={styles.bannerName}>{profile?.name}</h2>
            <div style={styles.bannerMeta}>
              <span style={styles.roleBadge}>
                {isAdmin ? '🛡 Admin' : `👤 ${profile?.userRoleName || 'Member'}`}
              </span>
              <span style={{ ...styles.statusDot, background: statusColor }} />
              <span style={styles.statusLabel}>{profile?.status || 'Active'}</span>
            </div>
          </div>
          <button
            style={styles.editFab}
            className="p-fab"
            onClick={openEdit}
            title="Edit Profile"
            aria-label="Edit Profile"
          >
            <PencilIcon />
          </button>
        </div>
      </div>

      {/* ── Cards ── */}
      <div style={styles.cardWrap}>

        {/* Personal Info */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardDot} />
            <span style={styles.cardTitle}>Personal Information</span>
          </div>
          <InfoRow icon={<MailIcon />}     label="Email Address"  value={profile?.email} />
          <InfoRow icon={<PhoneIcon />}    label="Phone Number"   value={profile?.phone || 'Not added'} />
          <InfoRow icon={<BuildingIcon />} label="Company"        value={profile?.company || 'N/A'} />
        </div>

        {/* Account Info */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardDot} />
            <span style={styles.cardTitle}>Account Details</span>
          </div>
          <InfoRow icon={<ShieldIcon />} label="Account Type" value={isAdmin ? 'Admin' : 'User'} />
          {!isAdmin && (
            <InfoRow icon={<TagIcon />} label="Role" value={profile?.userRoleName || 'N/A'} />
          )}
          <InfoRow
            icon={<CircleIcon />}
            label="Account Status"
            value={`● ${profile?.status || 'Active'}`}
            valueStyle={{ color: statusColor, fontWeight: 600 }}
          />
        </div>

        {/* Edit Button */}
        <button style={styles.editBtn} className="p-btn" onClick={openEdit}>
          <PencilIcon color="#fff" size={16} />
          <span style={{ marginLeft: 8 }}>Edit Profile Information</span>
        </button>
      </div>

      {/* ════════ EDIT MODAL ════════ */}
      {editOpen && (
        <div style={styles.backdrop} className="p-backdrop" onClick={() => setEditOpen(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={styles.modalHandle} />

            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                <div style={styles.modalTitleIcon}><PencilIcon color="#fff" size={14} /></div>
                Edit Profile
              </div>
              <button style={styles.closeBtn} className="p-close" onClick={() => setEditOpen(false)} aria-label="Close">✕</button>
            </div>

            {/* Avatar Row */}
            <div style={styles.modalAvatarRow}>
              <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                {editPreview
                  ? <img src={editPreview} alt="preview" style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '3px solid #14b8a6', display: 'block' }} />
                  : <Avatar profilePic={profile?.profilePic} name={editName || profile?.name} size={68} />
                }
                <button
                  style={styles.camBtn}
                  className="p-cam"
                  onClick={() => fileRef.current?.click()}
                  title="Change photo"
                  aria-label="Change photo"
                >
                  <CamIcon />
                </button>
              </div>
              <div style={{ marginLeft: 14, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0b3d3a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editName || profile?.name || 'Your Name'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>Tap camera icon to change photo</div>
                {profile?.profilePic && (
                  <button
                    style={styles.removePicBtn}
                    className="p-remove-pic"
                    onClick={() => { setEditOpen(false); setRemoveOpen(true); }}
                  >
                    🗑 Remove photo
                  </button>
                )}
              </div>
            </div>

            <input
              type="file"
              ref={fileRef}
              accept=".jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
              onChange={handleFilePick}
            />

            {/* Fields */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Full Name *</label>
              <input
                style={styles.formInput}
                className="p-input"
                placeholder="Your full name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={100}
                autoComplete="name"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone Number</label>
              <input
                style={{ ...styles.formInput, ...(phoneError ? styles.inputError : {}) }}
                className="p-input"
                placeholder="10-digit number"
                value={editPhone}
                onChange={e => { setEditPhone(e.target.value.replace(/\D/g, '')); setPhoneError(''); }}
                maxLength={10}
                inputMode="numeric"
                autoComplete="tel"
              />
              {phoneError && <div style={styles.errorText}>{phoneError}</div>}
            </div>

            {isAdmin && (
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Company Name</label>
                <input
                  style={styles.formInput}
                  className="p-input"
                  placeholder="Your company"
                  value={editCompany}
                  onChange={e => setEditCompany(e.target.value)}
                  maxLength={100}
                  autoComplete="organization"
                />
              </div>
            )}

            <div style={styles.fileHint}>
              📎 Supported: JPG, PNG, WEBP &nbsp;·&nbsp; Max size: 5 MB
            </div>

            <div style={styles.modalBtns}>
              <button style={styles.cancelBtn} className="p-cancel" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button
                style={{ ...styles.saveBtn, opacity: saving ? 0.72 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                className="p-save"
                onClick={handleEditSubmit}
                disabled={saving}
              >
                {saving ? <><SpinIcon /> Saving…</> : <><CheckIcon /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ REMOVE PICTURE MODAL ════════ */}
      {removeOpen && (
        <div style={styles.backdrop} className="p-backdrop" onClick={() => setRemoveOpen(false)}>
          <div style={{ ...styles.modal, maxWidth: 360 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={styles.modalHandle} />
            <div style={{ textAlign: 'center', padding: '24px 8px 8px' }}>
              <div style={{ fontSize: 46, marginBottom: 10 }}>🗑️</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0b3d3a', marginBottom: 8 }}>
                Remove Profile Picture?
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.5 }}>
                Your photo will be removed and replaced with your initials avatar.
              </div>
              <div style={styles.modalBtns}>
                <button style={styles.cancelBtn} className="p-cancel" onClick={() => setRemoveOpen(false)}>
                  Keep It
                </button>
                <button
                  style={{ ...styles.saveBtn, background: 'linear-gradient(135deg,#dc2626,#ef4444)', opacity: removing ? 0.72 : 1, cursor: removing ? 'not-allowed' : 'pointer' }}
                  className="p-save"
                  onClick={handleRemovePic}
                  disabled={removing}
                >
                  {removing ? <><SpinIcon /> Removing…</> : 'Yes, Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST ─── */}
      <div
        className={`p-toast${toast.show ? ' show' : ''}`}
        style={{ background: toast.type === 'error' ? '#dc2626' : '#095959' }}
        role="alert"
        aria-live="polite"
      >
        {toast.type === 'error' ? '✗ ' : '✓ '}{toast.msg}
      </div>
    </div>
  );
}

// ─── ICON COMPONENTS ─────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="17" height="17">
    <rect x="2" y="4" width="20" height="16" rx="3"/>
    <polyline points="2,4 12,13 22,4"/>
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="17" height="17">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="17" height="17">
    <rect x="2" y="7" width="20" height="15" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="17"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="17" height="17">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const TagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="17" height="17">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const CircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="17" height="17">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const CamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" width="13" height="13">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const PencilIcon = ({ color = '#fff', size = 17 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" width={size} height={size}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15" style={{ marginRight: 6 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const SpinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"
    style={{ marginRight: 6, animation: 'pSpin 0.75s linear infinite', display: 'inline-block' }}>
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
  </svg>
);

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100%',
    background: '#f1f5f9',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    paddingBottom: 40,
  },
  centered: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', padding: '0 20px',
  },
  spinnerWrap: {
    width: 52, height: 52,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(20,184,166,0.1)',
    borderRadius: '50%',
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid #e2f8f6',
    borderTop: '3px solid #14b8a6',
    borderRadius: '50%',
    animation: 'pSpin 0.75s linear infinite',
  },
  errorBox: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', background: '#fff',
    borderRadius: 16, padding: '28px 24px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    maxWidth: 320, width: '100%',
  },
  retryBtn: {
    marginTop: 16,
    padding: '10px 28px',
    background: 'linear-gradient(135deg,#095959,#14b8a6)',
    color: '#fff', border: 'none', borderRadius: 30,
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },

  // ── Banner ──
  banner: {
    background: 'linear-gradient(135deg, #073f3f 0%, #0d7a7a 55%, #14b8a6 100%)',
    padding: '36px 20px 60px',
    position: 'relative',
    overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute',
    bottom: -2, left: 0, right: 0,
    height: 40,
    background: '#f1f5f9',
    borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
  },
  bannerContent: {
    maxWidth: 560,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    zIndex: 1,
  },
  avatarRing: {
    padding: 4,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(4px)',
    flexShrink: 0,
    boxShadow: '0 0 0 2px rgba(255,255,255,0.2)',
  },
  bannerText: {
    flex: 1, minWidth: 0,
  },
  bannerName: {
    margin: 0,
    fontSize: 21,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: 0.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  },
  bannerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
    flexWrap: 'wrap',
  },
  roleBadge: {
    background: 'rgba(255,255,255,0.18)',
    color: '#d1faf5',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 11px',
    borderRadius: 20,
    letterSpacing: 0.4,
  },
  statusDot: {
    width: 7, height: 7,
    borderRadius: '50%',
    display: 'inline-block',
    boxShadow: '0 0 0 2px rgba(255,255,255,0.25)',
  },
  statusLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500,
  },
  editFab: {
    width: 42, height: 42,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: '1.5px solid rgba(255,255,255,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    backdropFilter: 'blur(4px)',
    transition: 'background 0.18s, transform 0.18s',
    padding: 0,
  },

  // ── Cards ──
  cardWrap: {
    maxWidth: 560,
    margin: '-24px auto 0',
    padding: '0 14px',
    position: 'relative',
    zIndex: 2,
  },
  card: {
    background: '#fff',
    borderRadius: 18,
    padding: '16px 14px',
    marginBottom: 12,
    boxShadow: '0 2px 18px rgba(9,89,89,0.07)',
    border: '1px solid rgba(20,184,166,0.08)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingBottom: 10,
    borderBottom: '1px solid #f1f5f9',
  },
  cardDot: {
    width: 8, height: 8,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #095959, #14b8a6)',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 11.5,
    fontWeight: 800,
    color: '#14b8a6',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },

  // ── Info Row ──
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 0',
    borderBottom: '1px solid #f8fafc',
  },
  infoIcon: {
    width: 36, height: 36,
    background: 'linear-gradient(135deg,#e0fdf9,#f0fdfa)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid rgba(20,184,166,0.1)',
  },
  infoText: { flex: 1, minWidth: 0 },
  infoLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // ── Edit Button ──
  editBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #073f3f 0%, #14b8a6 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    boxShadow: '0 4px 18px rgba(9,89,89,0.28)',
    letterSpacing: 0.2,
  },

  // ── Modal ──
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1300,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    animation: 'pFade 0.16s ease',
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    background: '#fff',
    borderRadius: '22px 22px 0 0',
    padding: '0 18px 36px',
    maxHeight: '93dvh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    animation: 'pSlide 0.26s cubic-bezier(.22,.68,0,1.18)',
    boxShadow: '0 -10px 48px rgba(0,0,0,0.16)',
    WebkitOverflowScrolling: 'touch',
  },
  modalHandle: {
    width: 42, height: 4,
    background: '#dde8e7',
    borderRadius: 4,
    margin: '14px auto 0',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16, fontWeight: 800, color: '#0b3d3a',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  modalTitleIcon: {
    width: 32, height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #095959, #14b8a6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 32, height: 32,
    background: '#f0f7f6',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: 13, color: '#555',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600,
    transition: 'background 0.15s',
    padding: 0,
    lineHeight: 1,
  },
  modalAvatarRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0 18px',
    borderBottom: '1px solid #f1f5f9',
    marginBottom: 18,
  },
  camBtn: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 27, height: 27,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #095959, #14b8a6)',
    border: '2.5px solid #fff',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0,
    boxShadow: '0 2px 8px rgba(9,89,89,0.3)',
  },
  removePicBtn: {
    marginTop: 7,
    background: 'none',
    border: 'none',
    color: '#ef4444',
    fontSize: 11.5,
    cursor: 'pointer',
    padding: 0,
    fontWeight: 700,
    textDecoration: 'underline',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    display: 'block',
  },

  // ── Form ──
  formGroup: { marginBottom: 14 },
  formLabel: {
    display: 'block',
    fontSize: 10.5, fontWeight: 800,
    color: '#14b8a6',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  formInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    border: '1.6px solid #e2eded',
    borderRadius: 12,
    fontSize: 14,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: '#1e293b',
    background: '#fafefe',
    outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    WebkitAppearance: 'none',
  },
  inputError: {
    borderColor: '#ef4444',
    animation: 'pShake 0.38s ease',
  },
  errorText: {
    fontSize: 11.5, color: '#ef4444',
    marginTop: 5, fontWeight: 600,
  },
  fileHint: {
    fontSize: 11, color: '#94a3b8',
    marginBottom: 18, lineHeight: 1.5,
    background: '#f8fafc',
    borderRadius: 8,
    padding: '8px 12px',
  },
  modalBtns: {
    display: 'flex',
    gap: 10,
  },
  cancelBtn: {
    flex: 1, padding: '13px',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: 12,
    fontSize: 14, fontWeight: 700,
    color: '#475569',
    cursor: 'pointer',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    transition: 'background 0.15s',
  },
  saveBtn: {
    flex: 1, padding: '13px',
    background: 'linear-gradient(135deg, #095959, #14b8a6)',
    border: 'none',
    borderRadius: 12,
    fontSize: 14, fontWeight: 700,
    color: '#fff',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(9,89,89,0.3)',
    transition: 'opacity 0.18s',
    letterSpacing: 0.1,
  },
};

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes pSpin    { to { transform: rotate(360deg); } }
  @keyframes pFade    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pSlide   { from { transform: translateY(72px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes pShake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 60%{transform:translateX(7px)} }

  .p-input:focus {
    border-color: #14b8a6 !important;
    box-shadow: 0 0 0 3px rgba(20,184,166,0.14);
    background: #fff !important;
  }
  .p-fab:hover   { background: rgba(255,255,255,0.26) !important; transform: scale(1.08); }
  .p-btn:hover   { opacity: 0.88; transform: translateY(-1px); }
  .p-btn:active  { transform: scale(0.97); }
  .p-close:hover { background: #dbeeed !important; color: #0b3d3a !important; }
  .p-cam:hover   { transform: scale(1.12); }
  .p-cancel:hover { background: #e2e8f0 !important; }
  .p-save:hover:not(:disabled) { opacity: 0.9; }
  .p-remove-pic:hover { opacity: 0.7; }

  /* Desktop: vertically center modal */
  @media (min-width: 600px) {
    .p-backdrop {
      align-items: center !important;
    }
    /* reassign modal styles for desktop */
  }

  .p-toast {
    position: fixed;
    bottom: -90px; left: 50%;
    transform: translateX(-50%);
    color: #fff;
    padding: 12px 24px;
    border-radius: 32px;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
    box-shadow: 0 6px 28px rgba(0,0,0,0.22);
    z-index: 9999;
    white-space: nowrap;
    transition: bottom 0.3s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
    max-width: calc(100vw - 40px);
    text-align: center;
    letter-spacing: 0.1px;
  }
  .p-toast.show { bottom: 28px; opacity: 1; }

  @media (min-width: 600px) {
    .p-toast { font-size: 14px; bottom: -90px; }
    .p-toast.show { bottom: 36px; }
  }

  /* Responsive: modal border-radius on desktop */
  @media (min-width: 600px) {
    /* The JS style override approach is cleaner, see modal max-width */
  }

  /* Safe area for notched phones */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .p-toast.show { bottom: calc(28px + env(safe-area-inset-bottom)); }
  }
`;
