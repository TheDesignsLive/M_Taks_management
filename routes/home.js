// home.js — Mobile API (mounted at /api/home in server.js)
import express from 'express';
import con from '../config/db.js';
import { notifyDesktop } from '../utils/notifyDesktop.js';

const router = express.Router();

/* ───────────────────────────────────────────────
   GET ALL TASKS  (used by Home.jsx on every refresh)
─────────────────────────────────────────────── */
router.get('/get-all-tasks', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });

    const adminId     = req.session.adminId;
    const sessionRole = req.session.role;
    const sessionUserId = req.session.userId;

    try {
        let tasks = [];
        let members = [];
        let adminName = 'Admin';

        // ── Admin name ──────────────────────────────
        const [adminRows] = await con.query(
            "SELECT name FROM admins WHERE id=?", [adminId]
        );
        if (adminRows.length > 0) adminName = adminRows[0].name;

        // ── Members list ────────────────────────────
        if (sessionRole === 'admin') {
            const [rows] = await con.query(
                "SELECT id, name FROM users WHERE admin_id=? AND status='ACTIVE'",
                [adminId]
            );
            members = rows;
        } else {
            const [rows] = await con.query(
                "SELECT id, name FROM users WHERE admin_id=? AND status='ACTIVE' AND id!=?",
                [adminId, sessionUserId]
            );
            members = rows;
        }

// ── Tasks ────────────────────────────────────
if (sessionRole === 'admin') {
            const [taskRows] = await con.query(
                `SELECT id, title, description, priority, due_date, status, section,
                        assigned_by, assigned_to, who_assigned, repeat_type
                 FROM tasks
                 WHERE admin_id=? AND assigned_to=0 AND who_assigned='admin'
                 ORDER BY due_date ASC`,
                [adminId]
            );
            taskRows.forEach(t => { t.is_self_task = true; });

            const [otherTaskRows] = await con.query(
                `SELECT t.id, t.title, t.description, t.priority, t.due_date, t.status, t.section,
                        t.assigned_by, t.assigned_to, t.who_assigned, t.repeat_type,
                        u.name AS assigned_by_name
                 FROM tasks t
                 JOIN users u ON t.assigned_by = u.id
                 WHERE t.admin_id=? AND t.assigned_to=0
                   AND (t.who_assigned='user' OR t.who_assigned='owner')
                 ORDER BY t.due_date ASC`,
                [adminId]
            );
            otherTaskRows.forEach(t => { t.is_self_task = false; });

            tasks = [...taskRows, ...otherTaskRows];

        } else {
            const [adminTasksRows] = await con.query(
                `SELECT t.id, t.title, t.description, t.priority, t.due_date, t.status, t.section,
                        t.assigned_by, t.assigned_to, t.who_assigned, t.repeat_type,
                        a.name AS assigned_by_name
                 FROM tasks t
                 JOIN admins a ON t.assigned_by = a.id
                 WHERE t.admin_id=? AND t.assigned_to=?
                 ORDER BY t.due_date ASC`,
                [adminId, sessionUserId]
            );
            adminTasksRows.forEach(t => { t.is_self_task = false; });

            const [userOwnTasksRows] = await con.query(
                `SELECT id, title, description, priority, due_date, status, section,
                        assigned_by, assigned_to, who_assigned, repeat_type
                 FROM tasks
                 WHERE admin_id=? AND assigned_to=?
                   AND (who_assigned='user' OR who_assigned='owner')
                   AND assigned_by=?
                 ORDER BY due_date ASC`,
                [adminId, sessionUserId, sessionUserId]
            );
            userOwnTasksRows.forEach(t => { t.is_self_task = true; });

            const [userToOthersTasksRows] = await con.query(
                `SELECT t.id, t.title, t.description, t.priority, t.due_date, t.status, t.section,
                        t.assigned_by, t.assigned_to, t.who_assigned, t.repeat_type,
                        u.name AS assigned_by_name
                 FROM tasks t
                 JOIN users u ON t.assigned_by = u.id
                 WHERE t.admin_id=? AND t.assigned_to=?
                   AND (t.who_assigned='user' OR t.who_assigned='owner')
                   AND t.assigned_by != ?
                 ORDER BY t.due_date ASC`,
                [adminId, sessionUserId, sessionUserId]
            );
            userToOthersTasksRows.forEach(t => { t.is_self_task = false; });

            tasks = [...userOwnTasksRows, ...adminTasksRows, ...userToOthersTasksRows];
        }

        return res.json({ success: true, tasks, members, adminName, role: sessionRole });

    } catch (err) {
        console.error('get-all-tasks error:', err);
        return res.status(500).json({ success: false });
    }
});

