import React, { useState, useEffect } from 'react';

const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://m-tms.thedesigns.live';

const Notifications = () => {
    const [data, setData] = useState({ 
        announcements: [], memberRequests: [], deletionRequests: [], 
        teams: [], canManageAnnounce: false, canManageMembers: false 
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('announce'); // 'announce' or 'requests'

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/notifications`, { credentials: 'include' });
            const result = await res.json();
            if (result.success) setData(result);
        } catch (err) { console.error("Fetch error:", err); } 
        finally { setLoading(false); }
    };

    // Process Member/Deletion Requests
    const handleRequestAction = async (endpoint, id) => {
        try {
            const res = await fetch(`${BASE_URL}/api/notifications${endpoint}`, { credentials: 'include' });
            const resData = await res.json();
            if (resData.success) {
                setData(prev => ({
                    ...prev,
                    memberRequests: prev.memberRequests.filter(r => r.id !== id),
                    deletionRequests: prev.deletionRequests.filter(r => r.id !== id)
                }));
            }
        } catch (err) { alert("Error processing request"); }
    };

    if (loading) return <div style={styles.loader}>Loading Notifications...</div>;

    return (
        <div style={styles.container}>
            {/* --- TOP TOGGLE (Only if canManageMembers is true) --- */}
            {data.canManageMembers && (
                <div style={styles.toggleWrapper}>
                    <div 
                        style={{...styles.tabBtn, ...(activeTab === 'announce' ? styles.activeTab : {})}}
                        onClick={() => setActiveTab('announce')}
                    >Announcements</div>
                    <div 
                        style={{...styles.tabBtn, ...(activeTab === 'requests' ? styles.activeTab : {})}}
                        onClick={() => setActiveTab('requests')}
                    >
                        Requests {(data.memberRequests.length + data.deletionRequests.length) > 0 && <span style={styles.notifBadge}>!</span>}
                    </div>
                </div>
            )}

            {activeTab === 'announce' ? (
                <div id="announcement-view">
                    <div style={styles.header}>
                        <h2 style={styles.title}>Announcements</h2>
                        {data.canManageAnnounce && (
                            <button style={styles.addBtn}><i className="fa-solid fa-plus"></i> Add</button>
                        )}
                    </div>

                    {data.announcements.length > 0 ? data.announcements.map((a) => (
                        <div key={a.id} style={styles.annCard}>
                            {data.canManageAnnounce && (
                                <div style={styles.cardActions}>
                                    <button style={styles.iconBtn} title="Edit"><i className="fa-solid fa-pen-to-square"></i></button>
                                    <button style={{...styles.iconBtn, color:'#ff4d4d'}} title="Delete"><i className="fa-solid fa-trash"></i></button>
                                </div>
                            )}
                            <h3 style={styles.annTitle}>{a.title}</h3>
                            <div style={styles.metaRow}>
                                <span><i className="fa-solid fa-user-tag"></i> {a.added_by_name}</span>
                                <span style={styles.sep}>|</span>
                                <span><i className="fa-solid fa-users"></i> {a.target_team_name}</span>
                            </div>
                            <p style={styles.annDesc}>{a.description}</p>
                            <div style={styles.cardFooter}>
                                <span><i className="fa-regular fa-calendar"></i> {new Date(a.created_at).toLocaleDateString()}</span>
                                {a.attachment && (
                                    <a href={`${BASE_URL}/uploads/${a.attachment}`} target="_blank" style={styles.link}>
                                        <i className="fa-solid fa-paperclip"></i> View Attachment
                                    </a>
                                )}
                            </div>
                        </div>
                    )) : <p style={styles.empty}>No announcements found.</p>}
                </div>
            ) : (
                <div id="requests-view">
                    {/* ADD REQUESTS */}
                    <h4 style={{...styles.subHeader, color: '#2ecc71'}}><i className="fa-solid fa-user-plus"></i> Add Requests</h4>
                    {data.memberRequests.length > 0 ? data.memberRequests.map(r => (
                        <div key={r.id} style={{...styles.reqCard, borderLeft:'4px solid #2ecc71'}}>
                            <div style={styles.reqFlex}>
                                <div style={styles.avatar}>{r.name.charAt(0)}</div>
                                <div style={{flex:1}}>
                                    <h4 style={{margin:0, color:'#fff'}}>{r.name}</h4>
                                    <p style={styles.smallText}>{r.email} | {r.role_name}</p>
                                </div>
                                <div style={styles.actionCol}>
                                    <button onClick={() => handleRequestAction(`/approve-member/${r.id}`, r.id)} style={styles.btnGreen}>Accept</button>
                                    <button onClick={() => handleRequestAction(`/reject-member/${r.id}`, r.id)} style={styles.btnRed}>Reject</button>
                                </div>
                            </div>
                        </div>
                    )) : <p style={styles.emptySmall}>No pending add requests.</p>}

                    {/* DELETION REQUESTS */}
                    <h4 style={{...styles.subHeader, color: '#ff4d4d', marginTop:30}}><i className="fa-solid fa-user-minus"></i> Deletion Requests</h4>
                    {data.deletionRequests.length > 0 ? data.deletionRequests.map(r => (
                        <div key={r.id} style={{...styles.reqCard, borderLeft:'4px solid #ff4d4d', background:'#352525'}}>
                            <div style={styles.reqFlex}>
                                <div style={{...styles.avatar, background:'#ff4d4d'}}>{r.name.charAt(0)}</div>
                                <div style={{flex:1}}>
                                    <h4 style={{margin:0, color:'#ff4d4d'}}>{r.name}</h4>
                                    <p style={styles.smallText}>Requested by {r.requested_by_name}</p>
                                </div>
                                <div style={styles.actionCol}>
                                    <button onClick={() => handleRequestAction(`/confirm-deletion/${r.id}`, r.id)} style={styles.btnRed}>Delete</button>
                                    <button onClick={() => handleRequestAction(`/reject-deletion/${r.id}`, r.id)} style={styles.btnGreen}>Keep</button>
                                </div>
                            </div>
                        </div>
                    )) : <p style={styles.emptySmall}>No pending deletion requests.</p>}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '15px', background: '#3C3A3A', minHeight: '100dvh', fontFamily: 'Arial, sans-serif' },
    loader: { color: 'white', textAlign: 'center', padding: 50 },
    toggleWrapper: { display: 'flex', background: '#2E2D2D', borderRadius: 30, padding: 4, marginBottom: 20 },
    tabBtn: { flex: 1, textAlign: 'center', padding: '10px 0', color: '#888', fontSize: 13, cursor: 'pointer', borderRadius: 25, transition: '0.3s' },
    activeTab: { background: '#0F8989', color: '#fff', fontWeight: 'bold' },
    notifBadge: { background: '#ff3b3b', color: '#fff', padding: '1px 6px', borderRadius: '50%', fontSize: 10, marginLeft: 5 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { color: '#fff', fontSize: 18, margin: 0 },
    addBtn: { background: '#0F8989', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' },
    annCard: { background: '#444', padding: 15, borderRadius: 8, marginBottom: 15, borderLeft: '5px solid #0F8989', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
    annTitle: { color: '#CDF4F4', fontSize: 16, margin: '0 0 5px 0', paddingRight: 60 },
    metaRow: { display: 'flex', fontSize: 11, color: '#aaa', marginBottom: 10 },
    sep: { margin: '0 8px', opacity: 0.3 },
    annDesc: { color: '#eee', fontSize: 13, lineHeight: 1.5, margin: '10px 0' },
    cardFooter: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginTop: 10 },
    link: { color: '#0F8989', textDecoration: 'none', fontWeight: 'bold' },
    cardActions: { position: 'absolute', top: 12, right: 12, display: 'flex', gap: 10 },
    iconBtn: { background: 'none', border: 'none', color: '#999', fontSize: 14, cursor: 'pointer' },
    subHeader: { fontSize: 14, borderBottom: '1px solid #555', paddingBottom: 5, marginBottom: 15, letterSpacing: 0.5 },
    reqCard: { background: '#2E2D2D', padding: 12, borderRadius: 8, marginBottom: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
    reqFlex: { display: 'flex', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: '50%', background: '#095959', color: '#fff', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', fontSize: 18 },
    smallText: { color: '#bbb', fontSize: 11, margin: '2px 0' },
    actionCol: { display: 'flex', flexDirection: 'column', gap: 5 },
    btnGreen: { background: '#2ecc71', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, fontSize: 10, fontWeight: 'bold' },
    btnRed: { background: '#e74c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 4, fontSize: 10, fontWeight: 'bold' },
    empty: { textAlign: 'center', color: '#888', marginTop: 40 },
    emptySmall: { textAlign: 'center', color: '#666', fontSize: 12, fontStyle: 'italic' }
};

export default Notifications;