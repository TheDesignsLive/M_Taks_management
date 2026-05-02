// routes/assign_by_me.js
import express from 'express';
import db from '../config/db.js'; // adjust path as needed
import { notifyDesktop } from '../utils/notifyDesktop.js';

const router = express.Router();

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.role) return res.status(401).json({ success: false, message: 'Unauthorized' });
  next();
}

// ─── GET: Load page data ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const adminId      = req.session.adminId;
  const sessionRole  = req.session.role;
  const sessionUserId = req.session.userId;

  let members = [], adminName = null, openTasks = [], completedTasks = [], teams = [];

  try {
    // Admin name
    const [aRows] = await db.query('SELECT name FROM admins WHERE id=?', [adminId]);
    if (aRows.length > 0) adminName = aRows[0].name;

    // Teams
    const [tRows] = await db.query(
      'SELECT id, name FROM teams WHERE admin_id=? ORDER BY name ASC',
      [adminId]
    );
    teams = tRows;

    // Members
    if (sessionRole === 'admin' || sessionRole === 'owner') {
      const [mRows] = await db.query(
        `SELECT u.id, u.name, r.team_id 
         FROM users u LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.admin_id=? AND u.status='ACTIVE'`,
        [adminId]
      );
      members = mRows;
    } else {
      const [mRows] = await db.query(
        `SELECT u.id, u.name, r.team_id 
         FROM users u LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.admin_id=? AND u.status='ACTIVE' AND u.id != ?`,
        [adminId, sessionUserId]
      );
      members = mRows;
    }

    // Tasks query
    const baseSelect = `
      SELECT t.id, t.title, t.description, t.priority, t.status, t.due_date, t.section,
             t.assigned_to AS assignee_id,
             COALESCE(u.name, CONCAT(a.name, ' (Admin)')) AS assigned_to
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id AND t.assigned_to != 0
      LEFT JOIN admins a ON t.admin_id = a.id AND t.assigned_to = 0
    `;

    let taskQuery, queryParams;

    if (sessionRole === 'admin') {
      taskQuery = `${baseSelect}
        WHERE t.who_assigned='admin' AND t.assigned_by=? AND t.assigned_to != 0
        ORDER BY t.due_date ASC`;
      queryParams = [adminId];
    } else if (sessionRole === 'owner') {
      taskQuery = `${baseSelect}
        WHERE t.who_assigned='owner' AND t.assigned_by=? AND t.assigned_to != ?
        ORDER BY t.due_date ASC`;
      queryParams = [sessionUserId, sessionUserId];
    } else {
      taskQuery = `${baseSelect}
        WHERE t.who_assigned='user' AND t.assigned_by=? AND t.assigned_to != ?
        ORDER BY t.due_date ASC`;
      queryParams = [sessionUserId, sessionUserId];
    }

    const [rows] = await db.query(taskQuery, queryParams);
    rows.forEach(task => {
      if (task.status === 'COMPLETED') completedTasks.push(task);
      else openTasks.push(task);
    });

    return res.json({
      success: true,
      openTasks,
      completedTasks,
      members,
      teams,
      adminName,
      session: {
        role: sessionRole,
        userId: sessionUserId,
        adminId,
      },
    });
  } catch (err) {
    console.error('[assign_by_me GET]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── POST: Update task status ─────────────────────────────────────────────────
router.post('/update-status', requireAuth, async (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ success: false, message: 'Missing fields' });

  try {
    await db.query('UPDATE tasks SET status=? WHERE id=?', [status, id]);
    if (req.io) req.io.emit('update_tasks');
    notifyDesktop();
    res.json({ success: true });
  } catch (err) {
    console.error('[update-status]', err);
    res.status(500).json({ success: false });
  }
});

