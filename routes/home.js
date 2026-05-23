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
        "SELECT name, label_changes, label_update FROM admins WHERE id=?", 
        [adminId]
        );

        if (adminRows.length > 0) adminName = adminRows[0].name;
        let customLabels = { CHANGES: 'Change', UPDATE: 'Update' }; // Default values

        if (adminRows.length > 0) {
            adminName = adminRows[0].name;
            // Database se naye labels uthao
            customLabels.CHANGES = adminRows[0].label_changes || 'Change';
            customLabels.UPDATE = adminRows[0].label_update || 'Update';
        }

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
                        assigned_by, assigned_to, who_assigned, repeat_type, completed_at
                 FROM tasks
                 WHERE admin_id=? AND assigned_to=0 AND who_assigned='admin'
                 ORDER BY due_date ASC`,
                [adminId]
            );
            taskRows.forEach(t => { t.is_self_task = true; });

            const [otherTaskRows] = await con.query(
                `SELECT t.id, t.title, t.description, t.priority, t.due_date, t.status, t.section,
                        t.assigned_by, t.assigned_to, t.who_assigned, t.repeat_type, t.completed_at,
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
                        t.assigned_by, t.assigned_to, t.who_assigned, t.repeat_type, t.completed_at,
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
                        assigned_by, assigned_to, who_assigned, repeat_type, completed_at
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
                        t.assigned_by, t.assigned_to, t.who_assigned, t.repeat_type, t.completed_at,
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

        return res.json({ success: true, tasks, members, adminName, role: sessionRole ,customLabels});

    } catch (err) {
        console.error('get-all-tasks error:', err);
        return res.status(500).json({ success: false });
    }
});

/* ───────────────────────────────────────────────
   UPDATE TASK STATUS  (checkbox → complete)
─────────────────────────────────────────────── */
router.post('/update-task-status', async (req, res) => {
    const { id, status } = req.body;
    try {
        // Fetch task FIRST before any update — need original due_date and repeat_type
        const [rows] = await con.query("SELECT * FROM tasks WHERE id=?", [id]);
        if (rows.length === 0) return res.status(404).json({ success: false });
        const task = rows[0];

        const completedAt = status === 'COMPLETED' ? new Date() : null;

if (status === 'OPEN') {
            // Restore correct section — self task goes to TASK, others go to OTHERS
            // Self task = admin assigned to himself (assigned_to=0, who_assigned='admin')
            //           OR user assigned to himself (assigned_by === assigned_to)
            const isSelfTask = (
                (task.who_assigned === 'admin' && parseInt(task.assigned_to) === 0) ||
                (task.who_assigned !== 'admin' && String(task.assigned_by) === String(task.assigned_to))
            );
            const restoredSection = isSelfTask ? 'TASK' : 'OTHERS';
            await con.query(
                "UPDATE tasks SET status=?, completed_at=?, section=? WHERE id=?",
                ['OPEN', null, restoredSection, id]
            );

            // Delete the exact next-date clone that was spawned on completion
            if (task.repeat_type && task.repeat_type !== 'none' && task.due_date) {
const rawDate = task.due_date instanceof Date
                    ? task.due_date.toISOString().split('T')[0]
                    : String(task.due_date).split('T')[0];
                const [y, m, d] = rawDate.split('-').map(Number);
                let ny = y, nm = m, nd = d;
                if (task.repeat_type === 'daily')   nd += 1;
                if (task.repeat_type === 'weekly')  nd += 7;
                if (task.repeat_type === 'monthly') nm += 1;
                const nextDate = new Date(ny, nm - 1, nd);
                const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,'0')}-${String(nextDate.getDate()).padStart(2,'0')}`;

                console.log('[UNCHECK DELETE] task.due_date:', task.due_date, '| nextDateStr:', nextDateStr, '| title:', task.title, '| assigned_to:', task.assigned_to, '| repeat_type:', task.repeat_type, '| admin_id:', task.admin_id);

                await con.execute(
                    `DELETE FROM tasks
                     WHERE admin_id=? AND title=? AND assigned_to=?
                       AND repeat_type=? AND status='OPEN'
                       AND DATE(due_date) = DATE(?) AND id != ?
                     LIMIT 1`,
                    [task.admin_id, task.title, task.assigned_to,
                     task.repeat_type, nextDateStr, id]
                );
            }

        } else {
            // COMPLETED — mark done
            await con.query(
                "UPDATE tasks SET status=?, completed_at=? WHERE id=?",
                ['COMPLETED', completedAt, id]
            );

            // Spawn next repeat task
            if (task.repeat_type && task.repeat_type !== 'none') {
                const baseDate = task.due_date ? new Date(task.due_date) : new Date();
                let nextDate = new Date(baseDate);
                if (task.repeat_type === 'daily')   nextDate.setDate(nextDate.getDate() + 1);
                if (task.repeat_type === 'weekly')  nextDate.setDate(nextDate.getDate() + 7);
                if (task.repeat_type === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                const nextDateStr = nextDate.toISOString().split('T')[0];

                const [existingClones] = await con.execute(
                    `SELECT id FROM tasks
                     WHERE admin_id=? AND title=? AND assigned_to=?
                       AND repeat_type=? AND status='OPEN' AND id != ?
                       AND DATE(due_date) = DATE(?)
                     LIMIT 1`,
                    [task.admin_id, task.title, task.assigned_to,
                     task.repeat_type, id, nextDateStr]
                );

                if (existingClones.length === 0) {
                    await con.query(
                        `INSERT INTO tasks
                         (admin_id, title, description, priority, due_date, status, section,
                          assigned_by, assigned_to, who_assigned, repeat_type)
                         VALUES (?, ?, ?, ?, ?, 'OPEN', 'TASK', ?, ?, ?, ?)`,
                        [task.admin_id, task.title, task.description, task.priority,
                         nextDateStr, task.assigned_by, task.assigned_to,
                         task.who_assigned, task.repeat_type]
                    );
                }

                await con.query(
                    "UPDATE task_templates SET last_spawned=? WHERE id=?",
                    [nextDateStr, id]
                ).catch(() => {});
            }
        }

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