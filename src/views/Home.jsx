// Home.jsx — Mobile Task Board
import React, { useState, useEffect, useRef, useCallback } from 'react';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://m-tms.thedesigns.live';

const SECTIONS = ['TASK', 'CHANGES', 'UPDATE', 'OTHERS', 'COMPLETED'];
const SECTION_LABELS = {
  TASK: 'Task',
  CHANGES: 'Change',
  UPDATE: 'Update',
  OTHERS: 'Others',
  COMPLETED: 'Completed',
};
const PRIORITY_COLORS = { HIGH: '#ef4444', MEDIUM: '#eab308', LOW: '#3b82f6' };
const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  d.setHours(0,0,0,0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tom';
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
}

function toInputDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

// ─── CheckboxAnim ────────────────────────────────────────────────────────────
function AnimCheckbox({ checked, color, onChange }) {
  const [anim, setAnim] = useState(false);
  const handleChange = () => {
    if (!checked) { setAnim(true); setTimeout(() => setAnim(false), 500); }
    onChange();
  };
  return (
    <>
      <style>{`
        @keyframes checkDraw {
          0%   { stroke-dashoffset: 20; opacity: 0; }
          40%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes boxPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.3); }
          70%  { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div
        onClick={handleChange}
        style={{
          width: 16, height: 16, borderRadius: 4,
          border: `2px solid ${color}`,
          background: checked ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, position: 'relative',
          transition: 'background 0.2s, border-color 0.2s',
          animation: anim ? 'boxPop 0.45s ease forwards' : 'none',
          boxSizing: 'border-box',
        }}
      >
    {checked && (
          <svg width="9" height="9" viewBox="0 0 10 10" style={{ display:'block' }}>
            <polyline
              points="1.5,5 4,7.5 8.5,2"
              fill="none"
stroke={color === '#ef4444' ? '#7f1d1d' : color === '#eab308' ? '#713f12' : '#1e3a5f'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="20"
              strokeDashoffset="0"
              style={{ animation: anim ? 'checkDraw 0.35s ease forwards' : 'none' }}
            />
          </svg>
        )}
      </div>
    </>
  );
}

// ─── EditTaskModal ────────────────────────────────────────────────────────────
function EditTaskModal({ task, members, adminName, role, onSave, onClose }) {
  const [title, setTitle] = useState(task.title || '');
  const [desc, setDesc] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(toInputDate(task.due_date));
  const [assignedTo, setAssignedTo] = useState(String(task.assigned_to ?? ''));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ title, description: desc, priority, due_date: dueDate || null, assigned_to: assignedTo });
    setSaving(false);
  };

  const habdlke =async() => {
    try{
      await onSave({ title, description: desc, priority, due_date: dueDate || null, assigned_to: assignedTo });
    }
    catch(err){
      console.log("errorserver error arive")
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <span style={styles.modalTitle}>Edit Task</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} style={styles.input} placeholder="Task title"/>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} style={{...styles.input, minHeight:70, resize:'vertical'}} placeholder="Description"/>
        </div>

        <div style={{display:'flex', gap:8}}>
          <div style={{...styles.field, flex:1}}>
            <label style={styles.label}>Priority</label>
            <select value={priority} onChange={e=>setPriority(e.target.value)} style={styles.input}>
              {PRIORITY_OPTIONS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{...styles.field, flex:1}}>
            <label style={styles.label}>Due Date</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={styles.input}/>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Assign To</label>
          <select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} style={styles.input}>
            {role === 'admin'
              ? <option value="0">My Self</option>
              : <>
                  <option value={String(task.assigned_by ?? '')}>My Self</option>
                  <option value="0">{adminName} (Admin)</option>
                </>
            }
            {members.map(m=><option key={m.id} value={String(m.id)}>{m.name}</option>)}
          </select>
        </div>

        <div style={styles.modalActions}>
          <button onClick={onClose} style={styles.cancelBtn} disabled={saving}>Cancel</button>
          <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ChangeSectionModal ───────────────────────────────────────────────────────
function ChangeSectionModal({ task, role, onMove, onClose }) {
  const currentSection = task.section || 'TASK';
  // Use backend-set flag directly — no guessing
  const isSelfTask = task.is_self_task === true;

  const available = SECTIONS.filter(s => {
    if (s === 'COMPLETED') return false;
    if (s === currentSection) return false;
    // Self tasks (assigned_to === assigned_by): show TASK, hide OTHERS
    if (isSelfTask && s === 'OTHERS') return false;
    // Tasks assigned by someone else (assigned_to !== assigned_by): show OTHERS, hide TASK
    if (!isSelfTask && s === 'TASK') return false;
    return true;
  });

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{...styles.modal, padding:0, overflow:'hidden'}}>
  <div style={{...styles.modalHeader, padding:'16px 18px 12px'}}>
          <span style={styles.modalTitle}>Move to Section</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        {available.map(sec => (
          <button key={sec} onClick={() => onMove(sec)} style={styles.sectionOption}>
            <span style={styles.sectionDot(sec)}/>
            {SECTION_LABELS[sec]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DatePickerModal ──────────────────────────────────────────────────────────
function DatePickerModal({ current, onSave, onClose }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.value = toInputDate(current);
    setTimeout(() => el.showPicker?.(), 50);
    const handleChange = e => {
      if (e.target.value) { onSave(e.target.value); }
      onClose();
    };
    const handleBlur = () => onClose();
    el.addEventListener('change', handleChange);
    el.addEventListener('blur', handleBlur);
    return () => {
      el.removeEventListener('change', handleChange);
      el.removeEventListener('blur', handleBlur);
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="date"
      style={{ position:'fixed', opacity:0, pointerEvents:'none', top:0, left:0, width:0, height:0 }}
    />
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ message, onConfirm, onClose }) {
  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{...styles.modal, maxWidth:280, textAlign:'center'}}>
        <div style={{fontSize:32, marginBottom:8}}>🗑️</div>
        <div style={{color:'#e2e8f0', fontWeight:700, fontSize:15, marginBottom:6}}>Delete Task?</div>
        <div style={{color:'#94a3b8', fontSize:13, marginBottom:18}}>{message}</div>
        <div style={styles.modalActions}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button onClick={onConfirm} style={{...styles.saveBtn, background:'#ef4444'}}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({ task, members, adminName, role, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cardVisible, setCardVisible] = useState(true);
  const menuBtnRef = useRef(null);
  const dateInputRef = useRef(null);

  const priority = (task.priority || 'LOW').toUpperCase();
  const color = PRIORITY_COLORS[priority] || '#3b82f6';
  const isCompleted = task.status === 'COMPLETED';
  const hasDesc = !!(task.description && task.description.trim());
  const date = formatDate(task.due_date);
  const past = isPastDate(task.due_date);

const handleCheckbox = async () => {
    setCompleting(true);
    const newStatus = isCompleted ? 'OPEN' : 'COMPLETED';
    await fetch(`${BASE_URL}/api/home/update-task-status`, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: task.id, status: newStatus })
    });
    setTimeout(async () => {
      setCardVisible(false);
      await new Promise(r=>setTimeout(r,350));
      onRefresh();
      setCompleting(false);
    }, 500);
  };

  const handleMove = async (section) => {
    setSectionOpen(false);
    await fetch(`${BASE_URL}/api/home/update-task-section`, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: task.id, section })
    });
    onRefresh();
  };

  const handleSaveEdit = async (fields) => {
    await fetch(`${BASE_URL}/api/home/edit-task-details`, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: task.id, ...fields })
    });
    setEditOpen(false);
    onRefresh();
  };

  const handleDateSave = async (date) => {
    await fetch(`${BASE_URL}/api/home/update-task-date`, {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: task.id, due_date: date })
    });
    setDateOpen(false);
    onRefresh();
  };

  const handleDelete = async () => {
    await fetch(`${BASE_URL}/api/home/delete-task/${task.id}`, {
      method:'POST', credentials:'include'
    });
    setDeleteOpen(false);
    onRefresh();
  };

  if (!cardVisible) return (
    <div style={{ overflow:'hidden', maxHeight:0, opacity:0, transition:'all 0.35s ease', marginBottom:0 }}/>
  );

return (
    <>
      <div style={{
        ...styles.taskCard,
        borderLeft: `4px solid ${color}`,
        opacity: isCompleted ? 0.55 : completing ? 0.4 : 1,
        transform: completing ? 'scale(0.97)' : 'scale(1)',
        transition: 'opacity 0.4s, transform 0.4s',
      }}>

        {/* Row 1: Checkbox + Title */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <AnimCheckbox checked={isCompleted} color={color} onChange={handleCheckbox}/>
          <div style={{ flex:1, minWidth:0, color: isCompleted ? '#888' : '#e2e8f0', fontSize:13.5, fontWeight:500, lineHeight:1.3, textAlign:'left', wordBreak:'break-word' }}>
            {task.title}
          </div>
        </div>

        {/* Row 2: Name+Move (left) | Info+Date+3dot (right) */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6, paddingLeft:26 }}>

          {/* Left side */}
          <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
            {task.assigned_by_name && (
              <span style={{ fontSize:11, color:'#94a3b8', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {task.assigned_by_name}
              </span>
            )}
            {!isCompleted && (
              <span
                onClick={() => setSectionOpen(true)}
                style={{ fontSize:10, color:'#64748b', cursor:'pointer', padding:'1px 6px', borderRadius:4, background:'#1e1e1e', border:'1px solid #334155', whiteSpace:'nowrap', flexShrink:0 }}
              >
                ↕ {SECTION_LABELS[task.section] || 'Task'}
              </span>
            )}
          </div>

          {/* Right side */}
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {/* Info icon — always reserves space */}
            <button
              onClick={() => hasDesc && setExpanded(v=>!v)}
              style={{ ...styles.iconBtn, opacity: hasDesc ? 1 : 0, cursor: hasDesc ? 'pointer' : 'default' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expanded?'#14b8a6':'#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8.5"/><line x1="12" y1="11" x2="12" y2="16"/>
              </svg>
            </button>

            {/* Date */}
            {date ? (
              <span
                onClick={() => { if (!isCompleted && dateInputRef.current) dateInputRef.current.showPicker?.(); }}
                style={{ fontSize:11, fontWeight:600, color: past && !isCompleted ? '#ef4444' : '#14b8a6', cursor: isCompleted ? 'default' : 'pointer', padding:'1px 6px', borderRadius:4, background: past && !isCompleted ? '#ef444415' : '#14b8a610', minWidth:60, textAlign:'center' }}
              >
                📅 {date}
              </span>
            ) : <span style={{ minWidth:60 }}/>}

            {/* 3-dot menu */}
            {!isCompleted && (
              <button
                ref={menuBtnRef}
                onClick={() => {
                  if (!showMenu && menuBtnRef.current) {
                    const rect = menuBtnRef.current.getBoundingClientRect();
                    const menuHeight = 164, menuWidth = 160;
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const openUpward = spaceBelow < menuHeight + 8;
                    setMenuPos({ top: openUpward ? rect.top - menuHeight : rect.bottom, left: rect.right - menuWidth, openUpward });
                  }
                  setShowMenu(v => !v);
                }}
                style={styles.iconBtn}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#64748b">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {expanded && hasDesc && (
          <div style={{ marginTop:10, borderTop:'1px solid #333', paddingTop:10, paddingLeft:26, fontSize:12.5, color:'#94a3b8', lineHeight:1.6, textAlign:'left' }}>
            {task.description}
          </div>
        )}
      </div>

      {showMenu && <div style={styles.menuBackdrop} onClick={()=>setShowMenu(false)}/>}

      {showMenu && (
        <div style={{
          ...styles.contextMenu,
          position: 'fixed',
          top: menuPos.top,
          left: menuPos.left,
          right: 'auto',
          borderRadius: menuPos.openUpward ? '10px 10px 10px 4px' : '4px 10px 10px 10px',
          transformOrigin: menuPos.openUpward ? 'bottom right' : 'top right',
          animation: 'menuPop 0.18s cubic-bezier(.34,1.56,.64,1)',
          zIndex: 99999,
        }}>
          <button style={styles.menuItem} onClick={()=>{setEditOpen(true);setShowMenu(false);}}>
            ✏️ Edit
          </button>
          <button style={styles.menuItem} onClick={()=>{setSectionOpen(true);setShowMenu(false);}}>
            ↕ Move Section
          </button>
 <button style={styles.menuItem} onClick={()=>{ setShowMenu(false); setTimeout(()=>dateInputRef.current?.showPicker?.(), 50); }}>
            📅 Change Date
          </button>
          <button style={{...styles.menuItem, color:'#ef4444', borderBottom:'none'}} onClick={()=>{setDeleteOpen(true);setShowMenu(false);}}>
            🗑️ Delete
          </button>
        </div>
      )}

      {editOpen && (
        <EditTaskModal task={task} members={members} adminName={adminName} role={role}
          onSave={handleSaveEdit} onClose={()=>setEditOpen(false)}/>
      )}
      {sectionOpen && (
        <ChangeSectionModal task={task} role={role} onMove={handleMove} onClose={()=>setSectionOpen(false)}/>
      )}
<input
        ref={dateInputRef}
        type="date"
        defaultValue={toInputDate(task.due_date)}
        onChange={e => { if (e.target.value) handleDateSave(e.target.value); }}
        style={{ position:'fixed', opacity:0, pointerEvents:'none', top:0, left:0, width:0, height:0 }}
      />
      {deleteOpen && (
        <DeleteConfirmModal
          message="This task will be permanently removed."
          onConfirm={handleDelete} onClose={()=>setDeleteOpen(false)}/>
      )}
    </>
  );
}

// ─── SectionColumn ────────────────────────────────────────────────────────────
function SectionColumn({ section, tasks, members, adminName, role, onRefresh }) {
const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const filtered = tasks
    .filter(t => {
      if (section === 'COMPLETED') return t.status === 'COMPLETED';
      return t.status !== 'COMPLETED' && (t.section || 'TASK') === section;
    })
    .sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
      const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
      if (dateA - dateB !== 0) return dateA - dateB;
      const pa = PRIORITY_ORDER[(a.priority || 'LOW').toUpperCase()] ?? 2;
      const pb = PRIORITY_ORDER[(b.priority || 'LOW').toUpperCase()] ?? 2;
      return pa - pb;
    });

  return (
    <div style={{ flex:'0 0 100%', width:'100%', overflowY:'auto', padding:'12px 14px 80px', boxSizing:'border-box' }}>
      {filtered.length === 0 ? (
        <div style={{ color:'#555', textAlign:'center', marginTop:60, fontSize:13 }}>
          <div style={{fontSize:32, marginBottom:8}}>📭</div>
          No tasks in {SECTION_LABELS[section]}
        </div>
      ) : (
        filtered.map(task => (
          <TaskCard key={task.id} task={task} members={members} adminName={adminName} role={role} onRefresh={onRefresh}/>
        ))
      )}
    </div>
  );
}

// ─── Home (Main) ──────────────────────────────────────────────────────────────
const Home = () => {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [adminName, setAdminName] = useState('Admin');
  const [role, setRole] = useState('user');
  const [activeSection, setActiveSection] = useState('TASK');
  const [loading, setLoading] = useState(true);
  const [deleteCompleteOpen, setDeleteCompleteOpen] = useState(false);

  const sliderRef = useRef(null);
  const startXRef = useRef(null);
  const sectionIndex = SECTIONS.indexOf(activeSection);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/home/get-all-tasks`, {
        credentials:'include',
        headers:{'X-Requested-With':'XMLHttpRequest'}
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setMembers(data.members || []);
        setAdminName(data.adminName || 'Admin');
        setRole(data.role || 'user');
      }
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, []);

  // Socket.io live update
  useEffect(() => {
    if (window.io) {
      const socket = window.io();
      socket.on('update_tasks', fetchTasks);
      return () => socket.disconnect();
    }
  }, [fetchTasks]);

  // Snap slider
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: sectionIndex * sliderRef.current.offsetWidth, behavior:'smooth' });
    }
  }, [activeSection]);

  // Swipe handlers
  const onTouchStart = e => { startXRef.current = e.touches[0].clientX; };
  const onTouchEnd = e => {
    if (startXRef.current === null) return;
    const dx = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) {
      const dir = dx > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(SECTIONS.length-1, sectionIndex + dir));
      setActiveSection(SECTIONS[next]);
    }
    startXRef.current = null;
  };
