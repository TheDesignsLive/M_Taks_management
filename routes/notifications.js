// routes/notifications.js -
import express from 'express';
import con from '../config/db.js';
const router = express.Router();

// Get Notifications Data (Announcements + Requests)
router.get('/', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { adminId, role, userId, role_id } = req.session;
    const currentUserId = (role === "admin" || role === "owner") ? 0 : userId;

    try {
        // 1. Fetch Roles (Dropdown ke liye)
        const [roles] = await con.query("SELECT id, role_name FROM roles WHERE admin_id=?", [adminId]);

        // 2. Fetch Announcements
        let annQuery = "";
        let annParams = [adminId];

        if (role === "admin" || role === "owner") {
            annQuery = `SELECT a.*, IF(a.role_id=0,'All',r.role_name) AS target_role,
                        CASE WHEN a.who_added='ADMIN' THEN 'Admin' ELSE 'User' END as added_by_type
                        FROM announcements a LEFT JOIN roles r ON a.role_id=r.id
                        WHERE a.admin_id=? ORDER BY a.created_at DESC`;
        } else {
            annQuery = `SELECT a.*, 'User' as added_by_type FROM announcements a 
                        WHERE a.admin_id=? AND (a.role_id=? OR a.role_id=0) ORDER BY a.created_at DESC`;
            annParams.push(role_id);
        }
        const [announcements] = await con.query(annQuery, annParams);

        // 3. Member Requests (Admin Only)
        let memberRequests = [];
        let deletionRequests = [];
        if (role === "admin" || role === "owner") {
            const [mReqs] = await con.query(`SELECT mr.*, r.role_name, u.name as requested_by_name FROM member_requests mr 
                JOIN roles r ON r.id=mr.role_id JOIN users u ON u.id=mr.requested_by 
                WHERE mr.admin_id=? AND mr.status='PENDING' AND mr.request_type='ADD'`, [adminId]);
            memberRequests = mReqs;

            const [dReqs] = await con.query(`SELECT mr.*, r.role_name, u.name as requested_by_name FROM member_requests mr 
                JOIN roles r ON r.id=mr.role_id JOIN users u ON u.id=mr.requested_by 
                WHERE mr.admin_id=? AND mr.status='PENDING' AND mr.request_type='DELETE'`, [adminId]);
            deletionRequests = dReqs;
        }

        // 4. Mark as Seen logic (Silent)
        for (let ann of announcements) {
            await con.query("INSERT IGNORE INTO announcement_seen (announcement_id, user_id, role, admin_id) VALUES (?,?,?,?)", 
            [ann.id, currentUserId, role, adminId]);
        }

        res.json({
            success: true,
            roles,
            announcements,
            memberRequests,
            deletionRequests,
            sessionRole: role
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

export default router;