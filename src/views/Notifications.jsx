import React, { useState, useEffect } from 'react';

const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://m-tms.thedesigns.live';

const Notifications = () => {
    const [data, setData] = useState({ 
        announcements: [], memberRequests: [], deletionRequests: [], 
        teams: [], canManageAnnounce: false, canManageMembers: false 
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('announce'); // pattern for mobile UI

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/notifications`, { credentials: 'include' });
            const result = await res.json();
            if (result.success) setData(result);
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    if (loading) return <div style={styles.loader}>Loading...</div>;

    return (
        <div style={styles.container}>
            {/* TOGGLE TAB - PATTERN BASED ON PERMISSION */}
            {data.canManageMembers && (
                <div style={styles.toggleRow}>
                    <div style={{...styles.tab, ...(activeTab === 'announce' ? styles.activeTab : {})}} onClick={() => setActiveTab('announce')}>Announcements</div>
                    <div style={{...styles.tab, ...(activeTab === 'requests' ? styles.activeTab : {})}} onClick={() => setActiveTab('requests')}>
                        Requests {(data.memberRequests.length + data.deletionRequests.length) > 0 && <span style={styles.badge}>!</span>}
                    </div>
                </div>
            )}

            {activeTab === 'announce' ? (
                <div id="ann-section">
                    <div style={styles.header}>
                        <h2 style={styles.title}>Announcements</h2>
                        {data.canManageAnnounce && (
                            <button style={styles.addBtn}><i className="fa-solid fa-plus"></i> Add</button>
                        )}
                    </div>

                    {data.announcements.map(a => (
                        <div key={a.id} style={styles.annCard}>
                            {/* ACTION BUTTONS (PATTERN: ADMIN/OWNER/ADMIN-CONTROL ONLY) */}
                            {data.canManageAnnounce && (
                                <div style={styles.cardActions}>
                                    <button style={styles.iconBtn}><i className="fa-solid fa-pen-to-square"></i></button>
                                    <button style={{...styles.iconBtn, color:'#ff4d4d'}}><i className="fa-solid fa-trash"></i></button>
                                </div>
                            )}
                            <h3 style={styles.annTitle}>{a.title}</h3>
                            <div style={styles.metaRow}>
                                <span><i className="fa-solid fa-user-tag"></i> {a.added_by_name}</span>
                                <span style={styles.sep}>|</span>
                                <span><i className="fa-solid fa-users"></i> {a.target_team_name}</span>
                            </div>
                            <p style={styles.desc}>{a.description}</p>
                            <div style={styles.footer}>
                                <span><i className="fa-regular fa-clock"></i> {new Date(a.created_at).toLocaleDateString()}</span>
                                {a.attachment && <a href={`${BASE_URL}/uploads/${a.attachment}`} target="_blank" style={styles.attachLink}>Attachment</a>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div id="req-section">
                    {/* ADD REQUESTS (PATTERN: ADMIN/OWNER-CONTROL ONLY) */}
                    <h4 style={{color:'#2ecc71', marginBottom:15, fontSize:14}}>Add Requests</h4>
                    {data.memberRequests.length > 0 ? data.memberRequests.map(r => (
                        <div key={r.id} style={{...styles.reqCard, borderLeft:'4px solid #2ecc71'}}>
                            <div style={styles.reqFlex}>
                                <div style={styles.avatar}>{r.name.charAt(0)}</div>
                                <div style={{flex:1, marginLeft:10}}>
                                    <h4 style={{margin:0, color:'#fff', fontSize:14}}>{r.name}</h4>
                                    <p style={styles.metaText}>{r.email} | {r.role_name}</p>
                                </div>
                                <div style={styles.btnStack}>
                                    <button style={styles.btnSmlGreen}>Accept</button>
                                    <button style={styles.btnSmlRed}>Reject</button>
                                </div>
                            </div>
                        </div>
                    )) : <p style={styles.emptyText}>No pending add requests.</p>}

                    {/* DELETION REQUESTS */}
                    <h4 style={{color:'#ff4d4d', marginTop:25, marginBottom:15, fontSize:14}}>Deletion Requests</h4>
                    {data.deletionRequests.length > 0 ? data.deletionRequests.map(r => (
                        <div key={r.id} style={{...styles.reqCard, borderLeft:'4px solid #ff4d4d', background:'#352525'}}>
                            <div style={styles.reqFlex}>
                                <div style={{...styles.avatar, background:'#ff4d4d'}}>{r.name.charAt(0)}</div>
                                <div style={{flex:1, marginLeft:10}}>
                                    <h4 style={{margin:0, color:'#ff4d4d', fontSize:14}}>{r.name}</h4>
                                    <p style={styles.metaText}>Requested by {r.requested_by_name}</p>
                                </div>
                                <div style={styles.btnStack}>
                                    <button style={styles.btnSmlRed}>Delete</button>
                                    <button style={styles.btnSmlGreen}>Keep</button>
                                </div>
                            </div>
                        </div>
                    )) : <p style={styles.emptyText}>No pending deletion requests.</p>}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '15px', background: '#3C3A3A', minHeight: '100%', fontFamily: 'Arial, sans-serif' },
    loader: { color: 'white', textAlign: 'center', marginTop: 50 },
    toggleRow: { display: 'flex', background: '#2E2D2D', borderRadius: 30, padding: 5, marginBottom: 20 },
    tab: { flex: 1, textAlign: 'center', padding: '10px 0', color: '#aaa', fontSize: 13, cursor: 'pointer', borderRadius: 25 },
    activeTab: { background: '#0F8989', color: '#fff', fontWeight: 'bold' },
    badge: { background: '#ff3b3b', color: '#fff', borderRadius: '50%', padding: '1px 6px', fontSize: 10, marginLeft: 5 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { color: '#fff', fontSize: 18, margin: 0 },
    addBtn: { background: '#0F8989', color: 'white', border: 'none', padding: '6px 15px', borderRadius: 100, fontSize: 12, fontWeight: 'bold' },
    annCard: { background: '#444', padding: 15, borderRadius: 8, marginBottom: 15, borderLeft: '5px solid #0F8989', position: 'relative' },
    annTitle: { color: '#CDF4F4', fontSize: 16, margin: '0 0 5px 0', paddingRight: 60 },
    metaRow: { display: 'flex', fontSize: 11, color: '#aaa', marginBottom: 10 },
    sep: { margin: '0 8px', opacity: 0.3 },
    desc: { color: '#eee', fontSize: 13, lineHeight: 1.5, margin: '10px 0' },
    footer: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888' },
    attachLink: { color: '#0F8989', textDecoration: 'none', fontWeight: 'bold' },
    cardActions: { position: 'absolute', top: 12, right: 12, display: 'flex', gap: 10 },
    iconBtn: { background: 'none', border: 'none', color: '#999', fontSize: 14, cursor: 'pointer' },
    reqCard: { background: '#2E2D2D', padding: 12, borderRadius: 8, marginBottom: 10 },
    reqFlex: { display: 'flex', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: '50%', background: '#095959', color: 'white', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold' },
    metaText: { color: '#bbb', fontSize: 11, margin: '2px 0' },
    btnStack: { display: 'flex', flexDirection: 'column', gap: 5 },
    btnSmlGreen: { background: '#2ecc71', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 10 },
    btnSmlRed: { background: '#e74c3c', color: 'white', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 10 },
    emptyText: { textAlign: 'center', color: '#666', fontSize: 12, fontStyle: 'italic', padding: '10px 0' }
};

export default Notifications;