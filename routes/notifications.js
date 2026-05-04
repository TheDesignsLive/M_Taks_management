//notifications.js mobile
import express from 'express';
import con from '../config/db.js';
import multer from 'multer';
import { notifyDesktop } from '../utils/notifyDesktop.js'; 

const router = express.Router();
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

router.get('/', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });
    const { adminId, role, userId, role_id, control_type } = req.session;
    const sessionUserId = (role === "admin" || role === "owner") ? 0 : userId;

    try {
        // EXACT PATTERN PERMISSIONS
        const canManageAnnounce = (role === 'admin' || control_type === 'ADMIN' || control_type === 'OWNER');
        const canManageMembers = (role === 'admin' || control_type === 'OWNER'); 

        const [teams] = await con.query("SELECT id, name FROM teams WHERE admin_id = ?", [adminId]);

        let annQuery = `
            SELECT a.*, IF(a.role_id=0, 'All Members', t.name) AS target_team_name,
            CASE WHEN a.who_added='ADMIN' THEN CONCAT(adm.name,' (Admin)') WHEN a.who_added='OWNER' THEN CONCAT(usr.name,' (Admin)') ELSE usr.name END AS added_by_name
            FROM announcements a LEFT JOIN teams t ON a.role_id = t.id
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

        res.json({ success: true, teams, announcements, memberRequests, deletionRequests, canManageAnnounce, canManageMembers });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ROUTERS FOR ACTIONS (You can create these in your auth or members router)
// I am calling: /api/notifications/process-member-request
router.get('/process-request/:action/:id', async (req, res) => {
    // pattern: action can be 'approve-member', 'reject-member', 'confirm-deletion', 'reject-deletion'
    // Logic will be your old app logic, just returning JSON here
    res.json({ success: true, message: "Request processed" });
});

router.post('/add-announcement', upload.single('attachment'), async (req, res) => {
    try {
        const { title, description, role_id } = req.body;
        const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
        const MOBILE_SECRET = 'tms_mobile_bridge_2026';

        // ✅ If attachment exists, upload to desktop first (same as profile pic pattern)
        let desktopFilename = null;
        if (req.file) {
            try {
                const formData = new FormData();
                const blob = new Blob([req.file.buffer || require('fs').readFileSync(req.file.path)], { type: req.file.mimetype });
                formData.append('attachment', blob, req.file.filename);

                const uploadRes = await fetch(`${DESKTOP_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: { 'x-mobile-secret': MOBILE_SECRET },
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) desktopFilename = uploadData.filename;
            } catch (uploadErr) {
                console.error('[Mobile] Attachment upload to desktop failed:', uploadErr.message);
            }
        }

        const [result] = await con.query(
            "INSERT INTO announcements (admin_id, added_by, who_added, role_id, title, description, attachment) VALUES (?,?,?,?,?,?,?)",
            [req.session.adminId, (req.session.role === 'admin' ? req.session.adminId : req.session.userId), req.session.role.toUpperCase(), role_id, title, description, desktopFilename]
        );

        // ✅ Notify desktop hub → desktop broadcasts new_announcement to all desktop clients
        fetch(`${DESKTOP_BASE_URL}/api/notify-announcement`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-mobile-secret': MOBILE_SECRET },
            body: JSON.stringify({ announcement_id: result.insertId })
        }).catch(err => console.log('[Mobile] Signal failed:', err.message));

// ✅ Also emit to mobile clients directly
        if (req.io) req.io.emit('new_announcement', { id: result.insertId, title, description, role_id, attachment: desktopFilename });

        notifyDesktop('announcement_add'); // ✅ PUSH TO DESKTOP

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.get('/delete-announcement/:id', async (req, res) => {
    const id = req.params.id;
    await con.query("DELETE FROM announcements WHERE id=?", [id]);
    if (req.io) req.io.emit('delete_announcement', id); // ✅ mobile clients
    notifyDesktop('announcement_delete', { id });        // ✅ PUSH TO DESKTOP
    res.json({ success: true });
});

// EDIT ANNOUNCEMENT ROUTE (Bhai isse add kar le tabhi save hoga)
router.post('/edit-announcement/:id', upload.single('attachment'), async (req, res) => {
    try {
        const { title, description, role_id } = req.body;
        const announcementId = req.params.id;
        const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
        const MOBILE_SECRET = 'tms_mobile_bridge_2026';

        // ✅ If new attachment, upload to desktop first (same as add pattern)
        let desktopFilename = null;
        if (req.file) {
            try {
                const formData = new FormData();
                const fs = await import('fs');
                const blob = new Blob([fs.readFileSync(req.file.path)], { type: req.file.mimetype });
                formData.append('attachment', blob, req.file.filename);
                const uploadRes = await fetch(`${DESKTOP_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: { 'x-mobile-secret': MOBILE_SECRET },
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) desktopFilename = uploadData.filename;
            } catch (uploadErr) {
                console.error('[Mobile] Edit attachment upload to desktop failed:', uploadErr.message);
            }
        }

        let query = "UPDATE announcements SET title=?, description=?, role_id=? WHERE id=?";
        let params = [title, description, role_id, announcementId];

        if (desktopFilename) {
            query = "UPDATE announcements SET title=?, description=?, role_id=?, attachment=? WHERE id=?";
            params = [title, description, role_id, desktopFilename, announcementId];
        }

        await con.query(query, params);
        if (req.io) req.io.emit('edit_announcement', { id: announcementId }); // ✅ mobile clients
        notifyDesktop('announcement_edit', { id: announcementId });            // ✅ PUSH TO DESKTOP
        res.json({ success: true, message: "Announcement updated!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

export default router;