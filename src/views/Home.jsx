//Home.jsx
import React, { useState, useEffect } from 'react';

const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://m-tms.thedesigns.live';

const Home = () => {
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [activeSection, setActivePage] = useState('TASK'); // For Toggle
    const [loading, setLoading] = useState(true);

    const sections = ['TASK', 'CHANGES', 'UPDATE', 'OTHERS', 'COMPLETED'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/home/api/data`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setTasks(data.tasks);
                setMembers(data.members);
            }
        } catch (err) {
            console.error("Fetch error", err);
        } finally {
            setLoading(false);
        }
    };

    // --- DRAG & DROP LOGIC ---
    const onDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const onDrop = async (e, targetSection) => {
        const taskId = e.dataTransfer.getData("taskId");
        
        // Optimistic UI Update
        const updatedTasks = tasks.map(t => 
            t.id.toString() === taskId ? { ...t, section: targetSection } : t
        );
        setTasks(updatedTasks);

        // Backend Update
        await fetch(`${BASE_URL}/api/tasks/update-task-section`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: taskId, section: targetSection }),
            credentials: 'include'
        });
    };

    if (loading) return <div style={{color: 'white', textAlign: 'center', marginTop: '20px'}}>Loading Tasks...</div>;

    return (
        <div style={styles.container}>
            {/* 1. TOP TOGGLE NAVIGATION */}
            <div style={styles.tabBar}>
                {sections.map(sec => (
                    <button 
                        key={sec} 
                        onClick={() => setActivePage(sec)}
                        style={{
                            ...styles.tabButton,
                            borderBottom: activeSection === sec ? '3px solid #14b8a6' : 'none',
                            color: activeSection === sec ? '#14b8a6' : '#94a3b8'
                        }}
                    >
                        {sec}
                    </button>
                ))}
            </div>

            {/* 2. BOARD AREA (Desktop: Side by Side, Mobile: Current Active) */}
            <div style={styles.board}>
                {sections.map(sec => (
                    <div 
                        key={sec}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDrop(e, sec)}
                        style={{
                            ...styles.column,
                            display: window.innerWidth > 800 || activeSection === sec ? 'flex' : 'none'
                        }}
                    >
                        <div style={styles.columnHeader}>{sec}</div>
                        <div style={styles.taskList}>
                            {tasks
                                .filter(t => (t.status === 'COMPLETED' ? 'COMPLETED' : (t.section || 'TASK')) === sec)
                                .map(task => (
                                    <div 
                                        key={task.id} 
                                        draggable 
                                        onDragStart={(e) => onDragStart(e, task.id)}
                                        style={styles.taskItem}
                                    >
                                        <div style={styles.taskRow}>
                                            <span style={{
                                                ...styles.priorityDot, 
                                                background: task.priority === 'HIGH' ? '#ef4444' : '#f59e0b'
                                            }} />
                                            <div style={styles.taskTitle}>{task.title}</div>
                                        </div>
                                        <div style={styles.taskMeta}>
                                            <span>{task.assigned_by_name || 'Admin'}</span>
                                            <span>{new Date(task.due_date).toLocaleDateString('en-IN', {day:'2-digit', month:'short'})}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    container: { height: '100%', display: 'flex', flexDirection: 'column', background: '#121212' },
    tabBar: { 
        display: 'flex', overflowX: 'auto', background: '#1e1e1e', 
        padding: '10px 5px', gap: '10px', borderBottom: '1px solid #333' 
    },
    tabButton: { 
        background: 'none', border: 'none', padding: '8px 15px', 
        cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: '0.3s' 
    },
    board: { flex: 1, display: 'flex', overflowX: 'auto', padding: '10px', gap: '15px' },
    column: { 
        minWidth: '280px', flex: 1, background: '#1e1e1e', 
        borderRadius: '12px', flexDirection: 'column', height: '100%' 
    },
    columnHeader: { 
        padding: '12px', textAlign: 'center', background: '#0F8989', 
        color: 'white', borderRadius: '12px 12px 0 0', fontWeight: 'bold', fontSize: '13px' 
    },
    taskList: { padding: '10px', overflowY: 'auto', flex: 1 },
    taskItem: { 
        background: '#2a2a2a', padding: '12px', borderRadius: '8px', 
        marginBottom: '10px', cursor: 'grab', border: '1px solid #333' 
    },
    taskRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
    priorityDot: { width: '8px', height: '8px', borderRadius: '50%' },
    taskTitle: { color: '#e2e8f0', fontSize: '14px', fontWeight: '500' },
    taskMeta: { display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px' }
};

export default Home;