const taskCounts = {};
  SECTIONS.forEach(s => {
    taskCounts[s] = tasks.filter(t => {
      if (s === 'COMPLETED') return t.status === 'COMPLETED';
      return t.status !== 'COMPLETED' && (t.section || 'TASK') === s;
    }).length;
  });

  const handleDeleteCompleted = async () => {
    await fetch(`${BASE_URL}/api/home/delete-completed-tasks`, { method:'POST', credentials:'include' });
    setDeleteCompleteOpen(false);
    fetchTasks();
  };

  return (
    <div style={styles.container}>
<style>{`
        @keyframes ringPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes menuPop {
          0%   { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 2px; height: 2px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      {/* TAB BAR */}
      <div style={styles.tabBar}>
        {SECTIONS.map(sec => {
          const active = activeSection === sec;
          return (
            <button key={sec} onClick={()=>setActiveSection(sec)} style={{
              ...styles.tabButton,
              color: active ? '#14b8a6' : '#64748b',
              borderBottom: active ? '2.5px solid #14b8a6' : '2.5px solid transparent',
            }}>
              {SECTION_LABELS[sec]}
              {taskCounts[sec] > 0 && (
                <span style={{ ...styles.badge, background: active ? '#14b8a620' : '#2a2a2a', color: active ? '#14b8a6' : '#64748b' }}>
                  {taskCounts[sec]}
                </span>
              )}
            </button>
          );
        })}
      </div>

{/* SECTION DOTS */}
      <div style={{ background:'#1a1a1a', flexShrink:0 }}>
        <div style={{ ...styles.dotRow }}>
          {SECTIONS.map((sec, i) => (
            <div key={sec} onClick={()=>setActiveSection(sec)} style={{
              height: 5, borderRadius: 10,
              width: i === sectionIndex ? 22 : 6,
              background: i === sectionIndex ? '#14b8a6' : '#2a2a2a',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}/>
          ))}
        </div>

        {activeSection === 'COMPLETED' && taskCounts['COMPLETED'] > 0 && (
          <div style={{ display:'flex', justifyContent:'flex-end', padding:'6px 14px 6px' }}>
            <button
              onClick={()=>setDeleteCompleteOpen(true)}
              style={{
                background:'#2a1515', border:'1px solid #7f1d1d', borderRadius:8,
                cursor:'pointer', padding:'7px 16px',
                display:'flex', alignItems:'center', gap:6,
                color:'#ef4444', fontSize:13, fontWeight:700, fontFamily:'Arial, sans-serif',
                minHeight: 36,
              }}
              title="Delete all completed"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* SLIDER */}
      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}/>
          <div style={{marginTop:12, color:'#64748b', fontSize:13}}>Loading tasks…</div>
        </div>
      ) : (
        <div
          ref={sliderRef}
          style={styles.slider}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {SECTIONS.map(sec => (
            <SectionColumn
              key={sec} section={sec} tasks={tasks}
              members={members} adminName={adminName}
              role={role} onRefresh={fetchTasks}
            />
          ))}
        </div>
      )}

      {deleteCompleteOpen && (
        <DeleteConfirmModal
          message="All completed tasks will be permanently removed."
          onConfirm={handleDeleteCompleted}
          onClose={()=>setDeleteCompleteOpen(false)}
        />
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  container: {
    height: '100%', display:'flex', flexDirection:'column',
    background:'#121212', overflow:'hidden', fontFamily:'Arial, sans-serif',
    userSelect:'none',
  },
  tabBar: {
    display:'flex', overflowX:'auto',  background:'#1a1a1a',
  borderBottom:'1px solid #2a2a2a', scrollbarWidth:'none',
    WebkitOverflowScrolling:'touch', flexShrink:0,
  },
  tabButton: {
    background:'none', border:'none', padding:'11px 14px',
    cursor:'pointer', fontWeight:700, fontSize:12,
    whiteSpace:'nowrap', display:'flex', alignItems:'center',
    gap:5, transition:'color 0.2s, border-color 0.2s', flexShrink:0,
    fontFamily:'Arial, sans-serif',
  },
  badge: {
    borderRadius:10, padding:'1px 6px', fontSize:10,
    fontWeight:700, transition:'all 0.2s',
  },
  dotRow: {
    display:'flex', justifyContent:'center', alignItems:'center',
    gap:5, padding:'7px 0', background:'#1a1a1a', flexShrink:0,
  },
  slider: {
    flex:1, display:'flex', overflowX:'hidden', overflowY:'hidden',
    scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch',
  },
  loading: {
    flex:1, display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center',
  },
  spinner: {
    width:28, height:28, border:'3px solid #2a2a2a',
    borderTop:'3px solid #14b8a6', borderRadius:'50%',
    animation:'spin 0.8s linear infinite',
  },
  taskCard: {
    background:'#2a2a2a', borderRadius:10, marginBottom:10,
    padding:'12px 12px 10px', position:'relative', overflow:'visible',
    transition:'opacity 0.4s, transform 0.4s',
  },
  iconBtn: {
    background:'none', border:'none', cursor:'pointer',
    padding:4, display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius:4, transition:'background 0.15s',
  },
contextMenu: {
    background:'#2a2a2a',
    border:'1px solid #334155', borderRadius:10, zIndex:99999,
    boxShadow:'0 8px 24px rgba(0,0,0,0.5)', overflow:'hidden',
    minWidth:150, animation:'menuPop 0.15s ease',
  },
  menuItem: {
    display:'block', width:'100%', padding:'10px 14px', background:'none',
    border:'none', textAlign:'left', color:'#e2e8f0', fontSize:13,
    cursor:'pointer', fontFamily:'Arial, sans-serif',
  },
menuBackdrop: {
    position:'fixed', inset:0, zIndex:9998,
  },
  overlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
    zIndex:9000, display:'flex', alignItems:'flex-end',
    justifyContent:'center', padding:'0 0 0 0',
  },
  modal: {
    background:'#2a2a2a', width:'100%', maxWidth:500,
    borderRadius:'18px 18px 0 0', padding:'20px 18px 32px',
    maxHeight:'85vh', overflowY:'auto', boxSizing:'border-box',
    animation:'slideUp 0.25s ease',
  },
  modalHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    marginBottom:16,
  },
  modalTitle: {
    color:'#e2e8f0', fontWeight:700, fontSize:15,
  },
  closeBtn: {
    background:'#334155', border:'none', color:'#94a3b8',
    width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:12,
  },
  field: { display:'flex', flexDirection:'column', gap:5, marginBottom:12 },
  label: { fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' },
  input: {
    background:'#0f172a', color:'#e2e8f0', border:'1px solid #334155',
    borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none',
    fontFamily:'Arial, sans-serif', width:'100%', boxSizing:'border-box',
  },
  modalActions: { display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 },
  cancelBtn: {
    background:'#334155', color:'#94a3b8', border:'none',
    padding:'9px 18px', borderRadius:8, cursor:'pointer',
    fontSize:13, fontFamily:'Arial, sans-serif',
  },
  saveBtn: {
    background:'#0f8989', color:'#fff', border:'none',
    padding:'9px 20px', borderRadius:8, cursor:'pointer',
    fontSize:13, fontFamily:'Arial, sans-serif', fontWeight:600,
  },
  sectionOption: {
    display:'flex', alignItems:'center', gap:10, width:'100%',
    background:'none', border:'none', borderBottom:'1px solid #0f172a',
    padding:'13px 18px', color:'#e2e8f0', fontSize:13, cursor:'pointer',
    fontFamily:'Arial, sans-serif', textAlign:'left',
  },
  sectionDot: (sec) => ({
    width:8, height:8, borderRadius:'50%', flexShrink:0,
    background: sec === 'TASK' ? '#14b8a6' : sec === 'CHANGES' ? '#f59e0b' : sec === 'UPDATE' ? '#3b82f6' : '#a78bfa',
  }),
};

export default Home;