// ─── POST: Update assignee ────────────────────────────────────────────────────
router.post('/update-assignee', requireAuth, async (req, res) => {
  const { taskId, newAssigneeId } = req.body;
  const adminId       = req.session.adminId;
  const sessionRole   = req.session.role;
  const sessionUserId = req.session.userId;

  try {
    if (newAssigneeId === 'all') {
      // Assign to ALL members
      const [tasks] = await db.query('SELECT * FROM tasks WHERE id=?', [taskId]);
      if (tasks.length > 0) {
        const task = tasks[0];
        await db.query('DELETE FROM tasks WHERE id=?', [taskId]);

        const [users] = await db.query('SELECT id FROM users WHERE admin_id=?', [adminId]);
        for (const user of users) {
          const isSelf =
            (sessionRole === 'admin' && user.id === adminId) ||
            (sessionRole !== 'admin' && user.id === sessionUserId);
          if (isSelf) continue;
          await db.query(
            `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OTHERS', ?)`,
            [task.admin_id, task.title, task.description, task.priority, task.due_date,
             user.id, task.assigned_by, task.who_assigned, task.status]
          );
        }
        // Also assign to admin (assigned_to = 0)
        await db.query(
          `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'OTHERS', ?)`,
          [task.admin_id, task.title, task.description, task.priority, task.due_date,
           task.assigned_by, task.who_assigned, task.status]
        );
      }
    } else if (String(newAssigneeId).startsWith('team_')) {
      // Assign to all team members
      const teamId = newAssigneeId.split('_')[1];
      const [tasks] = await db.query('SELECT * FROM tasks WHERE id=?', [taskId]);
      if (tasks.length > 0) {
        const task = tasks[0];
        await db.query('DELETE FROM tasks WHERE id=?', [taskId]);

        const [users] = await db.query(
          `SELECT u.id FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE u.admin_id=? AND r.team_id=? AND u.status='ACTIVE'`,
          [adminId, teamId]
        );
        for (const user of users) {
          const isSelf =
            (sessionRole === 'admin' && user.id === adminId) ||
            (sessionRole !== 'admin' && user.id === sessionUserId);
          if (isSelf) continue;
          await db.query(
            `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OTHERS', ?)`,
            [task.admin_id, task.title, task.description, task.priority, task.due_date,
             user.id, task.assigned_by, task.who_assigned, task.status]
          );
        }
      }
    } else {
      // Single member
      let finalAssignedTo = newAssigneeId;
      if (sessionRole === 'admin' && parseInt(newAssigneeId) === adminId) finalAssignedTo = 0;
      if ((sessionRole === 'user' || sessionRole === 'owner') &&
          (newAssigneeId === 'admin' || parseInt(newAssigneeId) === adminId)) {
        finalAssignedTo = 0;
      }

      let sectionValue = 'TASK';
      if ((sessionRole === 'admin' || sessionRole === 'owner') && parseInt(finalAssignedTo) !== 0) {
        sectionValue = 'OTHERS';
      }
      if (sessionRole !== 'admin' && sessionRole !== 'owner' &&
          parseInt(finalAssignedTo) !== parseInt(sessionUserId)) {
        sectionValue = 'OTHERS';
      }

      await db.query(
        `UPDATE tasks SET assigned_to=?, section=IF(status='COMPLETED', section, ?) WHERE id=?`,
        [finalAssignedTo, sectionValue, taskId]
      );
    }

if (req.io) req.io.emit('update_tasks');
    notifyDesktop();
    res.json({ success: true });
  } catch (err) {
    console.error('[update-assignee]', err);
    res.status(500).json({ success: false });
  }
});

// ─── POST: Delete single task ─────────────────────────────────────────────────
router.post('/delete-task/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id=?', [req.params.id]);
    if (req.io) req.io.emit('update_tasks');
    notifyDesktop();
    res.json({ success: true });
  } catch (err) {
    console.error('[delete-task]', err);
    res.status(500).json({ success: false });
  }
});

// ─── POST: Delete all completed tasks ────────────────────────────────────────
router.post('/delete-all-completed', requireAuth, async (req, res) => {
  const { role, userId, adminId } = req.session;
  try {
    if (role === 'admin') {
      await db.query(
        `DELETE FROM tasks WHERE admin_id=? AND who_assigned='admin' AND assigned_by=? AND assigned_to != 0 AND status='COMPLETED'`,
        [adminId, adminId]
      );
    } else if (role === 'owner') {
      await db.query(
        `DELETE FROM tasks WHERE admin_id=? AND who_assigned='owner' AND assigned_by=? AND assigned_to != ? AND status='COMPLETED'`,
        [adminId, userId, userId]
      );
    } else {
      await db.query(
        `DELETE FROM tasks WHERE who_assigned='user' AND assigned_by=? AND assigned_to != ? AND status='COMPLETED'`,
        [userId, userId]
      );
    }
    if (req.io) req.io.emit('update_tasks');
    notifyDesktop();
    res.json({ success: true });
  } catch (err) {
    console.error('[delete-all-completed]', err);
    res.status(500).json({ success: false });
  }
});

// ─── POST: Edit task ──────────────────────────────────────────────────────────
router.post('/edit-task', requireAuth, async (req, res) => {
  const { id, title, description, priority, due_date } = req.body;

  const fields = [];
  const values = [];

  if (title !== undefined && title !== null)       { fields.push('title=?');       values.push(title); }
  if (description !== undefined && description !== null) { fields.push('description=?'); values.push(description); }
  if (priority !== undefined && priority !== null) { fields.push('priority=?');    values.push(priority); }
  if (due_date !== undefined)                      { fields.push('due_date=?');    values.push(due_date || null); }

  if (fields.length === 0) return res.json({ success: true });

  values.push(id);

  try {
    await db.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id=?`, values);
    if (req.io) req.io.emit('update_tasks');
    notifyDesktop();
    res.json({ success: true });
  } catch (err) {
    console.error('[edit-task]', err);
    res.status(500).json({ success: false });
  }
});

export default router;