// Real mobile/routes/tasks.js
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

// ─── Helper: send push to a list of Beams interest strings ───────────────────
async function pushTaskNotification(ids, taskTitle, assignerName, adminId) {

    if (!ids || ids.length === 0) return;

    // remove duplicate ids
    ids = [...new Set(ids)];

    // normalize adminId to integer for safe comparison
    const normalizedAdminId = parseInt(adminId);
    if (!normalizedAdminId || isNaN(normalizedAdminId)) {
        console.warn('[Tasks] pushTaskNotification called with invalid adminId:', adminId);
        return;
    }

    // get only valid users of same company
    const validUserIds = [];
    const validAdminIds = [];

    for (const id of ids) {

        // admin notification — verify admin belongs to same company
        if (String(id).startsWith('admin_')) {

            const adminDbId = parseInt(String(id).replace('admin_', ''));

            // only allow if this admin is the company admin (same adminId)
            if (adminDbId === normalizedAdminId) {
                const [adminRows] = await db.execute(
                    'SELECT id FROM admins WHERE id = ?',
                    [adminDbId]
                );
                if (adminRows.length > 0) {
                    validAdminIds.push(`admin_${adminDbId}`);
                }
            }

            continue;
        }

        // normal user notification — must belong to same company (admin_id match)
        const [userRows] = await db.execute(
            'SELECT id FROM users WHERE id = ? AND admin_id = ?',
            [parseInt(id), normalizedAdminId]
        );

        if (userRows.length > 0) {
            validUserIds.push(String(id));
        }
    }

    const finalIds = [
        ...validUserIds,
        ...validAdminIds
    ];

    if (finalIds.length === 0) {
        console.log('[Tasks] No valid company users found for adminId:', normalizedAdminId, '| requested ids:', ids);
        return;
    }

    const pushTitle = '📋 New Task Assigned';

    const pushBody = `"${taskTitle}" — assigned by ${assignerName}`;

    const publishBody = {
        web: {
            notification: {
                title: pushTitle,
                body: pushBody,
                icon: TMS_ICON,
                deep_link: MOBILE_URL,
            },
        },

        fcm: {
            notification: {
                title: pushTitle,
                body: pushBody,
                image: TMS_ICON,
            },

            data: {
                url: MOBILE_URL,
                deep_link: MOBILE_URL,
                icon: TMS_ICON,
                type: 'task',
            },

            android: {
                priority: 'high',
                ttl: '86400s',

                notification: {
                    sound: 'default',
                    channelId: 'tms_tasks',
                    priority: 'high',
                    defaultSound: true,
                },
            },
        },

        apns: {
            aps: {
                alert: {
                    title: pushTitle,
                    body: pushBody,
                },

                sound: 'default',
                badge: 1,
            },

            data: {
                url: MOBILE_URL,
                type: 'task',
            },
        },
    };

    try {

        const chunkSize = 100;

        for (let i = 0; i < finalIds.length; i += chunkSize) {

            const chunk = finalIds.slice(i, i + chunkSize);

            await beamsClient.publishToUsers(
                chunk,
                publishBody
            );
        }

        console.log('[Tasks] 🔔 Push sent only to valid company users:', finalIds);

    } catch (err) {

        console.error(
            '[Tasks] ❌ Beams push failed:',
            err.message
        );
    }
}

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

        // notify all team members, exclude self
        let notifyIds = users
            .map(u => String(u.id))
            .filter(id => {
                // exclude self only for non-admin roles (owner and user have a userId)
                // admin has no userId row in users table, so never exclude for admin
                if (
                    (req.session.role === 'owner' || req.session.role === 'user') &&
                    parseInt(id) === parseInt(req.session.userId)
                ) return false;
                return true;
            });

        // owner or regular user assigned team task → also notify admin
        // admin assigned team task → do NOT add admin_ (admin doesn't notify themselves)
        if (req.session.role === 'owner' || req.session.role === 'user') {
            notifyIds.push(`admin_${admin_id}`);
        }

        // remove duplicates
        notifyIds = [...new Set(notifyIds)];

        if (notifyIds.length > 0) {
            console.log('[Tasks] Team notify ids:', notifyIds);

            // mobile push (Beams publishToUsers)
            pushTaskNotification(
                notifyIds,
                taskTitle,
                assignerName,
                admin_id
            ).catch(console.error);

            // desktop socket refresh — always trigger so users don't need to refresh
            const desktopInterests = notifyIds.filter(id => !String(id).startsWith('admin_'));
            notifyDesktop('tasks', {
                interests: desktopInterests,
                taskTitle,
                assignerName
            });
        } else {
            notifyDesktop('tasks', {});
        }
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
                const notifyIds = [];

                // notify all users of this company, skip self (only relevant for user/owner role)
                const selfUserId = req.session.role === 'admin' ? null : req.session.userId;

                for (const user of users) {
                    if (selfUserId !== null && parseInt(user.id) === parseInt(selfUserId)) continue;
                    notifyIds.push(String(user.id));
                }

                // owner or regular user assigned to all → also notify admin
                // admin assigned to all → do NOT add admin_ (admin doesn't notify themselves)
                if (req.session.role === 'owner' || req.session.role === 'user') {
                    notifyIds.push(`admin_${admin_id}`);
                }

                if (notifyIds.length > 0) {
                    console.log('[Tasks] All-members notify ids:', notifyIds);
                    // mobile push (Beams publishToUsers — company-isolated)
                    pushTaskNotification(
                        notifyIds,
                        taskTitle,
                        assignerName,
                        admin_id
                    ).catch(() => {});
                    // desktop socket refresh — always send numeric user ids
                    const desktopInterests = notifyIds.filter(id => !String(id).startsWith('admin_'));
                    notifyDesktop('tasks', {
                        interests: desktopInterests,
                        taskTitle,
                        assignerName
                    });
                } else {
                    notifyDesktop('tasks', {});
                }
            } else {
                notifyDesktop('tasks', {});
            }

            return res.json({ success: true, message: 'Task added successfully' });
        }

        // ── SELF ─────────────────────────────────────────────────────────────
        if (assignedTo === 'self') {
            finalAssignedTo = req.session.role === 'admin' ? 0 : req.session.userId;
            sectionValue = 'TASK';
            // self-assign → no notification needed
        }

        // ── NORMAL INSERT (single user or admin) ────────────────────────────
        await db.execute(
            `INSERT INTO tasks (admin_id, title, description, priority, due_date, assigned_to, assigned_by, who_assigned, section, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
            [admin_id, taskTitle, description || null, (priority || 'MEDIUM').toUpperCase(), finalDate, finalAssignedTo, assigned_by, who_assigned, sectionValue]
        );

req.io.emit('update_tasks');

// Push notification for single user assignment
        if (shouldNotify && assignedTo !== 'self') {
            let interests = [];

            if (assignedTo === 'admin') {
                // owner/user assigning task to admin — notify only this company's admin
                // admin assigning to themselves (admin) — skip notification
                if (req.session.role !== 'admin') {
                    interests = [`admin_${admin_id}`];
                }

            } else if (!isNaN(parseInt(assignedTo))) {
                // assigned to a specific user by numeric ID
                const targetId = parseInt(assignedTo);

                // for owner/user: selfUserId is their own userId — skip notifying self
                // for admin: selfUserId is null (admin has no row in users table)
                const selfUserId = req.session.role === 'admin'
                    ? null
                    : parseInt(req.session.userId);

                // only notify if target is not the assigner themselves
                if (selfUserId === null || targetId !== selfUserId) {
                    // verify target user belongs to this company
                    const [targetCheck] = await db.execute(
                        'SELECT id FROM users WHERE id = ? AND admin_id = ?',
                        [targetId, parseInt(admin_id)]
                    );
                    if (targetCheck.length > 0) {
                        interests = [String(targetId)];
                    } else {
                        console.log('[Tasks] Single-user target not found in company — targetId:', targetId, '| admin_id:', admin_id);
                    }
                }

                // owner or regular user assigned to someone → also notify admin
                // admin assigned to someone → do NOT add admin_ (admin doesn't notify themselves)
                if (req.session.role === 'owner' || req.session.role === 'user') {
                    if (interests.length > 0) {
                        interests.push(`admin_${admin_id}`);
                    }
                }

                console.log('[Tasks] Single-user role:', req.session.role, '| admin_id:', admin_id, '| notify ids:', interests);
            }

            if (interests.length > 0) {
                console.log('[Tasks] Single-user notify ids:', interests);
                // mobile push (Beams publishToUsers — only exact persons)
                pushTaskNotification(
                    interests,
                    taskTitle,
                    assignerName,
                    admin_id
                ).catch(err => console.error('[Tasks] Single push error:', err.message));
                // desktop socket refresh — numeric user ids only
                const desktopInterests = interests.filter(id => !String(id).startsWith('admin_'));
                notifyDesktop('tasks', {
                    interests: desktopInterests,
                    taskTitle,
                    assignerName
                });
            } else {
                // still trigger desktop socket so assigned user's screen refreshes
                notifyDesktop('tasks', {});
            }
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
        await db.execute('UPDATE tasks SET status = ?, section = ? WHERE id = ?', [status, section, id]);
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