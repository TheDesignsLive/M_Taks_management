import React from 'react';

const Notifications = () => {
  const dummyNotifs = [
    { id: 1, text: "New task assigned by Admin", time: "2 mins ago" },
    { id: 2, text: "Project 'TMS Mobile' status updated", time: "1 hour ago" },
    { id: 3, text: "Meeting scheduled for 4 PM", time: "3 hours ago" }
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      <h3 style={{ color: '#475569', marginBottom: '20px' }}>Recent Notifications</h3>
      {dummyNotifs.map(n => (
        <div key={n.id} style={notifItem}>
          <div style={iconDot}></div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>{n.text}</p>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{n.time}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const notifItem = { display: 'flex', alignItems: 'center', gap: '15px', background: '#fff', padding: '15px', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const iconDot = { width: '8px', height: '8px', background: '#14b8a6', borderRadius: '50%' };

export default Notifications;