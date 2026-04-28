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
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const processRequest = async (endpoint, id) => {
        const res = await fetch(`${BASE_URL}/api/notifications${endpoint}`, { credentials: 'include' });
        const resData = await res.json();
        if (resData.success) {
            setData(prev => ({
                ...prev,
                memberRequests: prev.memberRequests.filter(r => r.id !== id),
                deletionRequests: prev.deletionRequests.filter(r => r.id !== id)
            }));
        }
    };

    if (loading) return <div style={styles.loader}>Loading...</div>;

    return (
        <div style={styles.container}>
            {/* ─── TOP TOGGLE (Only if user has both permissions) ─── */}
            {data.canManageMembers && (
                <div style={styles.toggleContainer}>
                    <div 
                        style={{...styles.toggleBtn, ...(activeTab === 'announce' ? styles.activeToggle : {})}}
                        onClick={() => setActiveTab('announce')}
                    >Announcements</div>
                    <div 
                        style={{...styles.toggleBtn, ...(activeTab === 'requests' ? styles.activeToggle : {})}}
                        onClick={() => setActiveTab('requests')}
                    >Requests {(data.memberRequests.length + data.deletionRequests.length) > 0 && <span style={styles.badge}>!</span>}</div>
                </div>
            )}

            {activeTab === 'announce' ? (
                <div id="announce-section">
                    <div style={styles.headerRow}>
                        <h2 style={styles.title}>Announcements</h2>
                        {data.canManageAnnounce && (
                            <button style={styles.addBtn}><i className="fa-solid fa-plus"></i> Add</button>
                        )}
                    </div>

                    {data.announcements.length > 0 ? data.announcements.map(a => (
                        <div key={a.id} style={styles.annCard}>
                            {data.canManageAnnounce && (
                                <div style={styles.cardActions}>
                                    <button style={styles.iconBtn}><i className="fa-solid fa-pen-to-square"></i></button>
                                    <button style={{...styles.iconBtn, color:'#ff4d4d'}}><i className="fa-solid fa-trash"></i></button>
                                </div>
                            )}
                            <h3 style={styles.annTitle}>{a.title}</h3>
                            <p style={styles.metaText}>
                                <b>{a.added_by_name}</b> | To: <span style={{color:'#14b8a6'}}>{a.target_team_name}</span>
                            </p>
                            <p style={styles.annDesc}>{a.description}</p>
                            <div style={styles.footerRow}>
                                <span><i className="fa-regular fa-clock"></i> {new Date(a.created_at).toLocaleDateString()}</span>
                                {a.attachment && <a href={`${BASE_URL}/uploads/${a.attachment}`} target="_blank" style={styles.attachLink}><i className="fa-solid fa-paperclip"></i> View</a>}
                            </div>
                        </div>
                    )) : <p style={styles.emptyText}>No announcements found.</p>}
                </div>
            ) : (
                <div id="request-section">
                    {/* Add Requests */}
                    <h4 style={{...styles.subHeader, color: '#2ecc71'}}>Add Requests ({data.memberRequests.length})</h4>
                    {data.memberRequests.map(r => (
                        <div key={r.id} style={{...styles.reqCard, borderLeft:'4px solid #2ecc71'}}>
                            <div style={styles.reqFlex}>
                                <div style={styles.avatarCircle}>{r.name.charAt(0)}</div>
                                <div style={{flex:1, marginLeft:10}}>
                                    <h4 style={{margin:0, color:'#fff'}}>{r.name}</h4>
                                    <p style={styles.reqInfo}>{r.email} | {r.role_name}</p>
                                </div>
                                <div style={styles.btnCol}>
                                    <button onClick={() => processRequest(`/approve-member/${r.id}`, r.id)} style={styles.btnAccept}>Accept</button>
                                    <button onClick={() => processRequest(`/reject-member/${r.id}`, r.id)} style={styles.btnReject}>Reject</button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Deletion Requests */}
                    <h4 style={{...styles.subHeader, color: '#ff4d4d', marginTop:25}}>Deletion Requests ({data.deletionRequests.length})</h4>
                    {data.deletionRequests.map(r => (
                        <div key={r.id} style={{...styles.reqCard, borderLeft:'4px solid #ff4d4d', background:'#352525'}}>
                            <div style={styles.reqFlex}>
                                <div style={{...styles.avatarCircle, background:'#ff4d4d'}}>{r.name.charAt(0)}</div>
                                <div style={{flex:1, marginLeft:10}}>
                                    <h4 style={{margin:0, color:'#ff4d4d'}}>{r.name}</h4>
                                    <p style={styles.reqInfo}>Requested by {r.requested_by_name}</p>
                                </div>
                                <div style={styles.btnCol}>
                                    <button onClick={() => processRequest(`/confirm-deletion/${r.id}`, r.id)} style={styles.btnReject}>Delete</button>
                                    <button onClick={() => processRequest(`/reject-deletion/${r.id}`, r.id)} style={styles.btnAccept}>Keep</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '15px', background: '#3C3A3A', minHeight: '100dvh', fontFamily: 'Arial, sans-serif' },
    loader: { color:'white', textAlign:'center', padding:50 },
    toggleContainer: { display:'flex', background:'#2E2D2D', borderRadius:30, padding:5, marginBottom:20 },
    toggleBtn: { flex:1, textAlign:'center', padding:'8px 0', color:'#aaa', fontSize:13, borderRadius:25, cursor:'pointer', transition:'0.3s' },
    activeToggle: { background:'#0F8989', color:'#fff', fontWeight:'bold' },
    badge: { background:'#ff4d4d', color:'white', fontSize:10, padding:'1px 5px', borderRadius:'50%', marginLeft:5 },
    headerRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:15 },
    title: { color:'#fff', fontSize:18, margin:0 },
    addBtn: { background:'#0F8989', color:'white', border:'none', padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:'bold' },
    annCard: { background:'#444', padding:15, borderRadius:8, marginBottom:15, borderLeft:'5px solid #0F8989', position:'relative', boxShadow:'0 4px 6px rgba(0,0,0,0.2)' },
    cardActions: { position:'absolute', top:10, right:10, display:'flex', gap:8 },
    iconBtn: { background:'none', border:'none', color:'#aaa', fontSize:14, cursor:'pointer' },
    annTitle: { color:'#CDF4F4', fontSize:16, margin:'0 0 5px 0', paddingRight:50 },
    metaText: { color:'#aaa', fontSize:11, margin:'5px 0' },
    annDesc: { color:'#eee', fontSize:13, lineHeight:1.5, margin:'10px 0' },
    footerRow: { display:'flex', justifyContent:'space-between', fontSize:10, color:'#888', alignItems:'center' },
    attachLink: { color:'#0F8989', textDecoration:'none', fontWeight:'bold', fontSize:11 },
    subHeader: { fontSize:14, borderBottom:'1px solid #555', paddingBottom:5, marginBottom:15 },
    reqCard: { background:'#2E2D2D', padding:12, borderRadius:8, marginBottom:10 },
    reqFlex: { display:'flex', alignItems:'center' },
    avatarCircle: { width:40, height:40, borderRadius:'50%', background:'#095959', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'bold' },
    reqInfo: { color:'#bbb', fontSize:11, margin:'2px 0' },
    btnCol: { display:'flex', flexDirection:'column', gap:5 },
    btnAccept: { background:'#2ecc71', color:'white', border:'none', padding:'4px 8px', borderRadius:4, fontSize:10, fontWeight:'bold' },
    btnReject: { background:'#e74c3c', color:'white', border:'none', padding:'4px 8px', borderRadius:4, fontSize:10, fontWeight:'bold' },
    emptyText: { textAlign:'center', color:'#888', marginTop:30 }
};

export default Notifications;