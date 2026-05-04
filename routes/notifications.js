import express from 'express';
import con from '../config/db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
const TEMP_DIR = path.join(__dirname, '..', 'public', 'notif_temp');

// Temp storage — file lands here, then forwarded to desktop
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        cb(null, TEMP_DIR);
    },
    filename: (req, file, cb) => cb(null, `notif_${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

function deleteTempFile(filename) {
    if (!filename) return;
    try {
        const p = path.join(TEMP_DIR, filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {}
}

async function forwardAttachmentToDesktop(localFilename) {
    try {
        const filePath = path.join(TEMP_DIR, localFilename);
        if (!fs.existsSync(filePath)) return null;

        const form = new FormData();
        form.append('attachment', fs.createReadStream(filePath), localFilename);

        const response = await fetch(`${DESKTOP_BASE_URL}/notifications/upload-attachment`, {
            method: 'POST',
            headers: { ...form.getHeaders(), 'x-mobile-secret': 'tms_mobile_bridge_2026' },
            body: form,
        });

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            deleteTempFile(localFilename);
            return null;
        }

        const data = await response.json();
        deleteTempFile(localFilename);
        return data.success ? data.filename : null;
    } catch (err) {
        console.error('[Notif] forward error:', err.message);
        deleteTempFile(localFilename);
        return null;
    }
}

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
        const tempFilename = req.file ? req.file.filename : null;

        let savedFilename = null;
        if (tempFilename) {
            savedFilename = await forwardAttachmentToDesktop(tempFilename);
            if (!savedFilename) return res.status(500).json({ success: false, message: 'Attachment upload failed.' });
        }

        const [result] = await con.query(
            "INSERT INTO announcements (admin_id, added_by, who_added, role_id, title, description, attachment) VALUES (?,?,?,?,?,?,?)",
            [req.session.adminId, (req.session.role === 'admin' ? req.session.adminId : req.session.userId),
             req.session.role.toUpperCase(), role_id, title, description, savedFilename]
        );

        fetch('https://tms.thedesigns.live/api/notify-announcement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-mobile-secret': 'tms_mobile_bridge_2026' },
            body: JSON.stringify({ announcement_id: result.insertId })
        }).catch(err => console.log("Signal failed", err.message));

        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/delete-announcement/:id', async (req, res) => {
    await con.query("DELETE FROM announcements WHERE id=?", [req.params.id]);
    res.json({ success: true });
});

// EDIT ANNOUNCEMENT ROUTE (Bhai isse add kar le tabhi save hoga)
router.post('/edit-announcement/:id', upload.single('attachment'), async (req, res) => {
    try {
        const { title, description, role_id } = req.body;
        const announcementId = req.params.id;
        const tempFilename = req.file ? req.file.filename : null;

        let savedFilename = null;
        if (tempFilename) {
            savedFilename = await forwardAttachmentToDesktop(tempFilename);
            if (!savedFilename) return res.status(500).json({ success: false, message: 'Attachment upload failed.' });
        }

        if (savedFilename) {
            await con.query("UPDATE announcements SET title=?, description=?, role_id=?, attachment=? WHERE id=?",
                [title, description, role_id, savedFilename, announcementId]);
        } else {
            await con.query("UPDATE announcements SET title=?, description=?, role_id=? WHERE id=?",
                [title, description, role_id, announcementId]);
        }

        res.json({ success: true, message: "Announcement updated!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

export default router;