/* ───────────────────────────────────────────────
   UPDATE TASK STATUS  (checkbox → complete)
─────────────────────────────────────────────── */
/* ───────────────────────────────────────────────
   UPDATE TASK STATUS  (checkbox → complete)
─────────────────────────────────────────────── */
router.post('/update-task-status', async (req, res) => {
    const { id, status } = req.body;
    try {
        // Only update status — section stays unchanged so unchecking restores naturally
        await con.query("UPDATE tasks SET status=? WHERE id=?", [status, id]);

        // ── Repeat logic: spawn next task when completing a repeating task ──
        if (status === 'COMPLETED') {
            const [rows] = await con.query(
                "SELECT * FROM tasks WHERE id=?", [id]
            );
            if (rows.length > 0) {
                const task = rows[0];
                const repeatType = task.repeat_type;

                if (repeatType && repeatType !== 'none') {
                    // Calculate next due date
                    let baseDate = task.due_date
                        ? new Date(task.due_date)
                        : new Date();

                    // If base date is in the past, start from today
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (baseDate < today) baseDate = today;

                    let nextDate = new Date(baseDate);

                    if (repeatType === 'daily') {
                        nextDate.setDate(nextDate.getDate() + 1);
                    } else if (repeatType === 'weekly') {
                        nextDate.setDate(nextDate.getDate() + 7);
                    } else if (repeatType === 'monthly') {
                        nextDate.setMonth(nextDate.getMonth() + 1);
                    }

                    const nextDateStr = nextDate.toISOString().split('T')[0];

                    // Insert new task with same details, status OPEN, repeat_type carried over
                    await con.query(
                        `INSERT INTO tasks 
                         (admin_id, title, description, priority, due_date, status, section,
                          assigned_by, assigned_to, who_assigned, repeat_type)
                         VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)`,
                        [
                            task.admin_id,
                            task.title,
                            task.description,
                            task.priority,
                            nextDateStr,
                            task.section || 'TASK',
                            task.assigned_by,
                            task.assigned_to,
                            task.who_assigned,
                            repeatType,
                        ]
                    );

                    // Update the template's last_spawned date
                    await con.query(
                        "UPDATE task_templates SET last_spawned=? WHERE id=?",
                        [nextDateStr, id]
                    ).catch(() => {}); // non-critical, don't fail if template missing
                }
            }
        }
        // ── End repeat logic ──

        req.io.emit('update_tasks');
        notifyDesktop();
        return res.json({ success: true });
    } catch (err) {
        console.error('update-task-status error:', err);
        return res.status(500).json({ success: false });
    }
});

/* ───────────────────────────────────────────────
   UPDATE TASK SECTION  (move to section dropdown)
─────────────────────────────────────────────── */
router.post('/update-task-section', async (req, res) => {
    const { id, section } = req.body;
    try {
        await con.query("UPDATE tasks SET section=? WHERE id=?", [section, id]);
        req.io.emit('update_tasks');
           notifyDesktop(); 
        return res.json({ success: true });
    } catch (err) {
        console.error('update-task-section error:', err);
        return res.status(500).json({ success: false });
    }
});

/* ───────────────────────────────────────────────
   UPDATE TASK DATE
─────────────────────────────────────────────── */
router.post('/update-task-date', async (req, res) => {
    const { id, due_date } = req.body;
    try {
        await con.query("UPDATE tasks SET due_date=? WHERE id=?", [due_date, id]);
        req.io.emit('update_tasks');
           notifyDesktop(); 
        return res.json({ success: true });
    } catch (err) {
        console.error('update-task-date error:', err);
        return res.status(500).json({ success: false });
    }
});


/* ───────────────────────────────────────────────
   EDIT TASK DETAILS  (edit modal save)
─────────────────────────────────────────────── */
router.post('/edit-task-details', async (req, res) => {
    const { id, title, description, priority, due_date, assigned_to } = req.body;

    try {
        const adminId       = req.session.adminId;
        const sessionRole   = req.session.role;
        const sessionUserId = req.session.userId;

        let finalAssignedTo;
        let finalAssignedBy;
        let whoAssigned;

        if (sessionRole === 'admin') {
            finalAssignedBy = adminId;
            whoAssigned     = 'admin';
            finalAssignedTo = (assigned_to == null || assigned_to === '' || assigned_to == 0) ? 0 : assigned_to;
        } else {
            finalAssignedBy = sessionUserId;
            whoAssigned     = sessionRole;   // 'user' or 'owner'
            finalAssignedTo = (assigned_to == null || assigned_to === '' || assigned_to == 0) ? 0 : assigned_to;
        }

        await con.query(
            `UPDATE tasks
             SET title=?, description=?, priority=?, due_date=?, assigned_to=?
             WHERE id=?`,
            [title, description, priority, due_date || null, finalAssignedTo, id]
        );

        req.io.emit('update_tasks');
           notifyDesktop(); 
        return res.json({ success: true });

    } catch (err) {
        console.error('edit-task-details error:', err);
        return res.status(500).json({ success: false });
    }
});

/* ───────────────────────────────────────────────
   DELETE SINGLE TASK
─────────────────────────────────────────────── */
router.post('/delete-task/:id', async (req, res) => {
    try {
        await con.query("DELETE FROM tasks WHERE id=?", [req.params.id]);
        req.io.emit('update_tasks');
           notifyDesktop(); 
        return res.json({ success: true });
    } catch (err) {
        console.error('delete-task error:', err);
        return res.status(500).json({ success: false });
    }
});

/* ───────────────────────────────────────────────
   DELETE ALL COMPLETED TASKS
─────────────────────────────────────────────── */
router.post('/delete-completed-tasks', async (req, res) => {
    try {
        const adminId = req.session.adminId;
        await con.query(
            "DELETE FROM tasks WHERE admin_id=? AND status='COMPLETED'",
            [adminId]
        );
        req.io.emit('update_tasks');
        notifyDesktop();
        return res.json({ success: true });
    } catch (err) {
        console.error('delete-completed-tasks error:', err);
        return res.status(500).json({ success: false });
    }
});


export default router;