// routes/view_teams.js
import express from 'express';
import con from '../config/db.js';

const router = express.Router();

// ─── HELPER: get adminId from session ─────────────────────────────────────────
function getAdminId(req) {
  return req.session.adminId || null;
}

function isAuthorized(req) {
  return !!req.session.role;
}

// ================= GET ALL TEAMS =================
router.get('/', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const adminId = getAdminId(req);

    let teams = [];

    if (req.session.role === 'admin') {
      const [rows] = await con.query(
        'SELECT * FROM teams WHERE admin_id = ? ORDER BY id DESC',
        [adminId]
      );
      teams = rows;
    } else if (req.session.role === 'owner') {
      const [rows] = await con.query(
        'SELECT * FROM teams WHERE admin_id = ? ORDER BY id DESC',
        [adminId]
      );
      teams = rows;
    }

    return res.json({ success: true, teams });
  } catch (err) {
    console.error('GET /api/teams error:', err);
    return res.status(500).json({ success: false, message: 'Error loading departments' });
  }
});

// ================= ADD TEAM =================
router.post('/add', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Department name is required' });
  }

  try {
    const adminId = getAdminId(req);

    await con.execute(
      'INSERT INTO teams (admin_id, name) VALUES (?, ?)',
      [adminId, name.trim()]
    );

    return res.json({ success: true, message: 'Department successfully created' });
  } catch (err) {
    console.error('POST /api/teams/add error:', err);
    return res.status(500).json({ success: false, message: 'Error creating department' });
  }
});

// ================= EDIT TEAM =================
router.post('/edit/:id', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const teamId = req.params.id;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Department name is required' });
  }

  try {
    const adminId = getAdminId(req);

    if (req.session.role === 'admin') {
      await con.query(
        'UPDATE teams SET name = ? WHERE id = ? AND admin_id = ?',
        [name.trim(), teamId, adminId]
      );
    } else if (req.session.role === 'owner') {
      await con.query(
        'UPDATE teams SET name = ? WHERE id = ?',
        [name.trim(), teamId]
      );
    }

    return res.json({ success: true, message: 'Department successfully updated' });
  } catch (err) {
    console.error('POST /api/teams/edit/:id error:', err);
    return res.status(500).json({ success: false, message: 'Error updating department' });
  }
});

// ================= DELETE TEAM =================
router.get('/delete/:id', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const teamId = req.params.id;

  try {
    const adminId = getAdminId(req);

    if (req.session.role === 'admin') {
      await con.execute(
        'DELETE FROM teams WHERE id = ? AND admin_id = ?',
        [teamId, adminId]
      );
    } else if (req.session.role === 'owner') {
      await con.execute(
        'DELETE FROM teams WHERE id = ?',
        [teamId]
      );
    }

    return res.json({ success: true, message: 'Department successfully deleted' });
  } catch (err) {
    console.error('GET /api/teams/delete/:id error:', err);
    return res.status(500).json({ success: false, message: 'Error deleting department' });
  }
});

export default router;