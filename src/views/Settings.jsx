import React, { useState, useEffect } from 'react';

const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://m-tms.thedesigns.live';

const Settings = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sheet, setSheet] = useState({ open: false, type: '' });
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ otp: '', inputOtp: '', newPass: '', confPass: '', newEmail: '' });

    useEffect(() => { fetchSession(); }, []);

    const fetchSession = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/settings/session-data`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setUser(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

    const sendOtp = async (targetEmail, reason) => {
        const otp = generateOtp();
        setForm({ ...form, otp });
        try {
            await fetch(`${BASE_URL}/api/sentmail/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact: targetEmail, otp, sent_for: reason })
            });
            setStep(2);
        } catch (err) { alert("Failed to send OTP"); }
    };

    const handleUpdate = async (path, body) => {
        try {
            const res = await fetch(`${BASE_URL}/api/settings${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                credentials: 'include'
            });
            const data = await res.json();
            alert(data.message);
            if (data.success) {
                setSheet({ open: false, type: '' });
                fetchSession();
            }
        } catch (err) { alert("Update failed"); }
    };

    const deleteAccount = async () => {
        if (!window.confirm("CRITICAL: Permanent deletion?")) return;
        const res = await fetch(`${BASE_URL}/api/settings/delete-profile`, { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (data.success) window.location.href = '/';
    };

    if (loading) return <div style={styles.loader}>Loading...</div>;

    return (
        <div style={styles.container}>
            {/* PROFILE HEADER */}
            <div style={styles.profileHeader}>
                <div style={styles.avatar}>{user?.name?.[0].toUpperCase()}</div>
                <div style={{ marginLeft: 15 }}>
                    <h2 style={styles.userName}>{user?.name}</h2>
                    <p style={styles.userEmail}>{user?.email}</p>
                    <span style={styles.badge}>{user?.role.toUpperCase()}</span>
                </div>
            </div>

            {/* SETTINGS MENU */}
            <div style={styles.menuCard}>
                <Item label="Change Password" icon="🔒" onClick={() => { setStep(1); setSheet({ open: true, type: 'pass' }); }} />
                <Item label="Change Gmail" icon="📧" onClick={() => { setStep(1); setSheet({ open: true, type: 'email' }); }} />
                <Item label="Logout" icon="🚪" onClick={() => { if (window.confirm("Logout?")) window.location.href = '/logout'; }} />
                <Item label="Delete Profile" icon="⚠️" danger onClick={() => {
                    if (!user.isAdmin) return alert("Contact Admin to delete account.");
                    setStep(1); setSheet({ open: true, type: 'delete' });
                }} />
            </div>

            {/* BOTTOM SHEET MODAL */}
            {sheet.open && (
                <div style={styles.modalOverlay} onClick={() => setSheet({ open: false, type: '' })}>
                    <div style={styles.sheet} onClick={e => e.stopPropagation()}>
                        <div style={styles.sheetHandle}></div>
                        <h3 style={styles.sheetTitle}>{sheet.type === 'pass' ? 'Update Password' : sheet.type === 'email' ? 'Update Email' : 'Delete Profile'}</h3>

                        {/* STEP 1: SEND OTP */}
                        {step === 1 && (
                            <div style={{ textAlign: 'center' }}>
                                <p style={styles.sheetText}>Verification code will be sent to:<br /><strong>{user.email}</strong></p>
                                <button style={styles.primaryBtn} onClick={() => sendOtp(user.email, sheet.type === 'pass' ? 'change_password' : sheet.type === 'email' ? 'change_email' : 'delete_profile')}>Send OTP</button>
                            </div>
                        )}

                        {/* STEP 2: VERIFY OTP */}
                        {step === 2 && (
                            <div>
                                <input style={styles.input} placeholder="Enter 6-digit OTP" onChange={e => setForm({ ...form, inputOtp: e.target.value })} />
                                <button style={styles.primaryBtn} onClick={() => {
                                    if (form.inputOtp === form.otp) {
                                        if (sheet.type === 'delete') deleteAccount();
                                        else setStep(3);
                                    } else alert("Invalid OTP");
                                }}>Verify OTP</button>
                            </div>
                        )}

                        {/* STEP 3: FINAL ACTION */}
                        {step === 3 && sheet.type === 'pass' && (
                            <div>
                                <input style={styles.input} type="password" placeholder="New Password" onChange={e => setForm({ ...form, newPass: e.target.value })} />
                                <input style={styles.input} type="password" placeholder="Confirm Password" onChange={e => setForm({ ...form, confPass: e.target.value })} />
                                <button style={styles.primaryBtn} onClick={() => {
                                    if (form.newPass === form.confPass) handleUpdate('/change-password', { new_password: form.newPass });
                                    else alert("Passwords mismatch");
                                }}>Update Password</button>
                            </div>
                        )}

                        {step === 3 && sheet.type === 'email' && (
                            <div>
                                <input style={styles.input} type="email" placeholder="New Gmail Address" onChange={e => setForm({ ...form, newEmail: e.target.value })} />
                                <button style={styles.primaryBtn} onClick={() => handleUpdate('/change-email', { new_email: form.newEmail })}>Change Email</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Item = ({ label, icon, onClick, danger }) => (
    <div style={styles.menuItem} onClick={onClick}>
        <span style={styles.menuIcon}>{icon}</span>
        <span style={{ ...styles.menuLabel, color: danger ? '#ff6b6b' : '#fff' }}>{label}</span>
        <span style={styles.arrow}>›</span>
    </div>
);

const styles = {
    container: { padding: '20px', background: '#121212', minHeight: '100vh', color: '#fff' },
    loader: { color: '#0F8989', textAlign: 'center', marginTop: '50px' },
    profileHeader: { display: 'flex', alignItems: 'center', marginBottom: '30px', padding: '15px', background: '#1E1E1E', borderRadius: '15px' },
    avatar: { width: '60px', height: '60px', borderRadius: '50%', background: '#0F8989', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' },
    userName: { margin: 0, fontSize: '18px' },
    userEmail: { margin: '2px 0', fontSize: '13px', color: '#aaa' },
    badge: { fontSize: '10px', background: '#333', padding: '2px 8px', borderRadius: '5px', color: '#0F8989', fontWeight: 'bold' },
    menuCard: { background: '#1E1E1E', borderRadius: '15px', overflow: 'hidden' },
    menuItem: { display: 'flex', alignItems: 'center', padding: '18px', borderBottom: '1px solid #2A2A2A', cursor: 'pointer' },
    menuIcon: { marginRight: '15px', fontSize: '18px' },
    menuLabel: { flex: 1, fontSize: '15px' },
    arrow: { color: '#555', fontSize: '20px' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' },
    sheet: { width: '100%', background: '#1E1E1E', padding: '20px', borderRadius: '25px 25px 0 0', animation: 'slideUp 0.3s ease-out' },
    sheetHandle: { width: '40px', height: '4px', background: '#333', borderRadius: '2px', margin: '0 auto 20px' },
    sheetTitle: { textAlign: 'center', margin: '0 0 20px', color: '#0F8989' },
    sheetText: { textAlign: 'center', fontSize: '14px', color: '#aaa', marginBottom: '20px' },
    input: { width: '100%', padding: '12px', background: '#2A2A2A', border: '1px solid #333', borderRadius: '10px', color: '#fff', marginBottom: '15px', outline: 'none' },
    primaryBtn: { width: '100%', padding: '12px', background: '#0F8989', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }
};

export default Settings;