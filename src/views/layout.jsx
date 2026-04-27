import React, { useState, useEffect, useRef } from 'react';

// ─── BASE URL ───────────────────────────────────────────────────────────────
const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live';

// ─── DUMMY COMPONENTS ────────────────────────────────────────────────────────
const Home = () => <div style={s.page}><h1>🏠 Home Dashboard</h1><p>Welcome back!</p></div>;
const Notifications = () => <div style={s.page}><h1>🔔 Notifications</h1><p>No new updates.</p></div>;
const AssignedByMe = () => <div style={s.page}><h1>📝 Assigned By Me</h1><p>List of tasks...</p></div>;
const ViewMembers = () => <div style={s.page}><h1>👥 Members</h1><p>Manage your team.</p></div>;
const Settings = () => <div style={s.page}><h1>⚙️ Settings</h1><p>Account preferences.</p></div>;
const Profile = () => <div style={s.page}><h1>👤 Profile</h1><p>Your details.</p></div>;

// ─── PRIORITY CONFIG ─────────────────────────────────────────────────────────
const PRIORITIES = [
  { value: 'High',   color: '#e53935' },
  { value: 'Medium', color: '#f59e0b' },
  { value: 'Low',    color: '#1a73e8' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(iso) {
  if (!iso) return 'Today';
  const d = new Date(iso + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tom = new Date(today); tom.setDate(today.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tom.getTime()) return 'Tom';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function buildCalMatrix(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null);
  for (let i = 1; i <= totalDays; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── MINI CALENDAR ───────────────────────────────────────────────────────────
function MiniCalendar({ value, onChange, onClose }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const init = value ? new Date(value + 'T00:00:00') : today;
  const [vYear, setVYear] = useState(init.getFullYear());
  const [vMonth, setVMonth] = useState(init.getMonth());

  const WDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const cells = buildCalMatrix(vYear, vMonth);

  function prev() {
    if (vMonth === 0) { setVYear(y => y - 1); setVMonth(11); }
    else setVMonth(m => m - 1);
  }
  function next() {
    if (vMonth === 11) { setVYear(y => y + 1); setVMonth(0); }
    else setVMonth(m => m + 1);
  }
  function pick(day) {
    if (!day) return;
    const d = new Date(vYear, vMonth, day); d.setHours(0, 0, 0, 0);
    if (d < today) return;
    const iso = `${vYear}-${String(vMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    onClose();
  }
return (
    <div className="atb-cal-popup" onClick={e => e.stopPropagation()}>
      <div className="atb-cal-hdr">
        <button className="atb-cal-nav atb-cal-nav-lg" onClick={prev}>‹</button>
        <div className="atb-cal-month-wrap">
          <span className="atb-cal-month">{MONTHS[vMonth]}</span>
          <span className="atb-cal-year">{vYear}</span>
        </div>
        <button className="atb-cal-nav atb-cal-nav-lg" onClick={next}>›</button>
      </div>
      <div className="atb-cal-grid">
        {WDAYS.map(d => <div key={d} className="atb-cal-wday">{d}</div>)}
        {cells.map((day, i) => {
          const cd = day ? new Date(vYear, vMonth, day) : null;
          if (cd) cd.setHours(0, 0, 0, 0);
          const isPast = cd && cd < today;
          const isSel = day && value === `${vYear}-${String(vMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday = cd && cd.getTime() === today.getTime();
          return (
            <div
              key={i}
              className={[
                'atb-cal-day',
                !day ? 'atb-cal-empty' : '',
                isPast ? 'atb-cal-past' : '',
                isSel  ? 'atb-cal-sel'  : '',
                isToday && !isSel ? 'atb-cal-today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => pick(day)}
            >
              {day || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FIXED PORTAL (escapes overflow clipping, renders above pill) ─────────────
function FixedPortal({ rect, width, children, forceUp }) {
  if (!rect) return null;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const isMobile = window.innerWidth < 600;
  const openUpward = forceUp || isMobile || (spaceBelow < 300 && spaceAbove > spaceBelow);
  const style = {
    position: 'fixed',
    left: Math.min(rect.left, window.innerWidth - width - 8),
    width,
    zIndex: 99999,
    ...(openUpward
      ? { bottom: window.innerHeight - rect.top + 8 }
      : { top: rect.bottom + 6 }),
  };
  return (
    <div style={style} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  );
}

// Dummy wrapper — just passes ref through
function PillAnchor({ children }) { return children; }

// ─── MAIN LAYOUT COMPONENT ───────────────────────────────────────────────────
const Layout = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [notifCount, setNotifCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Add Task State ──
  const [taskOpen, setTaskOpen]       = useState(false);
  const [title, setTitle]             = useState('');
  const [desc, setDesc]               = useState('');
  const [date, setDate]               = useState(todayISO());
  const [priority, setPriority]       = useState('Medium');
  const [assignTo, setAssignTo]       = useState('self');
  const [assignLabel, setAssignLabel] = useState('Myself');
  const [showCal, setShowCal]         = useState(false);
  const [showPri, setShowPri]         = useState(false);
  const [showAssign, setShowAssign]   = useState(false);
  const [openTeam, setOpenTeam]       = useState(null);
  const [showOthers, setShowOthers]   = useState(false);
  const [teams, setTeams]             = useState([]);
  const [teamMembers, setTeamMembers] = useState({});
  const [others, setOthers]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState('');
  const [titleError, setTitleError]   = useState(false);

const titleRef = useRef(null);
  const modalRef = useRef(null);
  const pillCalRef    = useRef(null);
  const pillPriRef    = useRef(null);
  const pillAssignRef = useRef(null);
  const [calRect,    setCalRect]    = useState(null);
  const [priRect,    setPriRect]    = useState(null);
  const [assignRect, setAssignRect] = useState(null);

  // Load teams once when task modal opens
  useEffect(() => {
    if (!taskOpen) return;
    fetch(`${BASE_URL}/api/tasks/get-teams`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setTeams(d.teams || []); })
      .catch(() => {});
  }, [taskOpen]);

  // Focus title when modal opens
  useEffect(() => {
    if (taskOpen) setTimeout(() => titleRef.current?.focus(), 120);
  }, [taskOpen]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowCal(false); setShowPri(false); setShowAssign(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function closeAllDropdowns() {
    setShowCal(false); setShowPri(false); setShowAssign(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  async function loadTeam(teamId) {
    if (teamMembers[teamId]) return;
    try {
      const r = await fetch(`${BASE_URL}/api/tasks/get-team-members/${teamId}`, { credentials: 'include' });
      const d = await r.json();
      if (d.success) setTeamMembers(prev => ({ ...prev, [teamId]: d.members }));
    } catch {}
  }

  async function loadOthers() {
    if (others.length) return;
    try {
      const r = await fetch(`${BASE_URL}/api/tasks/get-other-employees`, { credentials: 'include' });
      const d = await r.json();
      if (d.success) setOthers(d.members || []);
    } catch {}
  }

  function selectAssign(value, label) {
    setAssignTo(value); setAssignLabel(label);
    setShowAssign(false); setOpenTeam(null); setShowOthers(false);
  }

  function resetForm() {
    setTitle(''); setDesc(''); setDate(todayISO());
    setPriority('Medium'); setAssignTo('self'); setAssignLabel('Myself');
    setTitleError(false); setShowCal(false); setShowPri(false); setShowAssign(false);
    setOpenTeam(null); setShowOthers(false);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setTitleError(true);
      setTimeout(() => setTitleError(false), 600);
      titleRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/tasks/add-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: desc.trim() || null,
          date,
          priority,
          assignedTo: assignTo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Task added successfully!');
        resetForm();
        setTaskOpen(false);
      } else {
        showToast(data.message || 'Failed to add task.');
      }
    } catch {
      showToast('Network error. Please try again.');
    }
    setLoading(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  // Drawer helpers
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const renderContent = () => {
    switch (activePage) {
      case 'home':          return <Home />;
      case 'notifications': return <Notifications />;
      case 'assigned':      return <AssignedByMe />;
      case 'members':       return <ViewMembers />;
      case 'settings':      return <Settings />;
      case 'profile':       return <Profile />;
      default:              return <Home />;
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.status === 'success') {
        window.location.href = '/';
      } else {
        alert('Logout failed. Please try again.');
      }
    } catch (err) {
      console.error('Logout Error:', err);
      window.location.href = '/';
    }
  };

  const priColor = PRIORITIES.find(p => p.value === priority)?.color || '#f59e0b';

  return (
    <div style={s.layoutContainer}>
      <style>{customCSS}</style>

      {/* ─── TOP BAR ─── */}
      <header style={s.topBar}>
        <div style={s.menuIcon} onClick={toggleDrawer}>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
        <div style={s.brandName}>TMS Workspace</div>
        <div style={{width: '30px'}}></div>
      </header>

      {/* ─── DRAWER SIDEBAR ─── */}
      <div className={`drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div style={s.drawerHeader}>
          <h3>Menu</h3>
        </div>
        <nav style={s.navLinks}>
          {[
            { key: 'home',          icon: 'fa-house',          label: 'Home' },
            { key: 'notifications', icon: 'fa-bell',           label: 'Notifications', badge: notifCount },
            { key: 'assigned',      icon: 'fa-file-signature', label: 'Assigned By Me' },
            { key: 'members',       icon: 'fa-users',          label: 'View Members' },
            { key: 'settings',      icon: 'fa-gear',           label: 'Settings' },
            { key: 'profile',       icon: 'fa-user',           label: 'Profile' },
          ].map(({ key, icon, label, badge }) => (
            <div
              key={key}
              style={activePage === key ? s.activeLink : s.navItem}
              onClick={() => { setActivePage(key); toggleDrawer(); }}
            >
              <i className={`fa-solid ${icon}`}></i> {label}
              {badge > 0 && <span style={s.badge}>{badge}</span>}
            </div>
          ))}
          <div style={s.logoutItem} onClick={() => { setShowLogoutModal(true); setIsDrawerOpen(false); }}>
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </div>
        </nav>
      </div>

      {/* ─── OVERLAY ─── */}
      {isDrawerOpen && <div style={s.overlay} onClick={toggleDrawer} />}

      {/* ─── MAIN CONTENT ─── */}
      <main style={s.mainContent}>
        {renderContent()}
      </main>

      {/* ─── FAB ─── */}
      <div style={s.fab} className="atb-fab-btn" onClick={() => setTaskOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" width="26" height="26">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>

      {/* ─── ADD TASK MODAL ─── */}
      {taskOpen && (
        <div className="atb-backdrop" onClick={() => { closeAllDropdowns(); setTaskOpen(false); }}>
          <div className="atb-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
            {/* Drag handle (mobile) */}
            <div className="atb-handle" />

            {/* Header */}
            <div className="atb-mhdr">
              <div className="atb-mtitle">
                <div className="atb-mtitle-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                Add New Task
              </div>
              <button className="atb-xbtn" onClick={() => { resetForm(); setTaskOpen(false); }}>✕</button>
            </div>

            {/* Title */}
            <div className="atb-field">
              <label className="atb-label">Task Title *</label>
              <input
                ref={titleRef}
                className={`atb-input${titleError ? ' error' : ''}`}
                placeholder="What needs to be done?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="atb-field">
              <label className="atb-label">
                Description{' '}
                <span style={{color:'#aaa', fontWeight:400, textTransform:'none', fontSize:'10px'}}>(optional)</span>
              </label>
              <textarea
                className="atb-input atb-textarea"
                placeholder="Add more details..."
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
              />
            </div>

{/* Pills Row: Date | Priority | Assign | Send */}
            <div className="atb-pills-row">

              {/* DATE */}
              <PillAnchor onOpen={rect => setCalRect(rect)} isOpen={showCal}>
                <div className="atb-pill" onClick={() => { const r = pillCalRef.current?.getBoundingClientRect(); setCalRect(r); setShowCal(v=>!v); setShowPri(false); setShowAssign(false); }} ref={pillCalRef}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="15" height="15">
                    <rect x="3" y="4" width="18" height="18" rx="3"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span className="atb-pill-text">{formatDisplayDate(date)}</span>
                </div>
              </PillAnchor>

              {/* PRIORITY */}
              <PillAnchor onOpen={rect => setPriRect(rect)} isOpen={showPri}>
                <div className="atb-pill" onClick={() => { const r = pillPriRef.current?.getBoundingClientRect(); setPriRect(r); setShowPri(v=>!v); setShowCal(false); setShowAssign(false); }} ref={pillPriRef}>
                  <span className="atb-dot" style={{background: priColor}} />
                  <span className="atb-pill-text" style={{color: priColor}}>{priority}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" width="11" height="11">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </PillAnchor>

              {/* ASSIGN TO */}
              <div style={{position:'relative', flex:1}}>
                <div className="atb-pill atb-pill-assign" ref={pillAssignRef} onClick={() => { const r = pillAssignRef.current?.getBoundingClientRect(); setAssignRect(r); setShowAssign(v=>!v); setShowCal(false); setShowPri(false); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" width="15" height="15">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                  <span className="atb-pill-text" style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{assignLabel}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" width="11" height="11">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>

              {/* SEND BUTTON */}
              <button className="atb-send-btn" onClick={handleSubmit} disabled={loading} title="Add Task">
                {loading
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="18" height="18" className="atb-spin">
                      <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10"/>
                    </svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="18" height="18">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                }
              </button>
            </div>

            {/* ── FIXED PORTALS (escape overflow clipping) ── */}
    {showCal && calRect && (
              <FixedPortal rect={calRect} width={272} forceUp>
                <MiniCalendar value={date} onChange={setDate} onClose={() => setShowCal(false)} />
              </FixedPortal>
            )}
            {showPri && priRect && (
              <FixedPortal rect={priRect} width={170}>
                <div className="atb-drop-portal">
                  {PRIORITIES.map(p => (
                    <div
                      key={p.value}
                      className="atb-drop-item"
                      onClick={() => { setPriority(p.value); setShowPri(false); }}
                      style={{fontWeight: priority === p.value ? 700 : 400}}
                    >
                      <span className="atb-dot" style={{background: p.color}} />
                      <span style={{flex:1, color: p.color}}>{p.value}</span>
                      {priority === p.value && <span style={{color:'#14b8a6'}}>✓</span>}
                    </div>
                  ))}
                </div>
              </FixedPortal>
            )}
            {showAssign && assignRect && (
              <FixedPortal rect={assignRect} width={220}>
                <div className="atb-drop-portal">
                  <div className="atb-drop-item" onClick={() => selectAssign('self', 'Myself')}>
                    <span>👤</span><span style={{flex:1}}>Myself</span>
                    {assignTo === 'self' && <span style={{color:'#14b8a6'}}>✓</span>}
                  </div>
                  <div className="atb-drop-item" onClick={() => selectAssign('all', 'All Members')}>
                    <span>👥</span><span style={{flex:1}}>All Members</span>
                    {assignTo === 'all' && <span style={{color:'#14b8a6'}}>✓</span>}
                  </div>
                  {teams.length > 0 && <div className="atb-drop-sep"/>}
                  {teams.map(team => (
                    <div key={team.id}>
                      <div className="atb-drop-item" onClick={() => { setOpenTeam(v => v === team.id ? null : team.id); loadTeam(team.id); setShowOthers(false); }}>
                        <span>🏷</span>
                        <span style={{flex:1}}>{team.name}</span>
                        <span style={{color: openTeam===team.id ? '#14b8a6':'#bbb', fontSize:12, transition:'transform 0.2s', display:'inline-block', transform: openTeam===team.id ? 'rotate(90deg)':'rotate(0deg)'}}>›</span>
                      </div>
                      {openTeam === team.id && (
                        <div className="atb-sub-inline">
                          <div className="atb-drop-item atb-sub-hdr-inline" onClick={() => selectAssign(`team_${team.id}`, `All ${team.name}`)}>
                            <span style={{color:'#14b8a6', marginRight:6}}>↳</span> All {team.name}
                            {assignTo===`team_${team.id}` && <span style={{color:'#14b8a6', marginLeft:'auto'}}>✓</span>}
                          </div>
                          {(teamMembers[team.id] || []).map(m => (
                            <div key={m.id} className="atb-drop-item atb-sub-indent" onClick={() => selectAssign(String(m.id), m.name)}>
                              <span style={{flex:1}}>{m.name}</span>
                              {assignTo === String(m.id) && <span style={{color:'#14b8a6'}}>✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="atb-drop-sep"/>
                  <div className="atb-drop-item" onClick={() => { setShowOthers(v=>!v); setOpenTeam(null); loadOthers(); }}>
                    <span>🔖</span>
                    <span style={{flex:1}}>Other Employees</span>
                    <span style={{color: showOthers ? '#14b8a6':'#bbb', fontSize:12, display:'inline-block', transform: showOthers ? 'rotate(90deg)':'rotate(0deg)', transition:'transform 0.2s'}}>›</span>
                  </div>
                  {showOthers && (
                    <div className="atb-sub-inline">
                      {others.length === 0
                        ? <div className="atb-drop-item" style={{color:'#aaa'}}>None found</div>
                        : others.map(m => (
                          <div key={m.id} className="atb-drop-item atb-sub-indent" onClick={() => selectAssign(String(m.id), m.name)}>
                            <span style={{flex:1}}>{m.name}</span>
                            {assignTo === String(m.id) && <span style={{color:'#14b8a6'}}>✓</span>}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </FixedPortal>
            )}
          </div>
        </div>
      )}

      {/* ─── LOGOUT MODAL ─── */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <i className="fa-solid fa-circle-exclamation" style={{fontSize:'40px', color:'#ef4444', marginBottom:'15px'}}></i>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to destroy your session and exit?</p>
            <div style={s.modalButtons}>
              <button style={s.btnCancel} onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button style={s.btnLogout} onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST ─── */}
      <div className={`atb-toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = {
  layoutContainer: {
    height: '100vh',
    width: '100vw',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  topBar: {
    height: '60px',
    background: '#095959',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    color: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    zIndex: 100,
    flexShrink: 0,
  },
  menuIcon: {
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  brandName: {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '1px',
    fontFamily: 'Segoe UI, sans-serif',
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    position: 'relative',
    background: '#f1f5f9',
  },
  page: {
    padding: '20px',
    textAlign: 'center',
    color: '#334155',
  },
  drawerHeader: {
    padding: '20px',
    background: '#095959',
    color: 'white',
    textAlign: 'center',
  },
  navLinks: {
    display: 'flex',
    flexDirection: 'column',
  },
  navItem: {
    padding: '16px 20px',
    color: '#475569',
    fontSize: '15px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    transition: '0.2s',
  },
  activeLink: {
    padding: '16px 20px',
    color: '#095959',
    background: '#f0fdfa',
    fontSize: '15px',
    fontWeight: '700',
    borderLeft: '5px solid #095959',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  logoutItem: {
    padding: '16px 20px',
    color: '#ef4444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    fontWeight: '600',
  },
  badge: {
    background: '#ff3b3b',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: 'auto',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(2px)',
    zIndex: 900,
  },
  fab: {
    position: 'fixed',
    bottom: '25px',
    right: '25px',
    width: '58px',
    height: '58px',
    background: 'linear-gradient(135deg, #095959 0%, #14b8a6 100%)',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 5px 20px rgba(9,89,89,0.45)',
    cursor: 'pointer',
    zIndex: 800,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '25px',
  },
  btnCancel: {
    flex: 1, padding: '12px', border: 'none', borderRadius: '8px',
    background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer',
  },
  btnLogout: {
    flex: 1, padding: '12px', border: 'none', borderRadius: '8px',
    background: '#ef4444', color: 'white', fontWeight: '600', cursor: 'pointer',
  },
};

const customCSS = `
  /* ── Drawer ── */
  .drawer {
    position: fixed;
    top: 0;
    left: -280px;
    width: 280px;
    height: 100%;
    background: white;
    z-index: 1000;
    transition: 0.3s ease-in-out;
    box-shadow: 10px 0 30px rgba(0,0,0,0.1);
  }
  .drawer.open { left: 0; }
  .bar {
    width: 22px;
    height: 2px;
    background-color: white;
    margin: 4px 0;
    border-radius: 2px;
  }

  /* ── FAB hover ── */
  .atb-fab-btn:hover { transform: scale(1.08) !important; box-shadow: 0 8px 28px rgba(9,89,89,0.55) !important; }
  .atb-fab-btn:active { transform: scale(0.94) !important; }

  /* ── Task Modal Backdrop ── */
  .atb-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.42);
    z-index: 1300;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: atbFadeIn 0.18s ease;
  }
  @media (min-width: 600px) {
    .atb-backdrop { align-items: center; }
  }
  @keyframes atbFadeIn { from{opacity:0} to{opacity:1} }

/* ── Task Modal ── */
  .atb-modal {
    width: 100%;
    max-width: 540px;
    background: #fff;
    border-radius: 22px 22px 0 0;
    padding: 0 16px 28px;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.14);
    max-height: 92dvh;
    overflow-y: auto;
    overflow-x: visible;
    box-sizing: border-box;
    animation: atbSlideUp 0.26s cubic-bezier(.22,.68,0,1.2);
  }
  @media (min-width: 600px) {
    .atb-modal {
      border-radius: 20px;
      padding: 0 24px 28px;
      max-height: 88dvh;
      overflow: visible;
    }
  }
  @keyframes atbSlideUp {
    from { transform: translateY(70px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  /* Drag handle */
  .atb-handle {
    width: 40px; height: 4px; border-radius: 3px;
    background: #dde8e7;
    margin: 13px auto 0;
  }
  @media (min-width: 600px) { .atb-handle { display: none; } }

  /* Modal Header */
  .atb-mhdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 18px;
    margin-bottom: 16px;
  }
  .atb-mtitle {
    font-size: 16px; font-weight: 700; color: #0b3d3a;
    font-family: 'Segoe UI', sans-serif;
    display: flex; align-items: center; gap: 8px;
  }
  .atb-mtitle-icon {
    width: 30px; height: 30px; border-radius: 50%;
    background: linear-gradient(135deg, #095959, #14b8a6);
    display: flex; align-items: center; justify-content: center;
  }
  .atb-xbtn {
    width: 30px; height: 30px; border-radius: 50%;
    background: #f0f7f6; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; color: #666; transition: background 0.15s;
  }
  .atb-xbtn:hover { background: #dbeeed; }

  /* Fields */
  .atb-field { margin-bottom: 12px; }
  .atb-label {
    display: block;
    font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px;
    text-transform: uppercase; color: #14b8a6;
    margin-bottom: 5px;
    font-family: 'Segoe UI', sans-serif;
  }
  .atb-input {
    width: 100%; box-sizing: border-box;
    border: 1.6px solid #e2eded;
    border-radius: 12px; padding: 10px 13px;
    font-size: 14px; font-family: 'Segoe UI', sans-serif;
    color: #1a1a1a; background: #fafefe;
    outline: none; transition: border-color 0.18s, box-shadow 0.18s;
  }
  .atb-input:focus {
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20,184,166,0.12);
    background: #fff;
  }
  .atb-input.error {
    border-color: #e53935 !important;
    animation: atbShake 0.42s ease;
  }
  @keyframes atbShake {
    0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)}
    40%{transform:translateX(7px)}   60%{transform:translateX(-4px)}
    80%{transform:translateX(4px)}
  }
  .atb-textarea { resize: none; min-height: 62px; }
/* ── PILLS ROW ── */
  .atb-pills-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    flex-wrap: nowrap;
    overflow: visible;
  }

  /* Individual pill */
  .atb-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #f1faf9;
    border: 1.5px solid #cce9e6;
    border-radius: 30px;
    padding: 7px 10px;
    cursor: pointer;
    font-size: 12px;
    color: #0b3d3a;
    font-family: 'Segoe UI', sans-serif;
    font-weight: 500;
    user-select: none;
    position: relative;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .atb-pill:hover { background: #daf2ef; border-color: #14b8a6; }
  .atb-pill-assign { flex: 1; min-width: 0; }
  .atb-pill-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70px; }

  /* Priority dot */
  .atb-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* Send button */
  .atb-send-btn {
    width: 38px; height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #095959, #14b8a6);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 3px 12px rgba(9,89,89,0.4);
    transition: transform 0.18s, opacity 0.18s;
    flex-shrink: 0;
  }
  .atb-send-btn:hover:not(:disabled) { transform: scale(1.08); }
  .atb-send-btn:active:not(:disabled) { transform: scale(0.92); }
  .atb-send-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .atb-spin { animation: spin 0.9s linear infinite; }

  /* ── Calendar Popup ── */

.atb-cal-popup {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.22);
    padding: 14px 12px 12px;
    z-index: 9000;
    width: 268px;
    animation: atbFadeIn 0.15s ease;
  }
  .atb-cal-hdr {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px;
  }
  .atb-cal-month-wrap {
    display: flex; flex-direction: column; align-items: center; gap: 1px;
  }
  .atb-cal-month { font-weight: 700; font-size: 15px; color: #0b3d3a; line-height: 1.2; }
  .atb-cal-year  { font-size: 11px; color: #14b8a6; font-weight: 600; }
  .atb-cal-nav {
    background: #f1faf9; border: none; border-radius: 10px;
    width: 36px; height: 36px; cursor: pointer;
    font-size: 22px; color: #14b8a6; line-height: 1;
    transition: background 0.14s;
    display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .atb-cal-nav:hover { background: #daf2ef; }
  .atb-cal-nav:active { background: #b2e8e3; transform: scale(0.93); }
  .atb-cal-nav-lg { width: 40px; height: 40px; font-size: 24px; border-radius: 12px; }
  .atb-cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 3px; }
  .atb-cal-wday { text-align:center; font-size:10px; font-weight:700; color:#14b8a6; padding:2px 0 6px; }
  .atb-cal-day {
    text-align:center; font-size:13px; padding:7px 2px;
    border-radius:8px; cursor:pointer; color:#333; transition: background 0.12s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .atb-cal-day:hover:not(.atb-cal-past):not(.atb-cal-empty) { background: #e0f7f5; }
  .atb-cal-today  { font-weight:700; color:#14b8a6; }
  .atb-cal-sel    { background:#14b8a6 !important; color:#fff !important; font-weight:700; border-radius:8px; }
  .atb-cal-past   { color:#ccc; cursor:default; }
  .atb-cal-empty  { cursor:default; }

/* ── Dropdown portal card ── */
  .atb-drop-portal {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 10px 36px rgba(0,0,0,0.18);
    overflow: hidden;
    animation: atbFadeIn 0.14s ease;
    max-height: 320px;
    overflow-y: auto;
  }
  .atb-drop-item {
    padding: 10px 14px; font-size: 13px; cursor: pointer;
    color: #222; display: flex; align-items: center; gap: 8px;
    transition: background 0.12s;
    font-family: 'Segoe UI', sans-serif;
  }
  .atb-drop-item:hover { background: #e9f2ef; }
  .atb-drop-sep { height: 1px; background: #f0f0f0; }
  /* Inline sub-menu (expands in place, no second dropdown) */
  .atb-sub-inline {
    background: #f7fdfb;
    border-top: 1px solid #e8f5f3;
    border-bottom: 1px solid #e8f5f3;
  }
  .atb-sub-hdr-inline {
    font-weight: 700; color: #0f9d9a;
    font-size: 12px; padding: 8px 14px 8px 20px;
    display: flex; align-items: center; gap: 6px; cursor: pointer;
  }
  .atb-sub-hdr-inline:hover { background: #e0f5f2; }
  .atb-sub-indent {
    padding-left: 28px !important;
    font-size: 12.5px !important;
    color: #334155 !important;
  }

  /* .atb-sub removed — now using atb-sub-inline inside portal */

  /* ── Toast ── */
  .atb-toast {
    position: fixed;
    bottom: -80px; left: 50%;
    transform: translateX(-50%);
    background: #095959; color: #fff;
    padding: 11px 22px; border-radius: 30px;
    font-size: 13px; font-family: 'Segoe UI', sans-serif;
    box-shadow: 0 6px 22px rgba(0,0,0,0.2);
    z-index: 9999; white-space: nowrap;
    transition: bottom 0.32s ease, opacity 0.32s ease;
    opacity: 0; pointer-events: none;
  }
  .atb-toast.show { bottom: 28px; opacity: 1; }

  /* ── Logout Modal ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex; justify-content: center; align-items: center;
    z-index: 2000;
    animation: atbFadeIn 0.3s ease;
  }
  .modal-card {
    background: white; padding: 30px; border-radius: 16px;
    width: 85%; max-width: 350px; text-align: center;
    animation: atbSlideUp 0.3s ease;
  }

  /* ── Mobile Responsive ── */
  @media (max-width: 400px) {
    .atb-pill { padding: 6px 8px; font-size: 11px; }
    .atb-pill-text { max-width: 55px; }
    .atb-modal { padding: 0 12px 24px; }
    .atb-send-btn { width: 34px; height: 34px; }
  }
`;

export default Layout;
