import express from 'express';
import con from '../config/db.js';
import multer from 'multer';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

// MAIN DATA FETCH ROUTE
router.get('/', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });

    const { adminId, role, userId, role_id, control_type } = req.session;
    const sessionUserId = (role === "admin" || role === "owner") ? 0 : userId;

    try {
        // PERMISSIONS PATTERN
        const canManageAnnounce = (role === 'admin' || control_type === 'OWNER' || control_type === 'ADMIN');
        const canManageMembers = (role === 'admin' || control_type === 'OWNER'); 

        const [teams] = await con.query("SELECT id, name FROM teams WHERE admin_id = ?", [adminId]);

        let annQuery = `
            SELECT a.*, 
            IF(a.role_id=0, 'All Members', t.name) AS target_team_name,
            CASE 
                WHEN a.who_added='ADMIN' THEN CONCAT(adm.name,' (Admin)')
                WHEN a.who_added='OWNER' THEN CONCAT(usr.name,' (Admin)')
                ELSE usr.name
            END AS added_by_name
            FROM announcements a
            LEFT JOIN teams t ON a.role_id = t.id
            LEFT JOIN admins adm ON a.added_by=adm.id AND a.who_added='ADMIN'
            LEFT JOIN users usr ON a.added_by=usr.id AND (a.who_added='USER' OR a.who_added='OWNER')
            WHERE a.admin_id=? `;
        
        let annParams = [adminId];
        
        if (!canManageAnnounce) {
            annQuery += ` AND (a.role_id = (SELECT team_id FROM roles WHERE id=?) OR a.role_id=0) `;
            annParams.push(role_id);
        }
        annQuery += ` ORDER BY a.created_at DESC`;
        const [announcements] = await con.query(annQuery, annParams);

        let memberRequests = [];
        let deletionRequests = [];
        if (canManageMembers) {
            const [mReqs] = await con.query(`SELECT mr.*, r.role_name, u.name AS requested_by_name FROM member_requests mr JOIN roles r ON r.id=mr.role_id JOIN users u ON u.id=mr.requested_by WHERE mr.admin_id=? AND mr.status='PENDING' AND mr.request_type='ADD' ORDER BY mr.created_at DESC`, [adminId]);
            const [dReqs] = await con.query(`SELECT mr.*, r.role_name, u.name AS requested_by_name FROM member_requests mr JOIN roles r ON r.id=mr.role_id JOIN users u ON u.id=mr.requested_by WHERE mr.admin_id=? AND mr.status='PENDING' AND mr.request_type='DELETE' ORDER BY mr.created_at DESC`, [adminId]);
            memberRequests = mReqs;
            deletionRequests = dReqs;
        }

        for (let ann of announcements) {
            await con.query("INSERT IGNORE INTO announcement_seen (announcement_id, user_id, role, admin_id) VALUES (?,?,?,?)", 
            [ann.id, sessionUserId, role, adminId]);
        }

        res.json({
            success: true,
            teams,
            announcements,
            memberRequests,
            deletionRequests,
            canManageAnnounce,
            canManageMembers,
            session: { role, role_id, control_type }
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ADD ANNOUNCEMENT (POST)
router.post('/add-announcement', upload.single('attachment'), async (req, res) => {
    try {
        const { title, description, role_id } = req.body;
        const { adminId, role, userId } = req.session;
        const attachment = req.file ? req.file.filename : null;
        const addedBy = role === 'admin' ? adminId : userId;

        const [result] = await con.query(
            "INSERT INTO announcements (admin_id, added_by, who_added, role_id, title, description, attachment) VALUES (?,?,?,?,?,?,?)",
            [adminId, addedBy, role.toUpperCase(), role_id, title, description, attachment]
        );

        const [newAnn] = await con.query(`SELECT a.*, IF(a.role_id=0,'All',t.name) as target_team_name FROM announcements a LEFT JOIN teams t ON a.role_id=t.id WHERE a.id=?`, [result.insertId]);
        
        if (req.io) req.io.emit('new_announcement', newAnn[0]);
        res.json({ success: true, announcement: newAnn[0] });
    } catch (err) { res.status(500).json({ success: false }); }
});

export default router;