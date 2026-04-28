import React, { useState, useEffect } from 'react';

const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://m-tms.thedesigns.live';

const Notifications = () => {
    const [data, setData] = useState({ announcements: [], memberRequests: [], deletionRequests: [], teams: [], canManageAnnounce: false, canManageMembers: false });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('announce');
    const [modal, setModal] = useState({ show: false, type: 'add', editId: null });

    // Form states
    const [form, setForm] = useState({ title: '', desc: '', teamId: '0', file: null });

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/notifications`, { credentials: 'include' });
            const result = await res.json();
            if (result.success) setData(result);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('description', form.desc);
        formData.append('role_id', form.teamId);
        if (form.file) formData.append('attachment', form.file);

        const url = modal.type === 'add' ? `${BASE_URL}/api/notifications/add-announcement` : `${BASE_URL}/api/notifications/edit-announcement/${modal.editId}`;
        try {
            const res = await fetch(url, { method: 'POST', body: formData, credentials: 'include' });
            const result = await res.json();
            if (result.success) {
                setModal({ show: false, type: 'add', editId: null });
                fetchNotifications();
                setForm({ title: '', desc: '', teamId: '0', file: null });
            }
        } catch (err) { alert("Error saving announcement"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Permanent delete?")) return;
        try {
            const res = await fetch(`${BASE_URL}/api/notifications/delete-announcement/${id}`, { credentials: 'include' });
            const result = await res.json();
            if (result.success) fetchNotifications();
        } catch (err) { alert("Delete failed"); }
    };

    const openEdit = (a) => {
        setForm({ title: a.title, desc: a.description, teamId: a.role_id.toString(), file: null });
        setModal({ show: true, type: 'edit', editId: a.id });
    };

    if (loading) return <div style={styles.loader}>Loading...</div>;

    return (
        <div style={styles.container}>
            {data.canManageMembers && (
                <div style={styles.toggleRow}>
                    <div style={{...styles.tab, ...(activeTab === 'announce' ? styles.activeTab : {})}} onClick={() => setActiveTab('announce')}>Announcements</div>
                    <div style={{...styles.tab, ...(activeTab === 'requests' ? styles.activeTab : {})}} onClick={() => setActiveTab('requests')}>
                        Requests {(data.memberRequests.length + data.deletionRequests.length) > 0 && <span style={styles.badge}>!</span>}
                    </div>
                </div>
            )}

            {activeTab === 'announce' ? (
                <div>
                    <div style={styles.header}>
                        <h2 style={styles.title}>Announcements</h2>
                        {data.canManageAnnounce && (
                            <button style={styles.addBtn} onClick={() => { setForm({title:'', desc:'', teamId:'0', file:null}); setModal({show:true, type:'add', editId:null}); }}>
                                <i className="fa-solid fa-plus" style={{marginRight:5}}></i> Add
                            </button>
                        )}
                    </div>

                    {data.announcements.map(a => (
                        <div key={a.id} style={styles.annCard}>
                            {data.canManageAnnounce && (
                                <div style={styles.cardActions}>
                                    <button style={styles.iconBtn} onClick={() => openEdit(a)}><i className="fa-solid fa-pen-to-square"></i></button>
                                    <button style={{...styles.iconBtn, color:'#ff4d4d'}} onClick={() => handleDelete(a.id)}><i className="fa-solid fa-trash"></i></button>
                                </div>
                            )}
                            <h3 style={styles.annTitle}>{a.title}</h3>
                            <div style={styles.metaRow}>
                                <span>{a.added_by_name}</span><span style={styles.sep}>|</span>
                                <span style={{color:'#14b8a6'}}>{a.target_team_name}</span>
                            </div>
                            <p style={styles.descText}>{a.description}</p>
                            <div style={styles.footer}>
                                <span>{new Date(a.created_at).toLocaleDateString()}</span>
                                {a.attachment && <a href={`${BASE_URL}/uploads/${a.attachment}`} target="_blank" style={styles.attachLink}>View File</a>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div id="req-section">
                    <h4 style={{color:'#2ecc71', marginBottom:15, textAlign:'left'}}>Add Requests</h4>
                    {data.memberRequests.map(r => (
                        <div key={r.id} style={{...styles.reqCard, borderLeft:'4px solid #2ecc71'}}>
                            <div style={styles.reqFlex}>
                                <div style={styles.avatar}>{r.name.charAt(0)}</div>
                                <div style={{flex:1, marginLeft:10, textAlign:'left'}}>
                                    <h4 style={{margin:0, color:'#fff'}}>{r.name}</h4>
                                    <p style={styles.metaRow}>{r.email} | {r.role_name}</p>
                                </div>
                                <div style={styles.btnStack}><button style={styles.btnSmlGreen}>Accept</button></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal.show && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={{color:'#333', marginTop:0}}>{modal.type === 'add' ? 'Create' : 'Edit'} Announcement</h3>
                        <form onSubmit={handleSubmit}>
                            <label style={styles.label}>Title</label>
                            <input style={styles.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                            <label style={styles.label}>Description</label>
                            <textarea style={{...styles.input, height:80}} value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} />
                            <label style={styles.label}>Target Team</label>
                            <select style={styles.input} value={form.teamId} onChange={e => setForm({...form, teamId: e.target.value})}>
                                <option value="0">All Members</option>
                                {data.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <label style={styles.label}>File (Optional)</label>
                            <input type="file" style={styles.input} onChange={e => setForm({...form, file: e.target.files[0]})} />
                            <div style={{display:'flex', gap:10}}>
                                <button type="submit" style={{...styles.addBtn, flex:1, borderRadius:5}}>{modal.type === 'add' ? 'Post' : 'Update'}</button>
                                <button type="button" onClick={() => setModal({show:false, type:'add', editId:null})} style={{...styles.addBtn, flex:1, background:'#666', borderRadius:5}}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '15px', background: '#3C3A3A', minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
    loader: { color: 'white', textAlign: 'center', marginTop: 50 },
    toggleRow: { display: 'flex', background: '#2E2D2D', borderRadius: 30, padding: 5, marginBottom: 20 },
    tab: { flex: 1, textAlign: 'center', padding: '10px 0', color: '#aaa', fontSize: 13, cursor: 'pointer', borderRadius: 25 },
    activeTab: { background: '#0F8989', color: '#fff', fontWeight: 'bold' },
    badge: { background: '#ff3b3b', color: '#fff', borderRadius: '50%', padding: '1px 6px', fontSize: 10, marginLeft: 5 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { color: '#fff', fontSize: 18, margin: 0 },
    addBtn: { background: '#0F8989', color: 'white', border: 'none', padding: '8px 15px', borderRadius: 100, fontSize: 12, fontWeight: 'bold' },
    annCard: { background: '#444', padding: 15, borderRadius: 8, marginBottom: 15, borderLeft: '5px solid #0F8989', position: 'relative', textAlign:'left' },
    cardActions: { position: 'absolute', top: 12, right: 12, display: 'flex', gap: 12 },
    iconBtn: { background: 'none', border: 'none', color: '#aaa', fontSize: 15, cursor:'pointer' },
    annTitle: { color: '#CDF4F4', fontSize: 17, margin: '0 0 5px 0', paddingRight: 60 },
    metaRow: { display: 'flex', fontSize: 11, color: '#aaa', marginBottom: 10 },
    sep: { margin: '0 8px', opacity: 0.3 },
    descText: { color: '#eee', fontSize: 13, lineHeight: 1.5, margin: '10px 0' },
    footer: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888' },
    attachLink: { color: '#0F8989', textDecoration: 'none', fontWeight: 'bold' },
    modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:2000, padding:20 },
    modalContent: { background:'#fff', padding:20, borderRadius:10, width:'100%', maxWidth:400 },
    label: { display:'block', fontSize:12, fontWeight:'bold', color:'#555', marginBottom:5, textAlign:'left' },
    input: { width:'100%', padding:10, marginBottom:15, borderRadius:5, border:'1px solid #ddd' },
    reqCard: { background: '#2E2D2D', padding: 12, borderRadius: 8, marginBottom: 10 },
    reqFlex: { display: 'flex', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: '50%', background: '#095959', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
    btnStack: { display: 'flex', flexDirection: 'column', gap: 5 },
    btnSmlGreen: { background: '#2ecc71', color: 'white', border: 'none', padding: '5px 10px', borderRadius: 4, fontSize: 10 }
};

export default Notifications;