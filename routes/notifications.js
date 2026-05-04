//notifications.js mobile
import express from 'express';
import fs from 'fs';
import FormData from 'form-data';
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

        // 1. Upload attachment to desktop so both servers can serve it from /uploads/
        let desktopFilename = null;
if (req.file) {
            try {
                const formData = new FormData();
                formData.append('attachment', fs.createReadStream(req.file.path), {
                    filename: req.file.filename,
                    contentType: req.file.mimetype,
                });

                const uploadRes = await fetch(`${DESKTOP_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: {
                        'x-mobile-secret': MOBILE_SECRET,
                        ...formData.getHeaders(),
                    },
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                    desktopFilename = uploadData.filename;
                    console.log('[Mobile] ✅ Attachment uploaded to desktop:', desktopFilename);
                } else {
                    console.error('[Mobile] ❌ Desktop rejected attachment upload:', uploadData);
                }
            } catch (uploadErr) {
                console.error('[Mobile] ❌ Attachment upload to desktop failed:', uploadErr.message);
            }
            // Clean up local temp file regardless
            try { fs.unlinkSync(req.file.path); } catch (_) {}
        }

        // 2. Insert into DB — store desktopFilename so the path works from desktop's /uploads/
        const addedBy = req.session.role === 'admin' ? req.session.adminId : req.session.userId;
        const whoAdded = req.session.role.toUpperCase();
        const [result] = await con.query(
            "INSERT INTO announcements (admin_id, added_by, who_added, role_id, title, description, attachment) VALUES (?,?,?,?,?,?,?)",
            [req.session.adminId, addedBy, whoAdded, role_id, title, description, desktopFilename]
        );

        // 3. Fetch full row with joins — same payload format for both desktop and mobile sockets
        const [rows] = await con.query(`
            SELECT a.*, 
            IF(a.role_id=0,'All Members',t.name) AS target_team_name,
            IF(a.role_id=0,'All Members',t.name) AS target_role,
            CASE WHEN a.who_added='ADMIN' THEN CONCAT(adm.name,' (Admin)')
                 WHEN a.who_added='OWNER' THEN CONCAT(usr.name,' (Admin)')
                 ELSE usr.name END AS added_by_name
            FROM announcements a
            LEFT JOIN teams t ON a.role_id = t.id
            LEFT JOIN admins adm ON a.added_by=adm.id AND a.who_added='ADMIN'
            LEFT JOIN users usr ON a.added_by=usr.id AND (a.who_added='USER' OR a.who_added='OWNER')
            WHERE a.id=? AND a.admin_id=?`, [result.insertId, req.session.adminId]);

        const ann = rows[0];
        if (!ann) return res.status(500).json({ success: false });

        // 4. Emit to mobile clients immediately
        if (req.io) req.io.emit('new_announcement', ann);

        // 5. Ping desktop → desktop fetches from DB and emits to its own socket clients
        fetch(`${DESKTOP_BASE_URL}/api/notify-announcement-add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-mobile-secret': MOBILE_SECRET, 'x-source': 'mobile' },
            body: JSON.stringify({ id: ann.id }),
        }).catch(err => console.error('[Mobile] notifyDesktop announcement_add failed:', err.message));

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

router.get('/delete-announcement/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Verify this announcement belongs to this admin before deleting
        const [check] = await con.query(
            "SELECT id FROM announcements WHERE id=? AND admin_id=?", [id, req.session.adminId]);
        if (!check.length) return res.status(403).json({ success: false, message: 'Not found' });

        await con.query("DELETE FROM announcements WHERE id=? AND admin_id=?", [id, req.session.adminId]);

        if (req.io) req.io.emit('delete_announcement', id);

        fetch('https://tms.thedesigns.live/api/notify-announcement-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-mobile-secret': 'tms_mobile_bridge_2026', 'x-source': 'mobile' },
            body: JSON.stringify({ id }),
        }).catch(err => console.error('[Mobile] notifyDesktop delete failed:', err.message));

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// EDIT ANNOUNCEMENT ROUTE (Bhai isse add kar le tabhi save hoga)
router.post('/edit-announcement/:id', upload.single('attachment'), async (req, res) => {
    try {
        const { title, description, role_id } = req.body;
        const announcementId = req.params.id;
        const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
        const MOBILE_SECRET = 'tms_mobile_bridge_2026';

        // Verify this announcement belongs to this admin
        const [check] = await con.query(
            "SELECT id FROM announcements WHERE id=? AND admin_id=?", [announcementId, req.session.adminId]);
        if (!check.length) return res.status(403).json({ success: false, message: 'Not found' });

        let desktopFilename = null;
if (req.file) {
            try {
                const formData = new FormData();
                formData.append('attachment', fs.createReadStream(req.file.path), {
                    filename: req.file.filename,
                    contentType: req.file.mimetype,
                });

                const uploadRes = await fetch(`${DESKTOP_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: {
                        'x-mobile-secret': MOBILE_SECRET,
                        ...formData.getHeaders(),
                    },
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                    desktopFilename = uploadData.filename;
                    console.log('[Mobile] ✅ Edit attachment uploaded to desktop:', desktopFilename);
                }
            } catch (uploadErr) {
                console.error('[Mobile] ❌ Edit attachment upload failed:', uploadErr.message);
            }
            // Clean up local temp file
            try { fs.unlinkSync(req.file.path); } catch (_) {}
        }

        if (desktopFilename) {
            await con.query(
                "UPDATE announcements SET title=?, description=?, role_id=?, attachment=? WHERE id=? AND admin_id=?",
                [title, description, role_id, desktopFilename, announcementId, req.session.adminId]);
        } else {
            await con.query(
                "UPDATE announcements SET title=?, description=?, role_id=? WHERE id=? AND admin_id=?",
                [title, description, role_id, announcementId, req.session.adminId]);
        }

        // Fetch fresh row with all joins for consistent socket payload
        const [rows] = await con.query(`
            SELECT a.*, 
            IF(a.role_id=0,'All Members',t.name) AS target_team_name,
            IF(a.role_id=0,'All Members',t.name) AS target_role,
            CASE WHEN a.who_added='ADMIN' THEN CONCAT(adm.name,' (Admin)')
                 WHEN a.who_added='OWNER' THEN CONCAT(usr.name,' (Admin)')
                 ELSE usr.name END AS added_by_name
            FROM announcements a
            LEFT JOIN teams t ON a.role_id = t.id
            LEFT JOIN admins adm ON a.added_by=adm.id AND a.who_added='ADMIN'
            LEFT JOIN users usr ON a.added_by=usr.id AND (a.who_added='USER' OR a.who_added='OWNER')
            WHERE a.id=? AND a.admin_id=?`, [announcementId, req.session.adminId]);

        const ann = rows[0];
        if (!ann) return res.status(500).json({ success: false });

        if (req.io) req.io.emit('edit_announcement', ann);

        fetch(`${DESKTOP_BASE_URL}/api/notify-announcement-edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-mobile-secret': MOBILE_SECRET, 'x-source': 'mobile' },
            body: JSON.stringify({ id: announcementId }),
        }).catch(err => console.error('[Mobile] notifyDesktop edit failed:', err.message));

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});
export default router;