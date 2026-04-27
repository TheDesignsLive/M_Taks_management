import React, { useState, useEffect } from 'react';

// ─── BASE URL ───────────────────────────────────────────────────────────────
const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://m-tms.thedesigns.live';

// ─── DUMMY COMPONENTS (Aap inki jagah apni files import kar sakte hain) ──────
const Home = () => <div style={s.page}><h1>🏠 Home Dashboard</h1><p>Welcome back!</p></div>;
const Notifications = () => <div style={s.page}><h1>🔔 Notifications</h1><p>No new updates.</p></div>;
const AssignedByMe = () => <div style={s.page}><h1>📝 Assigned By Me</h1><p>List of tasks...</p></div>;
const ViewMembers = () => <div style={s.page}><h1>👥 Members</h1><p>Manage your team.</p></div>;
const Settings = () => <div style={s.page}><h1>⚙️ Settings</h1><p>Account preferences.</p></div>;
const Profile = () => <div style={s.page}><h1>👤 Profile</h1><p>Your details.</p></div>;

const Layout = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [notifCount, setNotifCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Toggle Drawer
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  // Page Content Selector
  const renderContent = () => {
    switch (activePage) {
      case 'home': return <Home />;
      case 'notifications': return <Notifications />;
      case 'assigned': return <AssignedByMe />;
      case 'members': return <ViewMembers />;
      case 'settings': return <Settings />;
      case 'profile': return <Profile />;
      default: return <Home />;
    }
  };

  // ─── LOGOUT FUNCTION (Session Destroy - As per your requirement) ──────────
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
        alert("Logout failed. Please try again.");
      }
    } catch (err) {
      console.error("Logout Error:", err);
      window.location.href = '/';
    }
  };

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
          <div style={activePage === 'home' ? s.activeLink : s.navItem} onClick={() => {setActivePage('home'); toggleDrawer();}}>
            <i className="fa-solid fa-house"></i> Home
          </div>
          
          <div style={activePage === 'notifications' ? s.activeLink : s.navItem} onClick={() => {setActivePage('notifications'); toggleDrawer();}}>
            <i className="fa-solid fa-bell"></i> Notifications 
            {notifCount > 0 && <span style={s.badge}>{notifCount}</span>}
          </div>

          <div style={activePage === 'assigned' ? s.activeLink : s.navItem} onClick={() => {setActivePage('assigned'); toggleDrawer();}}>
            <i className="fa-solid fa-file-signature"></i> Assigned By Me
          </div>

          <div style={activePage === 'members' ? s.activeLink : s.navItem} onClick={() => {setActivePage('members'); toggleDrawer();}}>
            <i className="fa-solid fa-users"></i> View Members
          </div>

          <div style={activePage === 'settings' ? s.activeLink : s.navItem} onClick={() => {setActivePage('settings'); toggleDrawer();}}>
            <i className="fa-solid fa-gear"></i> Settings
          </div>

          <div style={activePage === 'profile' ? s.activeLink : s.navItem} onClick={() => {setActivePage('profile'); toggleDrawer();}}>
            <i className="fa-solid fa-user"></i> Profile
          </div>

          <div style={s.logoutItem} onClick={() => {setShowLogoutModal(true); setIsDrawerOpen(false);}}>
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

      {/* ─── FLOATING ACTION BUTTON (Plus Icon) ─── */}
      <div style={s.fab} onClick={() => alert('Add New Clicked!')}>
        <i className="fa-solid fa-plus" style={{fontSize: '28px'}}></i>
      </div>

      {/* ─── LOGOUT MODAL ─── */}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <i className="fa-solid fa-circle-exclamation" style={{fontSize: '40px', color: '#ef4444', marginBottom: '15px'}}></i>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to destroy your session and exit?</p>
            <div style={s.modalButtons}>
              <button style={s.btnCancel} onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button style={s.btnLogout} onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── STYLES ───
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
    width: '65px',
    height: '65px',
    background: '#095959',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 5px 20px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    zIndex: 800,
    transition: 'transform 0.2s',
  },
  modalButtons: {
    display: 'flex',
    gap: '10px',
    marginTop: '25px',
  },
  btnCancel: { flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' },
  btnLogout: { flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#ef4444', color: 'white', fontWeight: '600', cursor: 'pointer' }
};

const customCSS = `
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
  .drawer.open {
    left: 0;
  }
  .bar {
    width: 22px;
    height: 2px;
    background-color: white;
    margin: 4px 0;
    border-radius: 2px;
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    animation: fadeIn 0.3s ease;
  }
  .modal-card {
    background: white;
    padding: 30px;
    border-radius: 16px;
    width: 85%;
    max-width: 350px;
    text-align: center;
    animation: slideUp 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

export default Layout;