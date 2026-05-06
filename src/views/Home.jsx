// Home.jsx — Mobile Task Board (Fixed)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

function normDateKey(dateStr) {
  if (!dateStr) return 'nodate';
  return dateStr.split('T')[0];
}

// ─── Global modal open tracker ────────────────────────────────────────────────
// Any modal/menu open → drag is disabled
window.__taskModalOpen = false;

// ─── AnimCheckbox ─────────────────────────────────────────────────────────────
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
  const [showPriDrop, setShowPriDrop] = useState(false);
  const assignTriggerRef = useRef(null);
  const priRef = useRef(null);

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
    background: '#2E2D2D', border: '1px solid #0F8989', borderRadius: 10,
    overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  };
  const dropItemStyle = {
    padding: '10px 14px', fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    color: '#eee', borderBottom: '1px solid #3C3A3A',
  };
  const subItemStyle = {
    ...dropItemStyle, paddingLeft: 28, background: '#3C3A3A', color: '#aaa',
  };

  function DropPortal({ anchorRef, width, children }) {
    const [pos, setPos] = React.useState(null);
    React.useEffect(() => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const menuH = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < menuH + 16;
      setPos({
        position: 'fixed',
   left: Math.min(rect.right - width, window.innerWidth - width - 8),
        width,
        zIndex: 99999,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    }, [anchorRef]);
    if (!pos) return null;
    return createPortal(
      <div style={{ ...dropStyle, ...pos, maxHeight: 220 }} onClick={e => e.stopPropagation()}>
        {children}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
<div style={styles.modal} onClick={() => { setShowAssignDrop(false); setShowPriDrop(false); setOpenTeam(null); }}>
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
          <div style={{...styles.field, flex:'1 1 50%', position:'relative'}} onClick={e => e.stopPropagation()}>
            <label style={styles.label}>Priority</label>
            <div
              ref={priRef}
              onClick={() => { setShowPriDrop(v => !v); setShowAssignDrop(false); }}
     style={{
                ...styles.input,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', userSelect:'none',
                padding:'9px 12px',
                height: 38,
                boxSizing: 'border-box',
              }}
            >
              <span style={{color: PRIORITY_COLORS[priority] || '#eee', fontWeight:600, fontSize:13}}>{priority}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" width="12" height="12"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {showPriDrop && (
              <DropPortal anchorRef={priRef} width={160}>
                {PRIORITY_OPTIONS.map(p => (
                  <div key={p} style={{...dropItemStyle}} onClick={() => { setPriority(p); setShowPriDrop(false); }}>
                    <span style={{width:8, height:8, borderRadius:'50%', background: PRIORITY_COLORS[p], display:'inline-block', flexShrink:0}}/>
                    <span style={{flex:1, color: PRIORITY_COLORS[p], fontWeight:600}}>{p}</span>
                    {priority === p && <span style={{color:'#0F8989'}}>✓</span>}
                  </div>
                ))}
              </DropPortal>
            )}
          </div>
<div style={{...styles.field, flex:'1 1 50%'}}>
            <label style={styles.label}>Due Date</label>
<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={{...styles.input, height:38, padding:'9px 12px'}}/>
          </div>
        </div>

    {/* Assign To — portal dropdown */}
        <div style={{...styles.field, position:'relative'}} onClick={e => e.stopPropagation()}>
          <label style={styles.label}>Assign To</label>
          <div
            ref={assignTriggerRef}
            onClick={() => { setShowAssignDrop(v => !v); setShowPriDrop(false); }}
            style={{...styles.input, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none'}}
          >
            <span style={{color:'#eee'}}>{assignLabel}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" width="12" height="12"><path d="M6 9l6 6 6-6"/></svg>
          </div>

          {showAssignDrop && (
            <DropPortal anchorRef={assignTriggerRef} width={220}>
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
              {teams.length === 0 && members.length > 0 && members.map(m => (
                <div key={m.id} style={dropItemStyle} onClick={() => selectAssign(String(m.id), m.name)}>
                  <span>👤</span><span style={{flex:1}}>{m.name}</span>
                  {assignTo === String(m.id) && <span style={{color:'#0F8989'}}>✓</span>}
                </div>
              ))}
              {teams.length > 0 && teams.map(team => (
                <div key={team.id}>
                  <div style={dropItemStyle} onClick={() => { setOpenTeam(v => v === team.id ? null : team.id); loadTeam(team.id); }}>
                    <span>🏷</span><span style={{flex:1}}>{team.name}</span>
                    <span style={{color: openTeam===team.id ? '#0F8989':'#aaa', fontSize:11, display:'inline-block', transform: openTeam===team.id ? 'rotate(90deg)':'none', transition:'transform 0.2s'}}>›</span>
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
</DropPortal>
          )}
        </div>

        <div style={styles.modalActions}>
          <button onClick={onClose} style={styles.cancelBtn} disabled={saving}>Cancel</button>
          <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── ChangeSectionModal — sticky bottom sheet via portal ──────────────────────
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

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 99000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 500,
        background: '#2E2D2D',
        borderRadius: '22px 22px 0 0',
        borderTop: '2px solid #0F8989',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        animation: 'slideUp 0.25s cubic-bezier(.22,.68,0,1.1)',
        // STICKY — stays fixed at bottom
        position: 'sticky',
        bottom: 0,
      }}>
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, background: 'rgba(15,137,137,0.5)', borderRadius: 4, margin: '12px auto 0' }} />
        <div style={{ padding: '12px 18px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#CDF4F4', fontWeight: 700, fontSize: 15 }}>Move to Section</span>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={{ paddingBottom: 24 }}>
          {available.map(sec => (
            <button key={sec} onClick={() => onMove(sec)} style={styles.sectionOption}>
              <span style={styles.sectionDot(sec)}/>
              {SECTION_LABELS[sec]}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ message, onConfirm, onClose }) {
  return createPortal(
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(0,0,0,0.75)',
      zIndex:99000, display:'flex', alignItems:'flex-end', justifyContent:'center',
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
        animation:'slideUp 0.24s cubic-bezier(.22,.68,0,1.18)',
      }}>
        <div style={{ width:40, height:4, background:'rgba(15,137,137,0.4)', borderRadius:4, margin:'12px auto 0' }} />
        <div style={{ textAlign:'center', padding:'20px 16px 8px' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🗑️</div>
          <div style={{ fontSize:17, fontWeight:800, color:'#CDF4F4', marginBottom:8 }}>Delete Task?</div>
          <div style={{ fontSize:13, color:'#aaa', marginBottom:22, lineHeight:1.6 }}>{message}</div>
          <div style={{ display:'flex', gap:10 }}>
            <button style={{
              flex:1, padding:'12px 20px',
              background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:12, color:'#aaa', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Arial, sans-serif',
            }} onClick={onClose}>Cancel</button>
            <button style={{
              flex:1, padding:'12px 20px',
              background:'#e74c3c', border:'none',
              borderRadius:12, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Arial, sans-serif',
            }} onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── 3-dot Menu Portal ────────────────────────────────────────────────────────
function TaskMenu({ menuPos, onEdit, onChangeDate, onDelete, onClose }) {
  return createPortal(
    <>
      {/* Backdrop — catches taps outside */}
      <div
        style={{ position:'fixed', inset:0, zIndex:99990 }}
        onClick={onClose}
        onTouchStart={e => { e.stopPropagation(); onClose(); }}
      />
      <div style={{
        position: 'fixed',
        top: menuPos.top,
        left: menuPos.left,
        zIndex: 99999,
        background:'#2E2D2D',
        border:'1px solid #0F8989',
        borderRadius: menuPos.openUpward ? '10px 10px 4px 10px' : '4px 10px 10px 10px',
        boxShadow:'0 8px 32px rgba(0,0,0,0.8)',
        overflow:'hidden',
        minWidth:160,
        animation:'menuPop 0.18s cubic-bezier(.34,1.56,.64,1)',
      }}>
        <button style={styles.menuItem} onClick={e=>{e.stopPropagation(); onEdit();}}>
          ✏️ Edit
        </button>
        <button style={styles.menuItem} onClick={e=>{e.stopPropagation(); onChangeDate();}}>
          📅 Change Date
        </button>
        <button style={{...styles.menuItem, color:'#ef4444', borderBottom:'none'}} onClick={e=>{e.stopPropagation(); onDelete();}}>
          🗑️ Delete
        </button>
      </div>
    </>,
    document.body
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({ task, members, adminName, role, onRefresh, onSectionChange }) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, openUpward: false });
  const [editOpen, setEditOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cardVisible, setCardVisible] = useState(true);
  const menuBtnRef = useRef(null);
  const dateInputRef = useRef(null);

  // Track any open modal/menu globally so drag knows to stay off
  useEffect(() => {
    const anyOpen = showMenu || editOpen || sectionOpen || deleteOpen;
    window.__taskModalOpen = anyOpen;
  }, [showMenu, editOpen, sectionOpen, deleteOpen]);

  // Cleanup on unmount
  useEffect(() => () => { window.__taskModalOpen = false; }, []);

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
    if (onSectionChange) onSectionChange(task.id, section);
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
    onRefresh();
  };

  const handleDelete = async () => {
    await fetch(`${BASE_URL}/api/home/delete-task/${task.id}`, {
      method:'POST', credentials:'include'
    });
    setDeleteOpen(false);
    onRefresh();
  };

  // ── 3-dot menu: measure exact button position at click time ──────────────
  const openMenu = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!menuBtnRef.current) return;

    // Force a fresh layout measurement
    const rect = menuBtnRef.current.getBoundingClientRect();
    const menuHeight = 126; // 3 items × 42px approx
    const menuWidth = 165;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight + 16;

    const top = openUpward
      ? rect.top - menuHeight - 6
      : rect.bottom + 6;

    // Align right edge of menu to right edge of button, but clamp to screen
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));

    setMenuPos({ top, left, openUpward });
    setShowMenu(true);
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
        {/* Row 1 */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <AnimCheckbox checked={isCompleted} color={color} onChange={handleCheckbox}/>
          <div style={{ flex:1, minWidth:0, color: isCompleted ? '#888' : '#eee', fontSize:13.5, fontWeight:500, lineHeight:1.3, textAlign:'left', wordBreak:'break-word' }}>
            {task.title}
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6, paddingLeft:26 }}>
          <div style={{ display:'flex', alignItems:'center', minWidth:0 }}>
            {task.assigned_by_name && (
              <span style={{ fontSize:11, color:'#aaa', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {task.assigned_by_name}
              </span>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            {/* Info / description toggle */}
            <button
              onClick={() => hasDesc && setExpanded(v=>!v)}
              style={{ ...styles.iconBtn, opacity: hasDesc ? 1 : 0, cursor: hasDesc ? 'pointer' : 'default' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expanded?'#0F8989':'#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8.5"/><line x1="12" y1="11" x2="12" y2="16"/>
              </svg>
            </button>

            {/* Section badge */}
            {!isCompleted && (
              <span
                onClick={(e) => { e.stopPropagation(); setSectionOpen(true); }}
                style={{ fontSize:9, color:'#0F8989', cursor:'pointer', padding:'2px 6px', borderRadius:3, background:'rgba(15,137,137,0.1)', border:'1px solid rgba(15,137,137,0.4)', whiteSpace:'nowrap', flexShrink:0, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase', lineHeight:1.4, display:'inline-flex', alignItems:'center', gap:3 }}
              >
           ↕ Section
              </span>
            )}

            {/* Due date */}
            {date ? (
              <span
                onClick={() => { if (!isCompleted) dateInputRef.current?.showPicker?.(); }}
                style={{ fontSize:11, fontWeight:600, color: past && !isCompleted ? '#ef4444' : '#0F8989', cursor: isCompleted ? 'default' : 'pointer', padding:'2px 6px', borderRadius:4, background: past && !isCompleted ? '#ef444415' : '#095959', minWidth:56, textAlign:'center', lineHeight:1.4 }}
              >
                📅 {date}
              </span>
            ) : <span style={{ minWidth:56 }}/>}

            {/* 3-dot menu — bigger touch target */}
            {!isCompleted && (
              <button
                ref={menuBtnRef}
                onPointerDown={e => e.stopPropagation()}
                onClick={openMenu}
                style={{
                  ...styles.iconBtn,
                  // Bigger touch target
                  padding: 8, margin: -4,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#aaa">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {expanded && hasDesc && (
          <div style={{ marginTop:10, borderTop:'1px solid #3C3A3A', paddingTop:10, paddingLeft:26, fontSize:12.5, color:'#aaa', lineHeight:1.6, textAlign:'left' }}>
            {task.description}
          </div>
        )}
      </div>

      {/* 3-dot menu via portal — always above everything */}
      {showMenu && (
        <TaskMenu
          menuPos={menuPos}
          onEdit={() => { setEditOpen(true); setShowMenu(false); }}
          onChangeDate={() => { setShowMenu(false); setTimeout(() => dateInputRef.current?.showPicker?.(), 50); }}
          onDelete={() => { setDeleteOpen(true); setShowMenu(false); }}
          onClose={() => setShowMenu(false)}
        />
      )}

      {editOpen && (
        <EditTaskModal
          task={task} members={members} adminName={adminName} role={role}
          onSave={handleSaveEdit} onClose={() => setEditOpen(false)}
        />
      )}

      {sectionOpen && (
        <ChangeSectionModal
          task={task} role={role}
          onMove={handleMove} onClose={() => setSectionOpen(false)}
        />
      )}

      {/* Hidden native date picker */}
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
          onConfirm={handleDelete}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  );
}

// ─── SectionColumn ────────────────────────────────────────────────────────────
function SectionColumn({ section, tasks, members, adminName, role, onRefresh }) {
  const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  const buildSorted = useCallback(() =>
    tasks
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
      }),
  [tasks, section]);

  const [orderedTasks, setOrderedTasks] = useState(buildSorted);

  // Only sync from server if not currently dragging
  const isDraggingRef = useRef(false);
  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedTasks(buildSorted());
    }
  }, [tasks, section]);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const scrollContainerRef = useRef(null);
  const autoScrollRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressIdxRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const dragIndexRef = useRef(null);
  const overIndexRef = useRef(null);
  const activeTouchYRef = useRef(0);

  // Track if user is scrolling (moved significantly before long-press fires)
  const isScrollingRef = useRef(false);

  useEffect(() => () => stopAutoScroll(), []);

  function stopAutoScroll() {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }

  function startAutoScroll(clientY) {
    stopAutoScroll();
    const container = scrollContainerRef.current;
    if (!container) return;
    function step() {
      const rect = container.getBoundingClientRect();
      const ZONE = 80, SPEED = 8;
      if (clientY < rect.top + ZONE) {
        container.scrollTop -= SPEED * (1 - (clientY - rect.top) / ZONE);
      } else if (clientY > rect.bottom - ZONE) {
        container.scrollTop += SPEED * (1 - (rect.bottom - clientY) / ZONE);
      }
      autoScrollRef.current = requestAnimationFrame(step);
    }
    autoScrollRef.current = requestAnimationFrame(step);
  }

  function getIndexAtY(clientY) {
    const container = scrollContainerRef.current;
    if (!container) return null;
    const cards = container.querySelectorAll('[data-taskcard]');
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return cards.length > 0 ? cards.length - 1 : null;
  }

  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const onCardTouchStart = (e, idx) => {
    // If any modal/menu is open, never start drag
    if (window.__taskModalOpen) return;

    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    activeTouchYRef.current = touch.clientY;
    longPressIdxRef.current = idx;
    isScrollingRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      // Double-check modal state when timer fires
      if (window.__taskModalOpen) return;
      // If user has started scrolling, don't start drag
      if (isScrollingRef.current) return;

// Cancel any pending background sync so drag doesn't get interrupted
      if (window.__syncTimer) { clearTimeout(window.__syncTimer); window.__syncTimer = null; }
      try { navigator.vibrate?.(40); } catch {}
      isDraggingRef.current = true;
      dragIndexRef.current = idx;
      overIndexRef.current = idx;
      setDragIndex(idx);
      setOverIndex(idx);
      setIsDragging(true);
      startAutoScroll(activeTouchYRef.current);
    }, 500); // Reduced to 500ms for better feel, but still distinct from scroll
  };

  const onCardTouchMove = (e, idx) => {
    const touch = e.touches[0];
    activeTouchYRef.current = touch.clientY;

    if (!isDraggingRef.current) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      // If moved more than 10px vertically before drag starts → it's a scroll
      if (dy > 10 || dx > 10) {
        isScrollingRef.current = true;
        cancelLongPress();
      }
      return;
    }

    // Drag is active — prevent page scroll
    e.preventDefault();
    startAutoScroll(touch.clientY);

    const newOver = getIndexAtY(touch.clientY);
    if (newOver !== null && newOver !== overIndexRef.current) {
      overIndexRef.current = newOver;
      setOverIndex(newOver);
    }
  };

  const onCardTouchEnd = async () => {
    cancelLongPress();
    stopAutoScroll();

    if (!isDraggingRef.current) {
      isDraggingRef.current = false;
      isScrollingRef.current = false;
      return;
    }

    const fromIdx = dragIndexRef.current;
    const toIdx = overIndexRef.current ?? fromIdx;

isDraggingRef.current = false;
    dragIndexRef.current = null;
    overIndexRef.current = null;
    isScrollingRef.current = false;

    if (fromIdx === null || fromIdx === toIdx) {
      setDragIndex(null);
      setOverIndex(null);
      setIsDragging(false);
      return;
    }

    // Build new list first, then clear drag visuals in same flush
    const newList = [...orderedTasks];
    const [moved] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, moved);
    // Set new order AND clear drag state together so React batches them
    setOrderedTasks(newList);
    setDragIndex(null);
    setOverIndex(null);
    setIsDragging(false);

    // Calculate new date based on neighbors
    const prevTask = toIdx > 0 ? newList[toIdx - 1] : null;
    const nextTask = toIdx < newList.length - 1 ? newList[toIdx + 1] : null;
    const movedDate = moved.due_date;
    let newDate = movedDate;

    const prevDate = prevTask ? normDateKey(prevTask.due_date) : null;
    const nextDate = nextTask ? normDateKey(nextTask.due_date) : null;

    if (prevDate && nextDate && prevDate === nextDate) {
      newDate = prevTask.due_date;
    } else if (!prevTask && nextDate) {
      newDate = nextTask.due_date;
    } else if (!nextTask && prevDate) {
      newDate = prevTask.due_date;
    } else if (prevDate) {
      newDate = prevTask.due_date;
    } else if (nextDate) {
      newDate = nextTask.due_date;
    }

    // Only hit API if date actually changed — silent update, no refresh
    if (normDateKey(newDate) !== normDateKey(movedDate)) {
      fetch(`${BASE_URL}/api/home/update-task-date`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: moved.id, due_date: normDateKey(newDate) === 'nodate' ? null : normDateKey(newDate) })
      }).catch(() => {}); // fire-and-forget
    }
