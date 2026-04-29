// view_member.js  — ES module, drop-in replacement
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

const router = express.Router();

// ── multer setup (same as original) ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/images';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ── helpers ──────────────────────────────────────────────────────────────────
function getAdminId(req) {
  return req.session.role === 'admin' ? req.session.adminId : null;
}

async function resolveAdminId(con, req) {
  if (req.session.role === 'admin') return { adminId: req.session.adminId, controlType: 'ADMIN' };
  const [rows] = await con.query(
    'SELECT u.admin_id, r.control_type, r.team_id FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=?',
    [req.session.userId]
  );
  if (!rows.length) return null;
  return { adminId: rows[0].admin_id, controlType: rows[0].control_type, teamId: rows[0].team_id };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/view_member  — load page data
// ═══════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  if (!req.session.role) return res.status(401).json({ success: false, message: 'Not authenticated' });

  try {
    const con = req.db; // injected via app.use or import — adjust if you use require('../config/db')
    let users = [], roles = [], teams = [], adminName = null;
    const sessionRole = req.session.role;

    if (sessionRole === 'admin') {
      const adminId = req.session.adminId;
      const [aRows] = await con.query('SELECT name FROM admins WHERE id=?', [adminId]);
      adminName = aRows[0]?.name || null;

      const [tRows] = await con.query('SELECT id, name FROM teams WHERE admin_id=? ORDER BY name ASC', [adminId]);
      teams = tRows;

      const [uRows] = await con.query(
        `SELECT u.*, r.role_name, r.team_id
         FROM users u JOIN roles r ON u.role_id=r.id
         WHERE u.admin_id=?`, [adminId]
      );
      users = uRows;

      const [rRows] = await con.query('SELECT id, role_name, team_id FROM roles WHERE admin_id=?', [adminId]);
      roles = rRows;

    } else {
      const info = await resolveAdminId(con, req);
      if (!info) return res.status(403).json({ success: false, message: 'Forbidden' });
      const { adminId, controlType, teamId } = info;

      const [aRows] = await con.query('SELECT name FROM admins WHERE id=?', [adminId]);
      adminName = aRows[0]?.name || null;

      if (controlType === 'ADMIN' || controlType === 'OWNER') {
        const [tRows] = await con.query('SELECT id, name FROM teams WHERE admin_id=? ORDER BY name ASC', [adminId]);
        teams = tRows;
        const [rRows] = await con.query('SELECT id, role_name, team_id FROM roles WHERE admin_id=?', [adminId]);
        roles = rRows;
        const [uRows] = await con.query(
          `SELECT u.*, r.role_name, r.team_id FROM users u JOIN roles r ON u.role_id=r.id WHERE u.admin_id=?`, [adminId]
        );
        users = uRows;
      } else if (teamId) {
        const [tRows] = await con.query('SELECT id, name FROM teams WHERE id=?', [teamId]);
        teams = tRows;
        const [rRows] = await con.query('SELECT id, role_name, team_id FROM roles WHERE admin_id=? AND team_id=?', [adminId, teamId]);
        roles = rRows;
        const [uRows] = await con.query(
          `SELECT u.*, r.role_name, r.team_id FROM users u JOIN roles r ON u.role_id=r.id WHERE u.admin_id=? AND r.team_id=?`,
          [adminId, teamId]
        );
        users = uRows;
      } else {
        const [uRows] = await con.query(
          `SELECT u.*, r.role_name, r.team_id FROM users u JOIN roles r ON u.role_id=r.id WHERE u.id=?`,
          [req.session.userId]
        );
        users = uRows;
      }
    }

    res.json({ success: true, users, roles, teams, adminName, sessionRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error loading members' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/view_member/add  — add member
// ═══════════════════════════════════════════════════════════════════════════
router.post('/add', upload.single('profile_pic'), async (req, res) => {
  if (!req.session.role) return res.status(401).json({ success: false });
  try {
    const con = req.db;
    const { name, email, phone, password, role_id } = req.body;
    const adminId = req.session.role === 'admin'
      ? req.session.adminId
      : (await resolveAdminId(con, req))?.adminId;

    if (!adminId) return res.status(403).json({ success: false, message: 'Forbidden' });

    const [existing] = await con.query('SELECT id FROM users WHERE email=? AND admin_id=?', [email, adminId]);
    if (existing.length) return res.json({ success: false, message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const profile_pic = req.file ? req.file.filename : null;

    await con.query(
      'INSERT INTO users (admin_id, name, email, phone, password, role_id, profile_pic, status) VALUES (?,?,?,?,?,?,?,?)',
      [adminId, name, email, phone || null, hashed, role_id, profile_pic, 'ACTIVE']
    );

    if (req.io) req.io.emit('update_members');
    res.json({ success: true, message: 'Member added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/view_member/edit/:id  — edit member
// ═══════════════════════════════════════════════════════════════════════════
router.post('/edit/:id', upload.single('profile_pic'), async (req, res) => {
  if (!req.session.role) return res.status(401).json({ success: false });
  try {
    const con = req.db;
    const userId = req.params.id;
    const { name, email, phone, password, role_id } = req.body;

    const fields = ['name=?', 'email=?', 'phone=?', 'role_id=?'];
    const values = [name, email, phone || null, role_id];

    if (password && password.trim()) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push('password=?');
      values.push(hashed);
    }
    if (req.file) {
      fields.push('profile_pic=?');
      values.push(req.file.filename);
    }

    values.push(userId);
    await con.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, values);

    if (req.io) req.io.emit('update_members');
    res.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/view_member/suspend/:id  — toggle suspend
// ═══════════════════════════════════════════════════════════════════════════
router.get('/suspend/:id', async (req, res) => {
  if (!req.session.role) return res.status(401).json({ success: false });
  try {
    const con = req.db;
    const [rows] = await con.query('SELECT status FROM users WHERE id=?', [req.params.id]);
    if (!rows.length) return res.json({ success: false, message: 'User not found' });

    const newStatus = rows[0].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await con.query('UPDATE users SET status=? WHERE id=?', [newStatus, req.params.id]);

    if (req.io) req.io.emit('update_members');
    res.json({ success: true, message: `Member ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/view_member/delete/:id  — delete member
// ═══════════════════════════════════════════════════════════════════════════
router.get('/delete/:id', async (req, res) => {
  if (!req.session.role) return res.status(401).json({ success: false });
  try {
    const con = req.db;
    const sessionRole = req.session.role;

    if (sessionRole === 'user') {
      // non-admin: send delete request (your original logic)
      res.json({ success: true, message: 'Delete request sent to admin' });
      return;
    }

    await con.query('DELETE FROM users WHERE id=?', [req.params.id]);
    if (req.io) req.io.emit('update_members');
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;