import express from 'express';
import con from '../config/db.js';
import multer from 'multer';

const router = express.Router();

// Multer Setup for Attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

// =======================================================
// MAIN NOTIFICATIONS DATA
// =======================================================
router.get('/', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });
    console.log("=== Current Session Data ===");
    console.log(req.session); // Poora object ek saath

    const { adminId, role, userId, role_id } = req.session;
    const sessionUserId = (role === "admin" || role === "owner") ? 0 : userId;

    try {
        // 1. Roles & Admin Info
        const [roles] = await con.query("SELECT id, role_name FROM roles WHERE admin_id=?", [adminId]);

        // 2. Announcements Logic (Based on Permissions)
        let annQuery = "";
        let annParams = [adminId];

        if (role === "admin" || role === "owner") {
            annQuery = `
                SELECT a.*, IF(a.role_id=0,'All',r.role_name) AS target_role,
                CASE 
                    WHEN a.who_added='ADMIN' THEN CONCAT(adm.name,' (Admin)')
                    WHEN a.who_added='OWNER' THEN CONCAT(usr.name,' (Admin)')
                    ELSE usr.name
                END AS added_by_name
                FROM announcements a
                LEFT JOIN roles r ON a.role_id=r.id
                LEFT JOIN admins adm ON a.added_by=adm.id AND a.who_added='ADMIN'
                LEFT JOIN users usr ON a.added_by=usr.id AND (a.who_added='USER' OR a.who_added='OWNER')
                WHERE a.admin_id=? ORDER BY a.created_at DESC`;
        } else {
            annQuery = `
                SELECT a.*, 
                CASE 
                    WHEN a.who_added='ADMIN' THEN CONCAT(adm.name,' (Admin)')
                    ELSE usr.name
                END AS added_by_name
                FROM announcements a
                LEFT JOIN admins adm ON a.added_by=adm.id AND a.who_added='ADMIN'
                LEFT JOIN users usr ON a.added_by=usr.id AND a.who_added='USER'
                WHERE a.admin_id=? AND (a.role_id=? OR a.role_id=0)
                ORDER BY a.created_at DESC`;
            annParams.push(role_id);
        }
        const [announcements] = await con.query(annQuery, annParams);

        // 3. Member & Deletion Requests (Admin/Owner Only)
        let memberRequests = [];
        let deletionRequests = [];
        if (role === "admin" || role === "owner") {
            const commonReqQuery = `
                SELECT mr.*, r.role_name, u.name AS requested_by_name
                FROM member_requests mr
                JOIN roles r ON r.id=mr.role_id
                JOIN users u ON u.id=mr.requested_by
                WHERE mr.admin_id=? AND mr.status='PENDING' AND mr.request_type=?
                ORDER BY mr.created_at DESC`;
            
            const [mReqs] = await con.query(commonReqQuery, [adminId, 'ADD']);
            const [dReqs] = await con.query(commonReqQuery, [adminId, 'DELETE']);
            memberRequests = mReqs;
            deletionRequests = dReqs;
        }

        // 4. Mark as Seen
        for (let ann of announcements) {
            await con.query("INSERT IGNORE INTO announcement_seen (announcement_id, user_id, role, admin_id) VALUES (?,?,?,?)", 
            [ann.id, sessionUserId, role, adminId]);
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
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Add, Delete, Edit routes ka logic bhi res.json format mein rahega jaisa maine pehle diya tha.
export default router;