// Silently sync in background — skip if another drag started
    const syncTimer = setTimeout(() => {
      if (!isDraggingRef.current) {
        onRefresh();
      }
    }, 3000);
    // Store timer so a new drag can cancel it
    if (window.__syncTimer) clearTimeout(window.__syncTimer);
    window.__syncTimer = syncTimer;
  };

  const onCardTouchCancel = () => {
    cancelLongPress();
    stopAutoScroll();
    isDraggingRef.current = false;
    dragIndexRef.current = null;
    overIndexRef.current = null;
    isScrollingRef.current = false;
    setDragIndex(null);
    setOverIndex(null);
    setIsDragging(false);
  };

  // Build render list with date group separators
  const renderItems = [];
  let lastDateKey = null;
  orderedTasks.forEach((task, idx) => {
    const dk = normDateKey(task.due_date);
    if (lastDateKey !== null && dk !== lastDateKey) {
      renderItems.push({ type: 'separator', key: `sep-${idx}` });
    }
    lastDateKey = dk;
    renderItems.push({ type: 'task', task, idx, key: `task-${task.id}` });
  });

  return (
    <div
      ref={scrollContainerRef}
      style={{
        flex:'0 0 100%', width:'100%', overflowY:'auto',
        padding:'12px 14px 80px', boxSizing:'border-box',
        // Allow scroll normally; prevent only during drag
        touchAction: isDragging ? 'none' : 'pan-y',
      }}
    >
      {orderedTasks.length === 0 ? (
        <div style={{ color:'#aaa', textAlign:'center', marginTop:60, fontSize:13 }}>
          <div style={{fontSize:32, marginBottom:8}}>📭</div>
          No tasks in {SECTION_LABELS[section]}
        </div>
      ) : (
        renderItems.map(item => {
          if (item.type === 'separator') {
            return (
              <div key={item.key} style={{
                height:1, background:'rgba(150,150,150,0.25)',
                margin:'8px 0', borderRadius:1,
              }} />
            );
          }

          const { task, idx } = item;
          const isBeingDragged = isDragging && dragIndex === idx;
          const isDropTarget = isDragging && overIndex === idx && dragIndex !== idx;

          return (
            <div
              key={item.key}
              data-taskcard
              style={{
                opacity: isBeingDragged ? 0.3 : 1,
                transform: isDropTarget ? 'translateY(2px) scale(1.02)' : 'scale(1)',
                transition: isDragging ? 'transform 0.12s, opacity 0.12s' : 'none',
                position: 'relative',
                // Individual card: allow touch events for long-press, but don't block scroll
                touchAction: isDragging ? 'none' : 'pan-y',
              }}
              onTouchStart={e => onCardTouchStart(e, idx)}
              onTouchMove={e => onCardTouchMove(e, idx)}
              onTouchEnd={onCardTouchEnd}
              onTouchCancel={onCardTouchCancel}
            >
              {/* Drop indicator */}
              {isDropTarget && (
                <div style={{
                  position:'absolute', top:-3, left:0, right:0,
                  height:3, background:'#0F8989', borderRadius:2, zIndex:10,
                }} />
              )}
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
  const tabBarRef = useRef(null);
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

  const fetchTasksRef = useRef(fetchTasks);
  useEffect(() => { fetchTasksRef.current = fetchTasks; }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Socket — connect once
  useEffect(() => {
    socket.on('update_tasks', () => { fetchTasksRef.current(); });
    return () => { socket.off('update_tasks'); };
  }, []);

  useEffect(() => {
    window.addEventListener('task-added', fetchTasks);
    return () => window.removeEventListener('task-added', fetchTasks);
  }, [fetchTasks]);

  // Tab / slider sync
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: sectionIndex * sliderRef.current.offsetWidth, behavior:'smooth' });
    }
    if (tabBarRef.current) {
      const activeTab = tabBarRef.current.children[sectionIndex];
      if (activeTab) activeTab.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
    }
  }, [activeSection, sectionIndex]);

  // Swipe between sections
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
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes menuPop {
          0%   { transform: scale(0.82) translateY(4px); opacity: 0; }
          100% { transform: scale(1)    translateY(0);   opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 2px; height: 2px; }
        ::-webkit-scrollbar-thumb { background: #0F8989; border-radius: 4px; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* TAB BAR */}
      <div ref={tabBarRef} style={styles.tabBar}>
        {SECTIONS.map(sec => {
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

      {/* DOTS */}
      <div style={{ background:'#2E2D2D', flexShrink:0 }}>
        <div style={styles.dotRow}>
          {SECTIONS.map((sec, i) => (
            <div key={sec} onClick={()=>setActiveSection(sec)} style={{
              height:5, borderRadius:10,
              width: i === sectionIndex ? 22 : 6,
              background: i === sectionIndex ? '#0F8989' : '#3C3A3A',
              transition:'all 0.3s ease', cursor:'pointer',
            }}/>
          ))}
        </div>

        {activeSection === 'COMPLETED' && taskCounts['COMPLETED'] > 0 && (
        <div style={{ display:'flex', justifyContent:'flex-end', padding:'2px 14px' }}>
            <button
              onClick={()=>setDeleteCompleteOpen(true)}
              style={{
                background:'#2a1515', border:'1px solid #7f1d1d', borderRadius:8,
                cursor:'pointer', padding:'7px 16px',
                display:'flex', alignItems:'center', gap:6,
                color:'#ef4444', fontSize:13, fontWeight:700, fontFamily:'Arial, sans-serif',
                minHeight:36,
              }}
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

// ─── Styles ──────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    height:'100%', display:'flex', flexDirection:'column',
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
    borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:700, transition:'all 0.2s',
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
  menuItem: {
    display:'block', width:'100%', padding:'12px 16px', background:'none',
    border:'none', textAlign:'left', color:'#eee', fontSize:13,
    cursor:'pointer', fontFamily:'Arial, sans-serif',
    borderBottom:'1px solid #3C3A3A',
    WebkitTapHighlightColor: 'transparent',
  },
  overlay: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
    zIndex:99000, display:'flex', alignItems:'flex-end', justifyContent:'center',
  },
  modal: {
    background:'#2E2D2D', width:'100%', maxWidth:500,
    borderRadius:'18px 18px 0 0', padding:'20px 18px 32px',
    maxHeight:'85vh', overflowY:'auto', boxSizing:'border-box',
    animation:'slideUp 0.25s ease',
    borderTop:'2px solid #0F8989',
  },
  modalHeader: {
    display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16,
  },
  modalTitle: { color:'#CDF4F4', fontWeight:700, fontSize:15 },
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
    padding:'9px 18px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'Arial, sans-serif',
  },
  saveBtn: {
    background:'#0F8989', color:'#fff', border:'none',
    padding:'9px 20px', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'Arial, sans-serif', fontWeight:600,
  },
  sectionOption: {
    display:'flex', alignItems:'center', gap:10, width:'100%',
    background:'none', border:'none', borderBottom:'1px solid #3C3A3A',
    padding:'14px 18px', color:'#eee', fontSize:14, cursor:'pointer',
    fontFamily:'Arial, sans-serif', textAlign:'left',
    WebkitTapHighlightColor:'transparent',
  },
  sectionDot: (sec) => ({
    width:8, height:8, borderRadius:'50%', flexShrink:0,
    background: sec==='TASK'?'#0F8989': sec==='CHANGES'?'#f59e0b': sec==='UPDATE'?'#3b82f6':'#a78bfa',
  }),
};

export default Home;