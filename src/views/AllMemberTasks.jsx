// AllMemberTask.jsx
import React, { useState, useEffect, useRef } from 'react';

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

const PRIORITY_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
};

function getTaskDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tom';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-GB', { month: 'short' });
  return `${day} ${month}`;
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function getSection(task) {
  // Use computed_section from backend if available (respects DB updates)
  if (task.computed_section) return task.computed_section;
  // Fallback
  if (task.status === 'COMPLETED') return 'COMPLETED';
  return task.section || 'TASK';
}

// function getSection(task) {
//   if (task.status === 'COMPLETED') return 'COMPLETED';
//   if (task.assigned_to === 0 && (task.who_assigned === 'user' || task.who_assigned === 'owner')) return 'OTHERS';
//   if (task.assigned_to === 0 && task.who_assigned === 'admin') return task.section || 'TASK';
//   if (task.assigned_to !== task.assigned_by) return 'OTHERS';
//   return task.section || 'TASK';
// }

// ---- Task Card ----
function TaskCard({ task }) {
  const [expanded, setExpanded] = useState(false);
  const priority = (task.priority || 'LOW').toUpperCase();
  const color = PRIORITY_COLORS[priority] || '#3b82f6';
  const date = getTaskDate(task.due_date);
  const past = isPastDate(task.due_date);
  const hasDesc = task.description && task.description.trim() !== '';
  const isCompleted = task.status === 'COMPLETED';
  const assignedName = task.assigned_to_name || task.assigned_by_name || '';

return (
    <div style={{
      background: '#444', borderRadius: 10, marginBottom: 10,
      borderLeft: `4px solid ${color}`, padding: '12px 12px 10px',
      opacity: isCompleted ? 0.55 : 1, transition: 'opacity 0.2s',
    }}>
      {/* Row 1: Checkbox + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${color}`,
          background: isCompleted ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxSizing: 'border-box',
        }}>
          {isCompleted && (
            <svg width="9" height="9" viewBox="0 0 10 10">
              <polyline points="1.5,5 4,7.5 8.5,2" fill="none"
                stroke={color === '#ef4444' ? '#7f1d1d' : color === '#eab308' ? '#713f12' : '#1e3a5f'}
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, color: isCompleted ? '#aaa' : '#eee', fontSize: 13.5, fontWeight: 500, lineHeight: 1.3, textAlign: 'left', wordBreak: 'break-word' }}>
          {task.title}
        </div>
      </div>

      {/* Row 2: Name + Date + Info icon */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, paddingLeft: 26 }}>
        <span style={{ fontSize: 11, color: '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {assignedName}
        </span>

        <button
          onClick={() => hasDesc && setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: hasDesc ? 'pointer' : 'default', padding: '0 0 0 6px', marginRight: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: hasDesc ? 1 : 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expanded ? '#0F8989' : '#aaa'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8.5"/><line x1="12" y1="11" x2="12" y2="16"/>
          </svg>
        </button>

        {date ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: past && !isCompleted ? '#ef4444' : '#0F8989', padding: '1px 6px', borderRadius: 4, background: past && !isCompleted ? '#ef444415' : '#095959', flexShrink: 0, minWidth: 72, textAlign: 'center' }}>
            📅 {date}
          </span>
        ) : <span style={{ minWidth: 72, flexShrink: 0 }} />}
     
      </div>

      {/* Expandable description */}
      {expanded && hasDesc && (
        <div style={{ marginTop: 10, borderTop: '1px solid #3C3A3A', paddingTop: 10, paddingLeft: 26, fontSize: 12.5, color: '#aaa', lineHeight: 1.6, textAlign: 'left' }}>
          {task.description}
        </div>
      )}
    </div>
  );
}

// ---- Section Column ----
function SectionColumn({ section, tasks }) {
  const filtered = tasks.filter(t => getSection(t) === section);
  return (
    <div style={{ flex: '0 0 100%', width: '100%', overflowY: 'auto', padding: '0 12px 80px 12px', boxSizing: 'border-box' }}>
      {filtered.length === 0 ? (
        <div style={{ color: '#aaa', textAlign: 'center', marginTop: 40, fontSize: 13 }}>No tasks</div>
      ) : (
        filtered.map(task => <TaskCard key={task.id} task={task} />)
      )}
    </div>
  );
}

