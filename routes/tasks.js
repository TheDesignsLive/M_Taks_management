// mobile/routes/tasks.js
// in following code task send notification to user to admin,
// user to all members,
// user to whole team,
// user to one emp in team
//and not send task notification admin to one user,
// admin to one team,
// admin to all member
import express from 'express';
import db from '../config/db.js';
import { notifyDesktop } from '../utils/notifyDesktop.js';
import PushNotifications from '@pusher/push-notifications-server';
import https from 'https';

// Fix: keep TLS connections alive to prevent "socket disconnected before TLS" errors
const httpsAgent = new https.Agent({ keepAlive: true });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

const router = express.Router();

const beamsClient = new PushNotifications({
    instanceId: '423440a8-1fc5-4373-8e6b-0085dccafc58',
    secretKey: '75EBE2088425312400AD5D15B2476EA23E3CEA61B7DE841FCA0A62E822C3135F',
});

const TMS_ICON = 'https://tms.thedesigns.live/images/tms_logo.jpeg';
const MOBILE_URL = 'https://m-tms.thedesigns.live';

// ─── Helper: get assigner display name ───────────────────────────────────────
async function getAssignerName(session) {
    try {
        if (session.role === 'admin') {
            const [rows] = await db.execute('SELECT name FROM admins WHERE id=?', [session.adminId]);
            return rows[0]?.name || 'Admin';
        } else {
            const [rows] = await db.execute('SELECT name FROM users WHERE id=?', [session.userId]);
            return rows[0]?.name || 'Someone';
        }
    } catch {
        return 'Someone';
    }
}

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
        // ADD TASK
        // ==============================
        router.post('/add-task', async (req, res) => {
            try {
                if (!req.session.role) return res.json({ success: false, message: 'Unauthorized' });

                const { title, description, date, priority, assignedTo, notifyUser } = req.body;
                const shouldNotify = notifyUser === true || notifyUser === 'true';
                const senderIsAdmin = req.session.role === 'admin';

const senderUniqueId = senderIsAdmin 
    ? `admin-${req.session.adminId}` 
    : `${req.session.userId}`;

                const assigned_by = req.session.role === 'admin' ? req.session.adminId : req.session.userId;
                const who_assigned = req.session.role;

let admin_id;
        if (req.session.role === 'admin') {

            admin_id = parseInt(req.session.adminId);

        } else {

            // For owner/user: always re-fetch admin_id fresh from DB (session value can be stale)
            const [rows] = await db.execute(
                'SELECT admin_id FROM users WHERE id = ?',
                [req.session.userId]
            );

            if (rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'User not found'
                });
            }

            admin_id = parseInt(rows[0].admin_id);

            // If DB admin_id is 0 or null, fall back to session adminId
            if (!admin_id && req.session.adminId) {
                admin_id = parseInt(req.session.adminId);
            }
        }

        // FINAL VALIDATION — confirm admin exists
        if (!admin_id || isNaN(admin_id)) {
            return res.status(400).json({
                success: false,
                message: 'Could not resolve admin'
            });
        }

        const [adminCheck] = await db.execute(
            'SELECT id FROM admins WHERE id = ?',
            [admin_id]
        );

        if (adminCheck.length === 0) {
            console.log('[Tasks] ❌ admin not found for id:', admin_id, '| role:', req.session.role, '| userId:', req.session.userId);
            return res.status(400).json({
                success: false,
                message: 'Admin not found. Please re-login.'
            });
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

        const taskTitle = title || 'No Title';
        let assignerName = '';
        if (shouldNotify) {
            assignerName = await getAssignerName(req.session);
        }

// ── TEAM ASSIGNMENT ──────────────────────────────────────────────────
if (typeof assignedTo === 'string' && assignedTo.startsWith('team_')) {

    const teamId = assignedTo.split('_')[1];

    // ✅ verify admin exists
    const [adminRows] = await db.execute(
        'SELECT id FROM admins WHERE id = ?',
        [admin_id]
    );

    if (adminRows.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid admin id'
        });
    }

    // ✅ verify team belongs to same company
    const [teamCheck] = await db.execute(
        'SELECT id FROM teams WHERE id = ? AND admin_id = ?',
        [teamId, admin_id]
    );
    if (teamCheck.length === 0) {
        return res.status(403).json({ success: false, message: 'Invalid team.' });
    }

    // ✅ get all users from selected team
const [users] = await db.execute(`
    SELECT u.id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.team_id = ?
    AND u.admin_id = ?
`, [teamId, admin_id]);

    if (users.length === 0) {
        return res.json({
            success: false,
            message: 'No users found in team'
        });
    }

    // ✅ insert task for every team member
    for (const user of users) {

        // skip self task for normal user
        if (
            req.session.role !== 'admin' &&
            parseInt(user.id) === parseInt(req.session.userId)
        ) {
            continue;
        }

        await db.execute(
            `INSERT INTO tasks
            (
                admin_id,
                title,
                description,
                priority,
                due_date,
                assigned_to,
                assigned_by,
                who_assigned,
                section,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OTHERS', 'OPEN')`,
            [
                admin_id,
                taskTitle,
                description || null,
                (priority || 'MEDIUM').toUpperCase(),
                finalDate,
                user.id,
                assigned_by,
                who_assigned
            ]
        );
    }

    req.io.emit('update_tasks');

// TEAM notification
    if (shouldNotify) {
        let interests = [];

// team
interests.push(`company-${req.session.adminId}-team-${teamId}`);


const pushPayload = {
    web: {
        notification: {
            title: taskTitle,
            body: assignerName,
        },
        data: { sender_id: senderUniqueId }
    },
    fcm: {
        notification: {
            title: taskTitle,
            body: assignerName,
        },
        data: {
            type: 'task',
            sender_id: senderUniqueId
        }
    },
    apns: {
        aps: {
            alert: {
                title: taskTitle,
                body: assignerName,
            },
            sound: 'default',
            badge: 1,
        },
        data: {
            type: 'task',
            sender_id: senderUniqueId
        }
    }
};

await beamsClient.publishToInterests(interests, pushPayload);
            
    } else {
        notifyDesktop('tasks', {});
    }

    return res.json({
        success: true,
        message: 'Team task assigned successfully'
    });
}

        // ── ALL MEMBERS ──────────────────────────────────────────────────────
        if (assignedTo === 'all') {
            const [users] = await db.execute('SELECT id FROM users WHERE admin_id=?', [admin_id]);
            const selfUserId = req.session.role !== 'admin' ? req.session.userId : null;

            for (const user of users) {
                if ((req.session.role === 'admin' && user.id === req.session.adminId) ||
                    (req.session.role !== 'admin' && user.id === req.session.userId)) continue;
                await db.execute(
                    `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OTHERS', 'OPEN')`,
                    [admin_id, taskTitle, description || null, (priority || 'MEDIUM').toUpperCase(), finalDate, user.id, assigned_by, who_assigned]
                );
            }
            // also insert for admin (assigned_to=0)
            await db.execute(
                `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
                 VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'OTHERS', 'OPEN')`,
                [admin_id, taskTitle, description || null, (priority || 'MEDIUM').toUpperCase(), finalDate, assigned_by, who_assigned]
            );

req.io.emit('update_tasks');

if (shouldNotify) {
                let interests = [];

interests.push(`company-${req.session.adminId}-all`);
interests.push(`admin-${req.session.adminId}`);

const pushPayload = {
    web: {
        notification: {
            title: taskTitle,
            body: assignerName,
        },
        data: { sender_id: senderUniqueId }
    },
    fcm: {
        notification: {
            title: taskTitle,
            body: assignerName,
        },
        data: {
            type: 'task',
            sender_id: senderUniqueId
        }
    },
   apns: {
    aps: {
        alert: {
            title: taskTitle,
            body: assignerName,
        },
        sound: 'default',
        badge: 1,
    },
    data: {
        type: 'task',
        sender_id: senderUniqueId
    }
}
};

await beamsClient.publishToInterests(interests, pushPayload);
            } else {
                notifyDesktop('tasks', {});
            }

            return res.json({ success: true, message: 'Task added successfully' });
        }

        // ── SELF ─────────────────────────────────────────────────────────────
        if (assignedTo === 'self') {
            finalAssignedTo = req.session.role === 'admin' ? 0 : req.session.userId;
            sectionValue = 'TASK';
        }

        // ── CROSS-COMPANY VALIDATION — single user assignment ────────────────
        // 0 = admin ka apna task, 'admin' = admin ko assign karna — dono valid hain
        if (finalAssignedTo !== 0 && finalAssignedTo !== 'admin' && assignedTo !== 'self') {
            const [userCheck] = await db.execute(
                'SELECT id FROM users WHERE id = ? AND admin_id = ?',
                [finalAssignedTo, admin_id]
            );
            if (userCheck.length === 0) {
                return res.status(403).json({ success: false, message: 'User does not belong to your company.' });
            }
        }

        // ── NORMAL INSERT (single user or admin) ────────────────────────────
        await db.execute(
            `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
            [admin_id, taskTitle, description || null, (priority || 'MEDIUM').toUpperCase(), finalDate, finalAssignedTo, assigned_by, who_assigned, sectionValue]
        );

req.io.emit('update_tasks');

// ── SINGLE USER NOTIFICATION ────────────────────────────────────────
        if (shouldNotify && assignedTo !== 'self') {
           let interests = [];

if (assignedTo === 'admin') {
    interests.push(`admin-user-${req.session.adminId}`);
} else {
    interests.push(`user-${assignedTo}`);
}

const pushPayload = {
    web: {
        notification: {
            title: taskTitle,
            body: assignerName,
        },
        data: { sender_id: senderUniqueId }
    },
    fcm: {
        notification: {
            title: taskTitle,
            body: assignerName,
        },
        data: {
            type: 'task',
            sender_id: senderUniqueId
        }
    },
    apns: {
        aps: {
            alert: {
                title: taskTitle,
                body: assignerName,
            },
            sound: 'default',
            badge: 1,
        },
        data: {
            type: 'task',
            sender_id: senderUniqueId
        }
    }
};

await beamsClient.publishToInterests(interests, pushPayload);
        } else {
            notifyDesktop('tasks', {});
        }

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

        const completedAt = status === 'COMPLETED' ? new Date() : null;
        await db.execute(
            'UPDATE tasks SET status = ?, section = ?, completed_at = ? WHERE id = ?',
            [status, section, completedAt, id]
        );

        

        req.io.emit('update_tasks');
        notifyDesktop();
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
        notifyDesktop();
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
        notifyDesktop();
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
        notifyDesktop();
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
        await db.execute('DELETE FROM task_templates WHERE id = ?', [req.params.id]);
        req.io.emit('update_tasks');
        notifyDesktop();
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ==============================
// DELETE COMPLETED TASKS
// ==============================
// NEW
router.post('/delete-completed-tasks', async (req, res) => {
    try {
        const { role, adminId, userId } = req.session;
        if (!role) return res.status(401).json({ success: false, message: 'Unauthorized' });

        let selectQuery, query, params;
        if (role === 'admin') {
            selectQuery = "SELECT id FROM tasks WHERE admin_id = ? AND assigned_to = 0 AND status = 'COMPLETED'";
            query = "DELETE FROM tasks WHERE admin_id = ? AND assigned_to = 0 AND status = 'COMPLETED'";
            params = [adminId];
        } else if (role === 'user' || role === 'owner') {
            selectQuery = "SELECT id FROM tasks WHERE admin_id = ? AND assigned_to = ? AND status = 'COMPLETED'";
            query = "DELETE FROM tasks WHERE admin_id = ? AND assigned_to = ? AND status = 'COMPLETED'";
            params = [adminId, userId];
        } else {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const [completedRows] = await db.query(selectQuery, params);
        const [result] = await db.query(query, params);
        if (result.affectedRows > 0) {
            if (completedRows.length > 0) {
                const ids = completedRows.map(r => r.id);
                const placeholders = ids.map(() => '?').join(',');
                await db.query(`DELETE FROM task_templates WHERE id IN (${placeholders})`, ids);
            }
            req.io.emit('update_tasks');
            notifyDesktop();
        }
        return res.json({
            success: result.affectedRows > 0,
            message: result.affectedRows > 0
                ? 'Completed tasks deleted successfully'
                : 'No completed tasks found to delete',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


export default router;