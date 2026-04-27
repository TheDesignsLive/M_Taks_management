import React, { useState, useEffect } from 'react';

const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://m-tms.thedesigns.live';

const Notifications = () => {
    const [data, setData] = useState({ announcements: [], memberRequests: [], deletionRequests: [], roles: [] });
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

    if (loading) return <div style={{padding:'20px', color:'white'}}>Loading...</div>;

    return (
        <div style={styles.container}>
            {/* Announcements Section */}
            <div style={styles.sectionHeader}>
                <h2 style={styles.title}>Announcements</h2>
            </div>
            
            {data.announcements.length > 0 ? data.announcements.map(a => (
                <div key={a.id} style={styles.annCard}>
                    <h3 style={styles.annTitle}>{a.title}</h3>
                    <p style={styles.annDesc}>{a.description}</p>
                    <div style={styles.footerRow}>
                        <span>By {a.added_by_name || 'System'}</span>
                        <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            )) : <p style={styles.emptyText}>No announcements yet.</p>}

            {/* Member Requests (Only if present) */}
            {(data.sessionRole === 'admin' || data.sessionRole === 'owner') && (
                <>
                    <div style={styles.sectionHeader}>
                        <h2 style={{...styles.title, color: '#2ecc71'}}>Add Requests</h2>
                    </div>
                    {data.memberRequests.map(r => (
                        <div key={r.id} style={{...styles.annCard, borderLeft:'4px solid #2ecc71'}}>
                            <p style={{margin:0, fontWeight:'bold', color:'white'}}>{r.name}</p>
                            <p style={styles.annDesc}>{r.email} - {r.role_name}</p>
                            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                                <button style={styles.btnAccept}>Accept</button>
                                <button style={styles.btnReject}>Reject</button>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '15px', fontFamily: 'Segoe UI, sans-serif' },
    sectionHeader: { marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' },
    title: { fontSize: '18px', color: '#fff', margin: 0 },
    annCard: { background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px', marginBottom: '15px', borderLeft: '4px solid #14b8a6' },
    annTitle: { margin: '0 0 8px 0', fontSize: '16px', color: '#CDF4F4' },
    annDesc: { fontSize: '13px', color: '#eee', lineHeight: '1.4', margin: '0 0 10px 0' },
    footerRow: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa' },
    emptyText: { textAlign: 'center', color: '#888', marginTop: '20px' },
    btnAccept: { background: '#2ecc71', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' },
    btnReject: { background: '#e74c3c', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' }
};

export default Notifications;