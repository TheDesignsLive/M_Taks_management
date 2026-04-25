import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const AdminTable = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamic URL: Local par 5000 use karega, Live par domain
    const baseURL = window.location.hostname === "localhost" 
      ? "http://localhost:5000" 
      : "https://m-tms.thedesigns.live";

    fetch(`${baseURL}/api/admins/all`)
      .then((res) => res.json())
      .then((data) => {
        setAdmins(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <h2>Loading Admins...</h2>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Admin List ({window.location.hostname === "localhost" ? "Local" : "Live"})</h2>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f4f4f4' }}>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td>{admin.id}</td>
              <td>{admin.name}</td>
              <td>{admin.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function App() {
  return (
    <Router>
      <nav style={{ padding: '15px', background: '#2c3e50', display: 'flex', gap: '20px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
        <Link to="/admins" style={{ color: 'white', textDecoration: 'none' }}>View Admins</Link>
      </nav>
      <Routes>
        <Route path="/" element={<div style={{ padding: '20px' }}><h1>Dashboard Home</h1></div>} />
        <Route path="/admins" element={<AdminTable />} />
      </Routes>
    </Router>
  );
}

export default App;