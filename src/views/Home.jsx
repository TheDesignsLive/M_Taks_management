import React from 'react';

const Home = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={cardStyle}>
        <h2 style={{ color: '#095959', margin: '0 0 10px 0' }}>Welcome, Rajdeep!</h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Aapka aaj ka schedule aur tasks yahan dikhenge.</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#475569', marginBottom: '15px' }}>Quick Stats</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ ...miniCard, borderLeft: '4px solid #14b8a6' }}>
            <span style={{ fontSize: '20px', fontWeight: '700' }}>12</span>
            <p style={labelStyle}>Total Tasks</p>
          </div>
          <div style={{ ...miniCard, borderLeft: '4px solid #f59e0b' }}>
            <span style={{ fontSize: '20px', fontWeight: '700' }}>05</span>
            <p style={labelStyle}>Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const cardStyle = { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const miniCard = { flex: 1, background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const labelStyle = { margin: '5px 0 0 0', fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' };

export default Home;