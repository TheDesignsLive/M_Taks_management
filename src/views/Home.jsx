// Home.jsx — Mobile Task Board
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { io } from 'socket.io-client';

const socket = io(
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live',
  { withCredentials: true }
);

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
  const [saving, setSaving] = useState(false);

  const [assignTo, setAssignTo] = useState('self');
  const [assignLabel, setAssignLabel] = useState('Myself');
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [openTeam, setOpenTeam] = useState(null);
  const [showAssignDrop, setShowAssignDrop] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });
  const assignTriggerRef = useRef(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/tasks/get-teams`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setTeams(d.teams || []); })
      .catch(() => {});
  }, []);

  async function loadTeam(teamId) {
    if (teamMembers[teamId]) return;
    try {
      const r = await fetch(`${BASE_URL}/api/tasks/get-team-members/${teamId}`, { credentials: 'include' });
      const d = await r.json();
      if (d.success) setTeamMembers(prev => ({ ...prev, [teamId]: d.members }));
    } catch {}
  }

  function selectAssign(value, label) {
    setAssignTo(value);
    setAssignLabel(label);
    setShowAssignDrop(false);
    setOpenTeam(null);
  }

  const handleSave = async () => {
    setSaving(true);
    let finalAssignedTo;
    if (assignTo === 'self') {
      finalAssignedTo = role === 'admin' ? 0 : String(task.assigned_by ?? '');
    } else {
      finalAssignedTo = assignTo;
    }
    await onSave({ title, description: desc, priority, due_date: dueDate || null, assigned_to: finalAssignedTo });
    setSaving(false);
  };

  const dropStyle = {
    position: 'fixed', zIndex: 99999,
    background: '#2E2D2D', border: '1px solid #0F8989', borderRadius: 10,
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  };
  const dropItemStyle = {
    padding: '10px 14px', fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    color: '#eee', borderBottom: '1px solid #3C3A3A',
  };
  const subItemStyle = {
    ...dropItemStyle, paddingLeft: 28, background: '#3C3A3A', color: '#aaa',
  };

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal} onClick={() => { setShowAssignDrop(false); setOpenTeam(null); }}>
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

        {/* Assign To — custom dropdown */}
        <div style={{...styles.field, position:'relative'}} onClick={e => e.stopPropagation()}>
          <label style={styles.label}>Assign To</label>
          <div
            ref={assignTriggerRef}
            onClick={() => {
              if (!showAssignDrop && assignTriggerRef.current) {
                const rect = assignTriggerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const maxH = Math.min(240, spaceBelow > 160 ? spaceBelow - 12 : rect.top - 12);
                setDropPos({
                  top: spaceBelow > 160 ? rect.bottom + 4 : rect.top - maxH - 4,
                  left: rect.left,
                  width: rect.width,
                  maxHeight: maxH,
                });
              }
              setShowAssignDrop(v => !v);
            }}
            style={{...styles.input, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none'}}
          >
            <span style={{color:'#eee'}}>{assignLabel}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" width="12" height="12"><path d="M6 9l6 6 6-6"/></svg>
          </div>

          {showAssignDrop && (
            <div style={{...dropStyle, top: dropPos.top, left: dropPos.left, width: dropPos.width, maxHeight: dropPos.maxHeight}}>
              <div style={dropItemStyle} onClick={() => selectAssign('self', 'Myself')}>
                <span>👤</span><span style={{flex:1}}>Myself</span>
                {assignTo === 'self' && <span style={{color:'#0F8989'}}>✓</span>}
              </div>

              {role !== 'admin' && (
                <div style={dropItemStyle} onClick={() => selectAssign('0', `${adminName} (Admin)`)}>
                  <span>🔑</span><span style={{flex:1}}>{adminName} (Admin)</span>
                  {assignTo === '0' && <span style={{color:'#0F8989'}}>✓</span>}
                </div>
              )}

              {teams.length === 0 && members.length > 0 && (
                <>
                  <div style={{...dropItemStyle, color:'#aaa', fontSize:11, cursor:'default', paddingTop:6, paddingBottom:4, borderBottom:'1px solid #0F8989'}}>
                    MEMBERS
                  </div>
                  {members.map(m => (
                    <div key={m.id} style={dropItemStyle} onClick={() => selectAssign(String(m.id), m.name)}>
                      <span>👤</span><span style={{flex:1}}>{m.name}</span>
                      {assignTo === String(m.id) && <span style={{color:'#0F8989'}}>✓</span>}
                    </div>
                  ))}
                </>
              )}

              {teams.length > 0 && (
                <>
                  <div style={{...dropItemStyle, color:'#aaa', fontSize:11, cursor:'default', paddingTop:6, paddingBottom:4, borderBottom:'1px solid #0F8989'}}>
                    TEAMS
                  </div>
                  {teams.map(team => (
                    <div key={team.id}>
                      <div style={dropItemStyle} onClick={() => { setOpenTeam(v => v === team.id ? null : team.id); loadTeam(team.id); }}>
                        <span>🏷</span><span style={{flex:1}}>{team.name}</span>
                        <span style={{color: openTeam===team.id ? '#0F8989':'#aaa', fontSize:11, display:'inline-block', transform: openTeam===team.id ? 'rotate(90deg)':'rotate(0deg)', transition:'transform 0.2s'}}>›</span>
                      </div>
                      {openTeam === team.id && (
                        <>
                          <div style={subItemStyle} onClick={() => selectAssign(`team_${team.id}`, `All ${team.name}`)}>
                            <span style={{color:'#0F8989'}}>↳</span><span style={{flex:1}}>All {team.name}</span>
                            {assignTo===`team_${team.id}` && <span style={{color:'#0F8989'}}>✓</span>}
                          </div>
                          {(teamMembers[team.id] || []).map(m => (
                            <div key={m.id} style={{...subItemStyle, paddingLeft:36}} onClick={() => selectAssign(String(m.id), m.name)}>
                              <span style={{flex:1}}>{m.name}</span>
                              {assignTo === String(m.id) && <span style={{color:'#0F8989'}}>✓</span>}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
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
  const isSelfTask = task.is_self_task === true;

  const available = SECTIONS.filter(s => {
    if (s === 'COMPLETED') return false;
    if (s === currentSection) return false;
    if (isSelfTask && s === 'OTHERS') return false;
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
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(0,0,0,0.75)',
      zIndex:9000, display:'flex', alignItems:'flex-end', justifyContent:'center',
      animation:'atbFade 0.15s ease',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width:'100%', maxWidth:400,
        background:'#2E2D2D',
        borderRadius:'22px 22px 0 0',
        padding:'0 18px 28px',
        boxSizing:'border-box',
        border:'1px solid rgba(15,137,137,0.2)',
        borderBottom:'none',
        boxShadow:'0 -8px 48px rgba(0,0,0,0.5)',
        animation:'atbSlide 0.24s cubic-bezier(.22,.68,0,1.18)',
      }}>
        <div style={{ width:40, height:4, background:'rgba(15,137,137,0.4)', borderRadius:4, margin:'12px auto 0' }} />
        <div style={{ textAlign:'center', padding:'20px 16px 8px' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🗑️</div>
          <div style={{ fontSize:17, fontWeight:800, color:'#CDF4F4', marginBottom:8 }}>Delete Task?</div>
          <div style={{ fontSize:13, color:'#aaa', marginBottom:22, lineHeight:1.6 }}>{message}</div>
          <div style={{ display:'flex', gap:10 }}>
            <button
              style={{
                flex:1, padding:'12px 20px',
                background:'rgba(255,255,255,0.07)',
                border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:12, color:'#aaa',
                fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:'Arial, sans-serif', letterSpacing:0.3,
              }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              style={{
                flex:1, padding:'12px 20px',
                background:'#e74c3c', border:'none',
                borderRadius:12, color:'#fff',
                fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:'Arial, sans-serif', letterSpacing:0.3,
              }}
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
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
          <div style={{ flex:1, minWidth:0, color: isCompleted ? '#888' : '#eee', fontSize:13.5, fontWeight:500, lineHeight:1.3, textAlign:'left', wordBreak:'break-word' }}>
            {task.title}
          </div>
        </div>

        {/* Row 2: Name+Move (left) | Info+Date+3dot (right) */}
   {/* Row 2: Name (left) | Info+Section+Date+3dot (right) */}
<div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6, paddingLeft:26 }}>

  {/* Left side — name only */}
  <div style={{ display:'flex', alignItems:'center', minWidth:0 }}>
    {task.assigned_by_name && (
      <span style={{ fontSize:11, color:'#aaa', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {task.assigned_by_name}
      </span>
    )}
  </div>

  {/* Right side — info | section | date | 3dot */}
  <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>

    {/* Info icon */}
    <button
      onClick={() => hasDesc && setExpanded(v=>!v)}
      style={{ ...styles.iconBtn, opacity: hasDesc ? 1 : 0, cursor: hasDesc ? 'pointer' : 'default' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expanded?'#0F8989':'#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8.5"/><line x1="12" y1="11" x2="12" y2="16"/>
      </svg>
    </button>

    {/* Section badge — moved to right, before date */}
    {!isCompleted && (
      <span
        onClick={() => setSectionOpen(true)}
        style={{ fontSize:9, color:'#0F8989', cursor:'pointer', padding:'2px 6px', borderRadius:3, background:'rgba(15,137,137,0.1)', border:'1px solid rgba(15,137,137,0.4)', whiteSpace:'nowrap', flexShrink:0, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', lineHeight:1.4, display:'inline-flex', alignItems:'center', gap:3 }}
      >
        ↕ {SECTION_LABELS[task.section] || 'Task'}
      </span>
    )}

    {/* Date */}
    {date ? (
      <span
        onClick={() => { if (!isCompleted && dateInputRef.current) dateInputRef.current.showPicker?.(); }}
        style={{ fontSize:11, fontWeight:600, color: past && !isCompleted ? '#ef4444' : '#0F8989', cursor: isCompleted ? 'default' : 'pointer', padding:'2px 6px', borderRadius:4, background: past && !isCompleted ? '#ef444415' : '#095959', minWidth:56, textAlign:'center', lineHeight:1.4 }}
      >
        📅 {date}
      </span>
    ) : <span style={{ minWidth:56 }}/>}

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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#aaa">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
    )}
  </div>
</div>

        {/* Description */}
        {expanded && hasDesc && (
          <div style={{ marginTop:10, borderTop:'1px solid #3C3A3A', paddingTop:10, paddingLeft:26, fontSize:12.5, color:'#aaa', lineHeight:1.6, textAlign:'left' }}>
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

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_KEY = 'tms_drag_order';
function lsGetAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function lsSaveSection(section, ids) {
  try {
    const all = lsGetAll();
    all[section] = ids;
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {}
}
function lsGetSection(section) {
  return lsGetAll()[section] || null;
}
function applyOrder(tasks, savedIds) {
  const map = {};
  savedIds.forEach((id, i) => { map[String(id)] = i; });
  return [...tasks].sort((a, b) => {
    const ia = map[String(a.id)] ?? 99999;
    const ib = map[String(b.id)] ?? 99999;
    return ia - ib;
  });
}

// ─── SectionColumn — drag-and-drop added, everything else identical ───────────
function SectionColumn({ section, tasks, members, adminName, role, onRefresh }) {
  const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  const defaultSort = (arr) => [...arr].sort((a, b) => {
    const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
    const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
    if (dateA - dateB !== 0) return dateA - dateB;
    const pa = PRIORITY_ORDER[(a.priority || 'LOW').toUpperCase()] ?? 2;
    const pb = PRIORITY_ORDER[(b.priority || 'LOW').toUpperCase()] ?? 2;
    return pa - pb;
  });

  const rawFiltered = tasks.filter(t => {
    if (section === 'COMPLETED') return t.status === 'COMPLETED';
    return t.status !== 'COMPLETED' && (t.section || 'TASK') === section;
  });

  const [ordered, setOrdered] = useState(() => {
    const sorted = defaultSort(rawFiltered);
    if (section === 'COMPLETED') return sorted;
    const saved = lsGetSection(section);
    return saved ? applyOrder(sorted, saved) : sorted;
  });

  // Re-sync on server refresh — merge keeping drag order, new tasks at end
  useEffect(() => {
    const sorted = defaultSort(rawFiltered);
    if (section === 'COMPLETED') { setOrdered(sorted); return; }
    const saved = lsGetSection(section);
    setOrdered(saved ? applyOrder(sorted, saved) : sorted);
  }, [tasks, section]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── drag refs (avoid re-renders mid-drag) ──────────────────────────────────
  const dragIdxRef = useRef(null);
  const overIdxRef = useRef(null);
  const [dragIdx, setDragIdx]   = useState(null);
  const [overIdx, setOverIdx]   = useState(null);
  const colRef = useRef(null);

  const commitReorder = useCallback((from, to) => {
    if (from === null || to === null || from === to) return;
    setOrdered(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      lsSaveSection(section, next.map(t => t.id));
      return next;
    });
  }, [section]);

  // ── Mouse / HTML5 drag ─────────────────────────────────────────────────────
  const onDragStart = (e, idx) => {
    dragIdxRef.current = idx;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const onDragEnter = (e, idx) => {
    e.preventDefault();
    overIdxRef.current = idx;
    setOverIdx(idx);
  };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDrop = (e, idx) => { e.preventDefault(); commitReorder(dragIdxRef.current, idx); };
  const onDragEnd = () => {
    setDragIdx(null); setOverIdx(null);
    dragIdxRef.current = null; overIdxRef.current = null;
  };

  // ── Touch drag (long-press 300 ms activates, then drag freely) ────────────
  const ts = useRef({ active:false, startIdx:null, timer:null, startY:0, startX:0 });

  const onTouchStart = (e, idx) => {
    ts.current.startY  = e.touches[0].clientY;
    ts.current.startX  = e.touches[0].clientX;
    ts.current.startIdx = idx;
    ts.current.active  = false;
    clearTimeout(ts.current.timer);
    ts.current.timer = setTimeout(() => {
      ts.current.active = true;
      dragIdxRef.current = idx;
      overIdxRef.current = idx;
      setDragIdx(idx);
      setOverIdx(idx);
    }, 300);
  };

  const onTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    if (!ts.current.active) {
      // Cancel long-press if finger moved too much before activation
      if (Math.abs(touch.clientX - ts.current.startX) > 8 ||
          Math.abs(touch.clientY - ts.current.startY) > 8) {
        clearTimeout(ts.current.timer);
      }
      return;
    }
    e.preventDefault(); // block page scroll while dragging

    const col = colRef.current;
    if (!col) return;

    // Auto-scroll near edges
    const colRect = col.getBoundingClientRect();
    if (touch.clientY < colRect.top + 60)   col.scrollTop -= 8;
    if (touch.clientY > colRect.bottom - 60) col.scrollTop += 8;

    // Find which card the finger is over
    const cards = col.querySelectorAll('[data-dc]');
    let target = ordered.length - 1;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      if (touch.clientY < r.top + r.height / 2 && i < target) target = i;
    });

    if (overIdxRef.current !== target) {
      overIdxRef.current = target;
      setOverIdx(target);
    }
  }, [ordered]);

  const onTouchEnd = useCallback(() => {
    clearTimeout(ts.current.timer);
    if (ts.current.active) {
      commitReorder(dragIdxRef.current, overIdxRef.current);
      ts.current.active = false;
    }
    setDragIdx(null); setOverIdx(null);
    dragIdxRef.current = null; overIdxRef.current = null;
  }, [commitReorder]);

  // Attach touch listeners as non-passive (needed for preventDefault)
  useEffect(() => {
    const col = colRef.current;
    if (!col) return;
    col.addEventListener('touchmove', onTouchMove, { passive: false });
    col.addEventListener('touchend',  onTouchEnd);
    return () => {
      col.removeEventListener('touchmove', onTouchMove);
      col.removeEventListener('touchend',  onTouchEnd);
    };
  }, [onTouchMove, onTouchEnd]);

  const isDraggable = section !== 'COMPLETED';

  return (
    <div
      ref={colRef}
      style={{ flex:'0 0 100%', width:'100%', overflowY:'auto', padding:'12px 14px 80px', boxSizing:'border-box' }}
    >
      {/* Minimal CSS for drop indicator lines only */}
      <style>{`
        .tms-drag-over-above { border-top:    2px solid #0F8989 !important; }
        .tms-drag-over-below { border-bottom: 2px solid #0F8989 !important; }
      `}</style>

      {ordered.length === 0 ? (
        <div style={{ color:'#aaa', textAlign:'center', marginTop:60, fontSize:13 }}>
          <div style={{fontSize:32, marginBottom:8}}>📭</div>
          No tasks in {SECTION_LABELS[section]}
        </div>
      ) : (
        ordered.map((task, idx) => {
          const isDragging = isDraggable && dragIdx === idx;
          const isAbove    = isDraggable && overIdx === idx && dragIdx !== null && dragIdx > idx;
          const isBelow    = isDraggable && overIdx === idx && dragIdx !== null && dragIdx < idx;

          return (
            <div
              key={task.id}
              data-dc                          // marker for touch hit-test
              draggable={isDraggable}
              onDragStart={isDraggable ? e => onDragStart(e, idx) : undefined}
              onDragEnter={isDraggable ? e => onDragEnter(e, idx) : undefined}
              onDragOver={isDraggable  ? onDragOver                : undefined}
              onDrop={isDraggable      ? e => onDrop(e, idx)       : undefined}
              onDragEnd={isDraggable   ? onDragEnd                 : undefined}
              onTouchStart={isDraggable ? e => onTouchStart(e, idx) : undefined}
              className={[
                isAbove ? 'tms-drag-over-above' : '',
                isBelow ? 'tms-drag-over-below' : '',
              ].join(' ').trim()}
              style={{
                opacity:      isDragging ? 0.35 : 1,
                transition:   'opacity 0.15s',
                borderTop:    '2px solid transparent',
                borderBottom: '2px solid transparent',
              }}
            >
              <TaskCard
                task={task}
                members={members}
                adminName={adminName}
                role={role}
                onRefresh={onRefresh}
              />
            </div>
          );
        })
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
  const tabBarRef = useRef(null); // ✅ Added ref for header scroll
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

useEffect(() => {
    fetchTasks();

    socket.on('update_tasks', () => {
      fetchTasks();
    });

    return () => {
      socket.off('update_tasks');
    };
  }, []);

 // ✅ ADD THESE TWO — put them right after your fetchTasks useCallback

// Ref always holds the latest fetchTasks — prevents stale closure
const fetchTasksRef = useRef(fetchTasks);
useEffect(() => {
  fetchTasksRef.current = fetchTasks;
}, [fetchTasks]);

// Socket — connects once, never disconnects/reconnects on re-render
useEffect(() => {
  if (typeof window.io === 'undefined') {
    console.warn('Socket.IO not loaded — check index.html');
    return;
  }
  const socket = window.io(BASE_URL, { withCredentials: true });

  socket.on('update_tasks', () => {
    fetchTasksRef.current(); // always calls latest version
  });

  return () => socket.disconnect();
}, []); // ← empty array: runs ONCE only

      useEffect(() => {
        window.addEventListener('task-added', fetchTasks);
        return () => window.removeEventListener('task-added', fetchTasks);
      }, [fetchTasks]);

 useEffect(() => {
  if (sliderRef.current) {
   sliderRef.current.scrollTo({ left: sectionIndex * sliderRef.current.offsetWidth, behavior:'smooth' });
  }
  // ✅ Added Auto-scroll for Header (Tab Bar)
  if (tabBarRef.current) {
   const activeTab = tabBarRef.current.children[sectionIndex];
   if (activeTab) {
    activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
   }
  }
 }, [activeSection, sectionIndex]);

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
        ::-webkit-scrollbar-thumb { background: #0F8989; border-radius: 4px; }
      `}</style>

      {/* TAB BAR */}
<div ref={tabBarRef} style={styles.tabBar}>        {SECTIONS.map(sec => {
          const active = activeSection === sec;
          return (
            <button key={sec} onClick={()=>setActiveSection(sec)} style={{
              ...styles.tabButton,
              color: active ? '#0F8989' : '#aaa',
              borderBottom: active ? '2.5px solid #0F8989' : '2.5px solid transparent',
            }}>
              {SECTION_LABELS[sec]}
              {taskCounts[sec] > 0 && (
                <span style={{ ...styles.badge, background: active ? '#095959' : '#3C3A3A', color: active ? '#CDF4F4' : '#aaa' }}>
                  {taskCounts[sec]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION DOTS */}
      <div style={{ background:'#2E2D2D', flexShrink:0 }}>
        <div style={{ ...styles.dotRow }}>
          {SECTIONS.map((sec, i) => (
            <div key={sec} onClick={()=>setActiveSection(sec)} style={{
              height: 5, borderRadius: 10,
              width: i === sectionIndex ? 22 : 6,
              background: i === sectionIndex ? '#0F8989' : '#3C3A3A',
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
          <div style={{marginTop:12, color:'#aaa', fontSize:13}}>Loading tasks…</div>
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
    background:'#3C3A3A', overflow:'hidden', fontFamily:'Arial, sans-serif',
    userSelect:'none',
  },
  tabBar: {
    display:'flex', overflowX:'auto', background:'#2E2D2D',
    borderBottom:'1px solid #0F8989', scrollbarWidth:'none',
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
    gap:5, padding:'7px 0', background:'#2E2D2D', flexShrink:0,
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
    width:28, height:28, border:'3px solid #3C3A3A',
    borderTop:'3px solid #0F8989', borderRadius:'50%',
    animation:'spin 0.8s linear infinite',
  },
  taskCard: {
    background:'#444', borderRadius:10, marginBottom:10,
    padding:'12px 12px 10px', position:'relative', overflow:'visible',
    transition:'opacity 0.4s, transform 0.4s',
  },
  iconBtn: {
    background:'none', border:'none', cursor:'pointer',
    padding:4, display:'flex', alignItems:'center', justifyContent:'center',
    borderRadius:4, transition:'background 0.15s',
  },
  contextMenu: {
    background:'#2E2D2D',
    border:'1px solid #0F8989', borderRadius:10, zIndex:99999,
    boxShadow:'0 8px 24px rgba(0,0,0,0.5)', overflow:'hidden',
    minWidth:150, animation:'menuPop 0.15s ease',
  },
  menuItem: {
    display:'block', width:'100%', padding:'10px 14px', background:'none',
    border:'none', textAlign:'left', color:'#eee', fontSize:13,
    cursor:'pointer', fontFamily:'Arial, sans-serif',
    borderBottom:'1px solid #3C3A3A',
  },
  menuBackdrop: {
    position:'fixed', inset:0, zIndex:9998,
  },
  overlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
    zIndex:9000, display:'flex', alignItems:'flex-end',
    justifyContent:'center', padding:'0 0 0 0',
  },
  modal: {
    background:'#2E2D2D', width:'100%', maxWidth:500,
    borderRadius:'18px 18px 0 0', padding:'20px 18px 32px',
    maxHeight:'85vh', overflowY:'auto', boxSizing:'border-box',
    animation:'slideUp 0.25s ease',
    borderTop: '2px solid #0F8989',
  },
  modalHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    marginBottom:16,
  },
  modalTitle: {
    color:'#CDF4F4', fontWeight:700, fontSize:15,
  },
  closeBtn: {
    background:'#3C3A3A', border:'1px solid #0F8989', color:'#aaa',
    width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:12,
  },
  field: { display:'flex', flexDirection:'column', gap:5, marginBottom:12 },
  label: { fontSize:11, color:'#0F8989', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' },
  input: {
    background:'#3C3A3A', color:'#eee', border:'1px solid #0F8989',
    borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none',
    fontFamily:'Arial, sans-serif', width:'100%', boxSizing:'border-box',
  },
  modalActions: { display:'flex', gap:10, justifyContent:'flex-end', marginTop:16 },
  cancelBtn: {
    background:'#3C3A3A', color:'#aaa', border:'1px solid #555',
    padding:'9px 18px', borderRadius:8, cursor:'pointer',
    fontSize:13, fontFamily:'Arial, sans-serif',
  },
  saveBtn: {
    background:'#0F8989', color:'#fff', border:'none',
    padding:'9px 20px', borderRadius:8, cursor:'pointer',
    fontSize:13, fontFamily:'Arial, sans-serif', fontWeight:600,
  },
  sectionOption: {
    display:'flex', alignItems:'center', gap:10, width:'100%',
    background:'none', border:'none', borderBottom:'1px solid #3C3A3A',
    padding:'13px 18px', color:'#eee', fontSize:13, cursor:'pointer',
    fontFamily:'Arial, sans-serif', textAlign:'left',
  },
  sectionDot: (sec) => ({
    width:8, height:8, borderRadius:'50%', flexShrink:0,
    background: sec === 'TASK' ? '#0F8989' : sec === 'CHANGES' ? '#f59e0b' : sec === 'UPDATE' ? '#3b82f6' : '#a78bfa',
  }),
};

export default Home;