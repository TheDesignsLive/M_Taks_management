//Notifications.jsx - 
import React, { useState, useEffect } from 'react';

const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://m-tms.thedesigns.live';

const Notifications = () => {
    const [data, setData] = useState({ 
        announcements: [], 
        memberRequests: [], 
        deletionRequests: [], 
        roles: [],
        sessionRole: '' 
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/notifications`, { credentials: 'include' });
            const result = await res.json();
            if (result.success) setData(result);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Action handlers for Member Requests
    const processRequest = async (endpoint, id) => {
        try {
            const res = await fetch(`${BASE_URL}/api/notifications${endpoint}`, { credentials: 'include' });
            const result = await res.json();
            if (result.success) {
                // UI se card remove karo bina refresh kiye
                setData(prev => ({
                    ...prev,
                    memberRequests: prev.memberRequests.filter(r => r.id !== id),
                    deletionRequests: prev.deletionRequests.filter(r => r.id !== id)
                }));
            }
        } catch (err) {
            alert("Error processing request");
        }
    };

    if (loading) return <div style={{padding:'20px', color:'white', textAlign:'center'}}>Loading Notifications...</div>;

    const isAdmin = data.sessionRole === 'admin' || data.sessionRole === 'owner';

    return (
        <div style={styles.container}>
            {/* ─── ANNOUNCEMENTS SECTION ─── */}
            <div style={styles.headerRow}>
                <h2 style={styles.sectionTitle}>Announcements</h2>
                {isAdmin && (
                    <button style={styles.announceBtn}>
                        <i className="fa-solid fa-plus"></i> Add
                    </button>
                )}
            </div>

            <div style={styles.listContainer}>
                {data.announcements.length > 0 ? data.announcements.map((a) => (
                    <div key={a.id} style={styles.announcementCard}>
                        {isAdmin && (
                            <div style={styles.cardActions}>
                                <button style={styles.iconBtn}><i className="fa-solid fa-pen-to-square"></i></button>
                                <button style={{...styles.iconBtn, color:'#ff4d4d'}}><i className="fa-solid fa-trash"></i></button>
                            </div>
                        )}
                        <h3 style={styles.annTitle}>{a.title}</h3>
                        <div style={styles.metaInfo}>
                            <span><i className="fa-solid fa-user-tag"></i> {a.added_by_name}</span>
                            <span style={styles.separator}>|</span>
                            <span><i className="fa-solid fa-users"></i> {a.target_role}</span>
                        </div>
                        <p style={styles.annDesc}>{a.description}</p>
                        <div style={styles.timeLine}>
                            <i className="fa-regular fa-clock"></i> {new Date(a.created_at).toLocaleDateString()}
                        </div>
                        {a.attachment && (
                            <div style={styles.attachmentBox}>
                                <a href={`${BASE_URL}/uploads/${a.attachment}`} target="_blank" rel="noreferrer" style={styles.attachLink}>
                                    <i className="fa-solid fa-paperclip"></i> View Attachment
                                </a>
                            </div>
                        )}
                    </div>
                )) : (
                    <div style={styles.emptyState}>
                        <i className="fa-solid fa-bullhorn" style={{fontSize:'30px', marginBottom:'10px'}}></i>
                        <p>No announcements found.</p>
                    </div>
                )}
            </div>

            {/* ─── MEMBER REQUESTS SECTION (Admin Only) ─── */}
            {isAdmin && (
                <>
                    {/* Add Requests */}
                    <h4 style={{...styles.subHeader, color: '#2ecc71'}}>
                        <i className="fa-solid fa-user-plus"></i> Add Requests
                    </h4>
                    {data.memberRequests.length > 0 ? data.memberRequests.map(r => (
                        <div key={r.id} style={{...styles.requestCard, borderLeft:'5px solid #2ecc71'}}>
                            <div style={styles.reqFlex}>
                                <div style={styles.avatar}>
                                    {r.profile_pic ? 
                                        <img src={`${BASE_URL}/images/${r.profile_pic}`} style={styles.avatarImg} alt="profile" /> : 
                                        <div style={{...styles.avatarCircle, background:'#2ecc71'}}>{r.name.charAt(0)}</div>
                                    }
                                </div>
                                <div style={styles.reqInfo}>
                                    <h4 style={{margin:0, color:'#2ecc71'}}>{r.name}</h4>
                                    <p style={styles.reqText}><b>Email:</b> {r.email}</p>
                                    <p style={styles.reqText}><b>Role:</b> {r.role_name}</p>
                                </div>
                                <div style={styles.reqActions}>
                                    <button onClick={() => processRequest(`/approve-member/${r.id}`, r.id)} style={styles.btnAccept}>Accept</button>
                                    <button onClick={() => processRequest(`/reject-member/${r.id}`, r.id)} style={styles.btnReject}>Reject</button>
                                </div>
                            </div>
                        </div>
                    )) : <p style={styles.emptySmall}>No pending add requests.</p>}

                    {/* Deletion Requests */}
                    <h4 style={{...styles.subHeader, color: '#ff4d4d', marginTop:'30px'}}>
                        <i className="fa-solid fa-user-minus"></i> Deletion Requests
                    </h4>
                    {data.deletionRequests.length > 0 ? data.deletionRequests.map(r => (
                        <div key={r.id} style={{...styles.requestCard, borderLeft:'5px solid #ff4d4d', background: '#352525'}}>
                            <div style={styles.reqFlex}>
                                <div style={styles.avatar}>
                                    <div style={{...styles.avatarCircle, background:'#ff4d4d'}}>{r.name.charAt(0)}</div>
                                </div>
                                <div style={styles.reqInfo}>
                                    <h4 style={{margin:0, color:'#ff4d4d'}}>{r.name}</h4>
                                    <p style={styles.reqText}>Role: {r.role_name}</p>
                                    <p style={{...styles.reqText, fontSize:'10px'}}>Requested by {r.requested_by_name}</p>
                                </div>
                                <div style={styles.reqActions}>
                                    <button onClick={() => processRequest(`/confirm-deletion/${r.id}`, r.id)} style={styles.btnReject}>Approve</button>
                                    <button onClick={() => processRequest(`/reject-deletion/${r.id}`, r.id)} style={styles.btnAccept}>Keep</button>
                                </div>
                            </div>
                        </div>
                    )) : <p style={styles.emptySmall}>No pending deletion requests.</p>}
                </>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '15px', background: '#3C3A3A', minHeight: '100%', fontFamily: 'Arial, sans-serif' },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' },
    sectionTitle: { color: '#fff', fontSize: '18px', margin: 0 },
    announceBtn: { background: '#0F8989', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold' },
    listContainer: { marginBottom: '30px' },
    announcementCard: { background: '#444', padding: '15px', borderRadius: '8px', marginBottom: '15px', borderLeft: '5px solid #0F8989', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
    cardActions: { position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' },
    iconBtn: { background: 'rgba(255,255,255,0.05)', border: 'none', color: '#aaa', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer' },
    annTitle: { color: '#CDF4F4', fontSize: '16px', margin: '0 0 10px 0', paddingRight: '60px' },
    metaInfo: { fontSize: '11px', color: '#aaa', marginBottom: '10px', display: 'flex', alignItems: 'center' },
    separator: { margin: '0 8px', opacity: 0.3 },
    annDesc: { color: '#eee', fontSize: '13px', lineHeight: '1.5', margin: '10px 0' },
    timeLine: { fontSize: '10px', color: '#888', marginTop: '10px' },
    attachmentBox: { marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #555' },
    attachLink: { color: '#0F8989', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' },
    subHeader: { fontSize: '14px', borderBottom: '1px solid #555', paddingBottom: '8px', marginBottom: '15px', letterSpacing: '0.5px' },
    requestCard: { background: '#2E2D2D', padding: '12px', borderRadius: '8px', marginBottom: '12px' },
    reqFlex: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '45px', height: '45px' },
    avatarCircle: { width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center', color: 'white', fontWeight: 'bold', fontSize: '18px', display: 'flex', justifyContent: 'center' },
    avatarImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' },
    reqInfo: { flex: 1 },
    reqText: { margin: '2px 0', color: '#bbb', fontSize: '12px' },
    reqActions: { display: 'flex', flexDirection: 'column', gap: '5px' },
    btnAccept: { background: '#2ecc71', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
    btnReject: { background: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
    emptyState: { textAlign: 'center', color: '#888', padding: '40px 0' },
    emptySmall: { color: '#888', fontSize: '12px', textAlign: 'center', fontStyle: 'italic' }
};

export default Notifications;