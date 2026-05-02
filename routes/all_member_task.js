// all_member_task.js Mobile Layout (mounted at /api/all-member-tasks)
import express from 'express';
import con from '../config/db.js';

const router = express.Router();

router.get('/data', async (req, res) => {
    if (!req.session.role) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        let users = [];
        let tasks = [];
        let controlType = null;
        let teamId = null;

        const selectedUser = req.query.user_id || 'all';
        const adminId = req.session.adminId;
        const sessionRole = req.session.role;
        const sessionUserId = req.session.userId;

        // ================= ADMIN NAME =================
        const [adminRows] = await con.query(
            "SELECT name FROM admins WHERE id=?",
            [adminId]
        );
        const adminName = adminRows.length > 0 ? adminRows[0].name : 'Admin';

        // ================= ROLE & TEAM FETCH =================
        if (sessionRole === "admin") {
            controlType = "OWNER";
        } else {
            const [uData] = await con.query(
                "SELECT role_id FROM users WHERE id=?",
                [sessionUserId]
            );

            if (uData.length === 0) {
                controlType = "NONE";
                teamId = null;
            } else {
                const roleId = uData[0].role_id;
                const [rData] = await con.query(
                    "SELECT control_type, team_id FROM roles WHERE id=?",
                    [roleId]
                );

                if (rData.length === 0) {
                    controlType = "NONE";
                    teamId = null;
                } else {
                    controlType = rData[0].control_type || "NONE";
                    teamId = rData[0].team_id || null;
                }
            }
        }

        // ================= USERS DROPDOWN (4-LAYER HIERARCHY) =================
        if (controlType === "OWNER") {
            if (sessionRole !== "admin") {
                users.push({ id: 0, name: adminName + ' (Admin)' });
            }
            const [userRows] = await con.query(`
                SELECT u.id, 
                CASE WHEN r.control_type = 'OWNER' THEN CONCAT(u.name, ' (Admin)') ELSE u.name END AS name 
                FROM users u 
                LEFT JOIN roles r ON u.role_id = r.id 
                WHERE u.admin_id=? AND u.status='ACTIVE' AND u.id != ?
            `, [adminId, sessionRole === 'admin' ? -1 : sessionUserId]);
            users = users.concat(userRows);

        } else if (controlType === "ADMIN") {
            const [userRows] = await con.query(`
                SELECT u.id, u.name 
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.admin_id = ?
                AND r.control_type IN ('ADMIN', 'PARTIAL', 'NONE')
                AND (r.team_id = ? OR (? IS NULL AND r.team_id IS NULL))
                AND u.status='ACTIVE'
                AND u.id != ?
            `, [adminId, teamId, teamId, sessionUserId]);
            users = userRows;

        } else if (controlType === "PARTIAL") {
            const [userRows] = await con.query(`
                SELECT u.id, u.name 
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.admin_id = ?
                AND r.control_type IN ('PARTIAL', 'NONE')
                AND (r.team_id = ? OR (? IS NULL AND r.team_id IS NULL))
                AND u.status='ACTIVE'
                AND u.id != ?
            `, [adminId, teamId, teamId, sessionUserId]);
            users = userRows;

        } else if (controlType === "NONE") {
            const [userRows] = await con.query(`
                SELECT u.id, u.name 
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.admin_id = ?
                AND r.control_type = 'NONE'
                AND (r.team_id = ? OR (? IS NULL AND r.team_id IS NULL))
                AND u.status='ACTIVE'
                AND u.id != ?
            `, [adminId, teamId, teamId, sessionUserId]);
            users = userRows;
        }

        // ================= TASK FETCH =================
let taskQuery = `
            SELECT t.*, 
            CASE 
                WHEN t.status = 'COMPLETED' THEN 'COMPLETED'
                ELSE t.section
            END AS computed_section,
            CASE 
                WHEN t.assigned_to = 0 THEN CONCAT(COALESCE(a.name, 'Admin'), ' (Admin)')
                WHEN r1.control_type = 'OWNER' THEN CONCAT(u1.name, ' (Admin)')
                ELSE COALESCE(u1.name, 'Unknown')
            END AS assigned_to_name,
            CASE 
                WHEN t.who_assigned = 'admin' THEN CONCAT(COALESCE(a.name, 'Admin'), ' (Admin)')
                WHEN t.who_assigned = 'owner' OR r2.control_type = 'OWNER' THEN CONCAT(u2.name, ' (Admin)')
                ELSE COALESCE(u2.name, 'Unknown')
            END AS assigned_by_name
            FROM tasks t
            LEFT JOIN users u1 ON t.assigned_to = u1.id
            LEFT JOIN roles r1 ON u1.role_id = r1.id
            LEFT JOIN users u2 ON t.assigned_by = u2.id
            LEFT JOIN roles r2 ON u2.role_id = r2.id
            LEFT JOIN admins a ON t.admin_id = a.id
            WHERE t.admin_id = ?
        `;

        let params = [adminId];

        // ================= FILTER =================
        if (controlType === "OWNER") {
            if (selectedUser !== 'all') {
                taskQuery += " AND t.assigned_to = ?";
                params.push(selectedUser);
            } else {
                if (sessionRole === "admin") {
                    taskQuery += " AND t.assigned_to != 0";
                } else {
                    taskQuery += " AND t.assigned_to != ?";
                    params.push(sessionUserId);
                }
            }
        } else {
            const allowedIds = users.map(u => u.id);

            if (allowedIds.length === 0) {
                taskQuery += " AND 1=0";
            } else {
                if (selectedUser !== 'all') {
                    if (allowedIds.includes(parseInt(selectedUser))) {
                        taskQuery += " AND t.assigned_to = ?";
                        params.push(selectedUser);
                    } else {
                        taskQuery += " AND 1=0";
                    }
                } else {
                    taskQuery += ` AND t.assigned_to IN (${allowedIds.map(() => '?').join(',')})`;
                    params.push(...allowedIds);
                    taskQuery += " AND t.assigned_to != ?";
                    params.push(sessionUserId);
                }
            }
        }

        taskQuery += " ORDER BY t.due_date ASC";

        const [taskRows] = await con.query(taskQuery, params);
        tasks = taskRows;

        return res.json({
            success: true,
            tasks,
            users,
            adminName,
            selected_user: selectedUser,
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Database Error' });
    }
});

export default router;