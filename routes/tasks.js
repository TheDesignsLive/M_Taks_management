// mobile/routes/tasks.js
import express from 'express';
import db from '../config/db.js';
import { notifyDesktop } from '../utils/notifyDesktop.js';

const router = express.Router();

// ==============================
// GET TEAMS
// ==============================
router.get('/get-teams', async (req, res) => {
  try {
    if (!req.session.role) return res.json({ success: false, message: 'Unauthorized' });
    const adminId = req.session.adminId;
    const [rows] = await db.execute('SELECT id, name FROM teams WHERE admin_id = ?', [adminId]);
    res.json({ success: true, teams: rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// ==============================
// GET TEAM MEMBERS
// ==============================
router.get('/get-team-members/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const currentUserId = req.session.userId || null;
    let query = `SELECT u.id, u.name FROM users u JOIN roles r ON u.role_id = r.id WHERE r.team_id = ?`;
    let params = [teamId];
    if (currentUserId) { query += ' AND u.id != ?'; params.push(currentUserId); }
    const [rows] = await db.execute(query, params);
    res.json({ success: true, members: rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// ==============================
// GET OTHER EMPLOYEES
// ==============================
router.get('/get-other-employees', async (req, res) => {
  try {
    if (!req.session.role) return res.json({ success: false, message: 'Unauthorized' });
    const adminId = req.session.adminId;
    const [rows] = await db.execute(`
      SELECT u.id, u.name FROM users u JOIN roles r ON u.role_id = r.id
      WHERE u.admin_id = ? AND r.team_id IS NULL AND u.id != ?
    `, [adminId, req.session.userId || 0]);
    res.json({ success: true, members: rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// ==============================
// ADD TASK  ← single handler, no duplicate
// ==============================
router.post('/add-task', async (req, res) => {
  try {
    if (!req.session.role) return res.json({ success: false, message: 'Unauthorized' });

    const { title, description, date, priority, assignedTo } = req.body;

    const assigned_by = req.session.role === 'admin' ? req.session.adminId : req.session.userId;
    const who_assigned = req.session.role;

    let admin_id;
    if (req.session.role === 'admin') {
      admin_id = req.session.adminId;
    } else {
      const [rows] = await db.execute('SELECT admin_id FROM users WHERE id=?', [req.session.userId]);
      if (rows.length === 0) return res.status(400).json({ success: false, message: 'User not found' });
      admin_id = rows[0].admin_id;
    }

    let finalAssignedTo = assignedTo;
    if (req.session.role === 'admin') {
      if (parseInt(assignedTo) === req.session.adminId) finalAssignedTo = 0;
    } else {
      if (assignedTo === 'admin' || parseInt(assignedTo) === admin_id) finalAssignedTo = 0;
    }

    const finalDate = date || new Date().toISOString().slice(0, 10);

    let sectionValue = 'TASK';
    if (req.session.role === 'admin' && parseInt(finalAssignedTo) !== 0) sectionValue = 'OTHERS';
    if (req.session.role !== 'admin' && parseInt(finalAssignedTo) !== parseInt(req.session.userId)) sectionValue = 'OTHERS';

    // TEAM ASSIGNMENT
    if (typeof assignedTo === 'string' && assignedTo.startsWith('team_')) {
      const teamId = assignedTo.split('_')[1];
      const [users] = await db.execute(`
        SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.team_id = ?
      `, [teamId]);
      for (const user of users) {
        await db.execute(
          `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OTHERS', 'OPEN')`,
          [admin_id, title || 'No Title', description || null, (priority || 'MEDIUM').toUpperCase(), finalDate, user.id, assigned_by, who_assigned]
        );
      }
      req.io.emit('update_tasks');
      notifyDesktop(); // ✅ ping desktop
      return res.json({ success: true });
    }

    // ALL MEMBERS
    if (assignedTo === 'all') {
      const [users] = await db.execute('SELECT id FROM users WHERE admin_id=?', [admin_id]);
      for (const user of users) {
        if ((req.session.role === 'admin' && user.id === req.session.adminId) ||
            (req.session.role !== 'admin' && user.id === req.session.userId)) continue;
        await db.execute(
          `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OTHERS', 'OPEN')`,
          [admin_id, title || 'No Title', description || null, (priority || 'MEDIUM').toUpperCase(), finalDate, user.id, assigned_by, who_assigned]
        );
      }
      await db.execute(
        `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'OTHERS', 'OPEN')`,
        [admin_id, title || 'No Title', description || null, (priority || 'MEDIUM').toUpperCase(), finalDate, assigned_by, who_assigned]
      );
      req.io.emit('update_tasks');
      notifyDesktop(); // ✅ ping desktop
      return res.json({ success: true, message: 'Task added successfully' });
    }

    // SELF
    if (assignedTo === 'self') {
      finalAssignedTo = req.session.role === 'admin' ? 0 : req.session.userId;
      sectionValue = 'TASK';
    }

    // NORMAL INSERT
    await db.execute(
      `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
      [admin_id, title || 'No Title', description || null, (priority || 'MEDIUM').toUpperCase(), finalDate, finalAssignedTo, assigned_by, who_assigned, sectionValue]
    );

    req.io.emit('update_tasks');
    notifyDesktop(); // ✅ ping desktop
    res.json({ success: true, message: 'Task added successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error adding task' });
  }
});

// ==============================
// UPDATE TASK STATUS
// ==============================
router.post('/update-task-status', async (req, res) => {
  if (!req.session.role) return res.status(401).json({ success: false });
  try {
    let { id, status, section } = req.body;
    if (!status) status = 'OPEN';
    if (!section) section = 'TASK';
    await db.execute('UPDATE tasks SET status = ?, section = ? WHERE id = ?', [status, section, id]);
    req.io.emit('update_tasks');
    notifyDesktop(); // ✅
    res.json({ success: true, status, section });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ==============================
// EDIT TASK DETAILS
// ==============================
router.post('/edit-task-details', async (req, res) => {
  if (!req.session.role) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const { id, title, description, priority, due_date, assigned_to } = req.body;

    let finalAssignedTo = assigned_to;
    if (req.session.role === 'admin') {
      if (parseInt(assigned_to) === req.session.adminId) finalAssignedTo = 0;
    } else {
      if (assigned_to === 'admin' || parseInt(assigned_to) === req.session.adminId) finalAssignedTo = 0;
    }

    let newSection = 'TASK';
    if (req.session.role === 'admin' && parseInt(finalAssignedTo) !== 0) newSection = 'OTHERS';
    if (req.session.role !== 'admin' && parseInt(finalAssignedTo) !== parseInt(req.session.userId)) newSection = 'OTHERS';

    const finalDesc = (description === '' || description === null) ? null : description;

    await db.execute(
      `UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ?, assigned_to = ?,
       section = IF(status='COMPLETED', section, ?) WHERE id = ?`,
      [title, finalDesc, priority.toUpperCase(), due_date, finalAssignedTo, newSection, id]
    );

    req.io.emit('update_tasks');
    notifyDesktop(); // ✅
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

// ==============================
// UPDATE TASK DATE
// ==============================
router.post('/update-task-date', async (req, res) => {
  if (!req.session.role) return res.status(401).json({ success: false });
  try {
    const { id, due_date } = req.body;
    if (!id || !due_date) return res.json({ success: false });
    await db.execute('UPDATE tasks SET due_date = ? WHERE id = ?', [due_date, id]);
    req.io.emit('update_tasks');
    notifyDesktop(); // ✅
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// ==============================
// GET SINGLE TASK
// ==============================
router.get('/get-task/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, title, description, priority, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date FROM tasks WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.json({ success: false });
    res.json({ success: true, task: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ==============================
// UPDATE TASK SECTION (DRAG)
// ==============================
router.post('/update-task-section', async (req, res) => {
  try {
    const { id, section } = req.body;
    await db.execute('UPDATE tasks SET section = ? WHERE id = ?', [section, id]);
    req.io.emit('update_tasks');
    notifyDesktop(); // ✅
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ==============================
// DELETE TASK
// ==============================
router.post('/delete-task/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    req.io.emit('update_tasks');
    notifyDesktop(); // ✅
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ==============================
// DELETE COMPLETED TASKS
// ==============================
router.post('/delete-completed-tasks', async (req, res) => {
  try {
    const { role, adminId, userId } = req.session;
    if (!role) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let query, params;
    if (role === 'admin') {
      query = "DELETE FROM tasks WHERE admin_id = ? AND assigned_to = 0 AND status = 'COMPLETED'";
      params = [adminId];
    } else if (role === 'user' || role === 'owner') {
      query = "DELETE FROM tasks WHERE admin_id = ? AND assigned_to = ? AND status = 'COMPLETED'";
      params = [adminId, userId];
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const [result] = await db.query(query, params);
    if (result.affectedRows > 0) {
      req.io.emit('update_tasks');
      notifyDesktop(); // ✅
    }
    return res.json({
      success: result.affectedRows > 0,
      message: result.affectedRows > 0 ? 'Completed tasks deleted successfully' : 'No completed tasks found to delete',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;