// all member dropdwon design

// ---- Member Dropdown ----
function MemberDropdown({ users, selectedUser, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedName = selectedUser === 'all'
    ? 'All Members'
    : users.find(u => String(u.id) === String(selectedUser))?.name || 'All Members';

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  function pick(val) {
    onSelect(val);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 180, maxWidth: 280 }}>
      {/* Trigger button */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, cursor: 'pointer', userSelect: 'none',
          background: '#3C3A3A',
          border: `1.5px solid ${open ? '#0F8989' : 'rgba(15,137,137,0.4)'}`,
          borderRadius: 8, padding: '8px 12px',
          boxShadow: open ? '0 0 0 3px rgba(15,137,137,0.12)' : 'none',
          transition: 'border-color 0.18s, box-shadow 0.18s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#0F8989" strokeWidth="2" width="15" height="15" style={{ flexShrink: 0 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span style={{ fontSize: 13, color: '#eee', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedName}
          </span>
        </div>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="#0F8989" strokeWidth="2.5"
          width="12" height="12" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Dropdown list */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 4, zIndex: 9999,
          background: '#2E2D2D',
          border: '1px solid rgba(15,137,137,0.35)',
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          maxHeight: 240, overflowY: 'auto',
        }}>
          {/* All Members option */}
          <DropOption
            label="All Members"
            isActive={selectedUser === 'all'}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            }
            onClick={() => pick('all')}
          />

          {/* Divider */}
          {users.length > 0 && (
            <div style={{ height: 1, background: 'rgba(15,137,137,0.2)', margin: '2px 0' }} />
          )}

          {/* Individual members */}
          {users.map((u, i) => (
            <DropOption
              key={u.id}
              label={u.name}
              isActive={String(selectedUser) === String(u.id)}
              icon={
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #095959, #0F8989)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#CDF4F4', flexShrink: 0,
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
              }
              onClick={() => pick(String(u.id))}
              isLast={i === users.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DropOption({ label, isActive, icon, onClick, isLast }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        cursor: 'pointer',
        background: isActive ? 'rgba(15,137,137,0.18)' : hov ? 'rgba(15,137,137,0.08)' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.12s',
      }}
    >
      <span style={{ color: isActive ? '#0F8989' : '#aaa', display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#CDF4F4' : '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {isActive && (
        <svg viewBox="0 0 24 24" fill="none" stroke="#0F8989" strokeWidth="2.5" width="14" height="14" style={{ flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </div>
  );
}
// over

// ---- Main Component ----
const AllMemberTask = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [activeSection, setActiveSection] = useState('TASK');
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);

  const sliderRef = useRef(null);
  const tabBarRef = useRef(null); // ✅ Added ref for header scroll
  const startXRef = useRef(null);
  const startScrollRef = useRef(null);

  const sectionIndex = SECTIONS.indexOf(activeSection);

  // Fetch tasks + users
  const fetchData = async (userId = 'all') => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/all-member-tasks/data?user_id=${userId}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedUser);
  }, []);

  // Socket.io live update
useEffect(() => {
  if (window.io) {
    const socket = window.io();
    socket.on('update_tasks', () => fetchData(selectedUser));
    return () => socket.disconnect();
  }
}, [selectedUser]);

useEffect(() => {
  const handler = () => fetchData(selectedUser);
  window.addEventListener('task-added', handler);
  return () => window.removeEventListener('task-added', handler);
}, [selectedUser]);

  // Snap slider to active section
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

  // Touch swipe
  const onTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (startXRef.current === null) return;
    const dx = startXRef.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 50) {
      const dir = dx > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(SECTIONS.length - 1, sectionIndex + dir));
      setActiveSection(SECTIONS[next]);
    }
    startXRef.current = null;
  };

  // Mouse drag swipe (desktop/tablet)
  const onMouseDown = (e) => {
    setDragging(false);
    startXRef.current = e.clientX;
  };
  const onMouseMove = () => {
    if (startXRef.current !== null) setDragging(true);
  };
  const onMouseUp = (e) => {
    if (startXRef.current === null) return;
    const dx = startXRef.current - e.clientX;
    if (Math.abs(dx) > 50) {
      const dir = dx > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(SECTIONS.length - 1, sectionIndex + dir));
      setActiveSection(SECTIONS[next]);
    }
    startXRef.current = null;
  };

  const handleUserChange = (val) => {
    setSelectedUser(val);
    fetchData(val);
  };

  const taskCounts = {};
  SECTIONS.forEach(s => {
    taskCounts[s] = tasks.filter(t => getSection(t) === s).length;
  });

  return (
    <div style={styles.container}>

{/* FILTER BAR */}
      <div style={styles.filterBar}>
        <MemberDropdown
          users={users}
          selectedUser={selectedUser}
          onSelect={(val) => handleUserChange(val)}
        />
      </div>

      {/* TAB BAR */}
      <div ref={tabBarRef} style={styles.tabBar}>
        {SECTIONS.map((sec, i) => {
          const active = activeSection === sec;
          return (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              style={{
                ...styles.tabButton,
                color: active ? '#0F8989' : '#aaa',
                borderBottom: active ? '2.5px solid #0F8989' : '2.5px solid transparent',
              }}
            >
              {SECTION_LABELS[sec]}
              {taskCounts[sec] > 0 && (
                <span style={{
                  ...styles.badge,
                  background: active ? '#095959' : '#3C3A3A',
                  color: active ? '#CDF4F4' : '#aaa',
                }}>
                  {taskCounts[sec]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION INDICATOR DOTS */}
      <div style={styles.dotRow}>
        {SECTIONS.map((sec, i) => (
          <div key={sec} style={{
            ...styles.dot,
            background: i === sectionIndex ? '#0F8989' : '#3C3A3A',
            width: i === sectionIndex ? 20 : 7,
          }} />
        ))}
      </div>

      {/* SWIPEABLE SLIDER */}
      {loading ? (
        <div style={styles.loading}>Loading tasks…</div>
      ) : (
        <div
          ref={sliderRef}
          style={styles.slider}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {SECTIONS.map(sec => (
            <SectionColumn key={sec} section={sec} tasks={tasks} />
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#3C3A3A',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
  },
  filterBar: {
    padding: '10px 14px',
    background: '#2E2D2D',
    borderBottom: '1px solid #0F8989',
      display: 'flex',   
      justifyContent: 'flex-start', 
  },
  select: {
    background: '#3C3A3A',
    color: '#eee',
    border: '1px solid #0F8989',
    borderRadius: 6,
    padding: '7px 12px',
    fontSize: 13,
    
    maxWidth: 260,
    outline: 'none',
    cursor: 'pointer',
    width: 'auto',        // ✅ change this
    minWidth: 180,        // optional (good UI)
  },
  tabBar: {
    display: 'flex',
    overflowX: 'auto',
    background: '#2E2D2D',
    borderBottom: '1px solid #0F8989',
    scrollbarWidth: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '11px 14px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    transition: 'color 0.2s, border-color 0.2s',
    flexShrink: 0,
    fontFamily: 'Arial, sans-serif',
  },
  badge: {
    borderRadius: 10,
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 700,
    transition: 'background 0.2s, color 0.2s',
  },
  dotRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    padding: '7px 0',
    background: '#2E2D2D',
  },
  dot: {
    height: 5,
    borderRadius: 10,
    transition: 'width 0.3s, background 0.3s',
  },
  slider: {
    flex: 1,
    display: 'flex',
    overflowX: 'hidden',
    overflowY: 'hidden',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
    userSelect: 'none',
    cursor: 'grab',
  },
  loading: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aaa',
    fontSize: 14,
  },
};

export default AllMemberTask;