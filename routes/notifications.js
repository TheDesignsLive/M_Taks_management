//notifications.js mobile
import express from 'express';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import con from '../config/db.js';
import multer from 'multer';
import { notifyDesktop } from '../utils/notifyDesktop.js';
import PushNotifications from '@pusher/push-notifications-server';

const router = express.Router();
const beamsClient = new PushNotifications({
    instanceId: '423440a8-1fc5-4373-8e6b-0085dccafc58',
    secretKey: '75EBE2088425312400AD5D15B2476EA23E3CEA61B7DE841FCA0A62E822C3135F',
});

// ✅ Ensure temp upload dir exists on mobile server
const TEMP_UPLOAD_DIR = 'public/uploads';
if (!fs.existsSync(TEMP_UPLOAD_DIR)) fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname)
});
const upload = multer({ storage });

router.get('/', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });
    const { adminId, role, userId, role_id, control_type } = req.session;
    const sessionUserId = (role === "admin" || role === "owner") ? 0 : userId;

    try {
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

res.json({ success: true, teams, announcements, memberRequests, deletionRequests, canManageAnnounce, canManageMembers, userRoleId: role_id || null, adminId });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/process-request/:action/:id', async (req, res) => {
    res.json({ success: true, message: "Request processed" });
});

router.post('/add-announcement', upload.single('attachment'), async (req, res) => {
    try {
        const { title, description, role_id } = req.body;
        const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
        const MOBILE_SECRET = 'tms_mobile_bridge_2026';

        let desktopFilename = null;
if (req.file) {
    try {
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Data = fileBuffer.toString('base64');

        const uploadRes = await fetch(`${DESKTOP_BASE_URL}/upload-attachment-base64`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-mobile-secret': MOBILE_SECRET,
            },
            body: JSON.stringify({
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                data: base64Data,
            }),
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success) {
            desktopFilename = uploadData.filename;
            console.log('[Mobile] ✅ Attachment uploaded to desktop:', desktopFilename);
        } else {
            console.error('[Mobile] ❌ Desktop rejected:', uploadData);
        }
    } catch (uploadErr) {
        console.error('[Mobile] ❌ Attachment upload failed:', uploadErr.message);
    }
    try { fs.unlinkSync(req.file.path); } catch (_) {}
}

        const addedBy = req.session.role === 'admin' ? req.session.adminId : req.session.userId;
        const whoAdded = req.session.role.toUpperCase();
        const [result] = await con.query(
            "INSERT INTO announcements (admin_id, added_by, who_added, role_id, title, description, attachment) VALUES (?,?,?,?,?,?,?)",
            [req.session.adminId, addedBy, whoAdded, role_id, title, description, desktopFilename]
        );

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

        if (req.io) req.io.emit('new_announcement', ann);

const senderIsAdmin = req.session.role === 'admin';
const senderUserId = senderIsAdmin ? null : req.session.userId;

let interests = [];

if (senderIsAdmin) {
    // Admin sends → broad channel (admin doesn't subscribe here → no self-notification)
    if (parseInt(role_id) === 0) {
        interests.push(`company-${req.session.adminId}-all`);
        interests.push(`admin-${req.session.adminId}`);
    } else {
        interests.push(`company-${req.session.adminId}-team-${role_id}`);
        interests.push(`admin-${req.session.adminId}`);
    }
} else {
    // User/Owner sends → target individual user-ids, exclude sender
    let targetUsers = [];
    if (parseInt(role_id) === 0) {
       interests.push(`company-${req.session.adminId}-all`);
       interests.push(`admin-${req.session.adminId}`);
    } else {
     interests.push(`company-${req.session.adminId}-team-${role_id}`);
     interests.push(`admin-${req.session.adminId}`);
    }
    
}

console.log('[Beams] Sending to interests:', interests);
const chunkSize = 100;
const interestChunks = [];
for (let i = 0; i < interests.length; i += chunkSize) {
    interestChunks.push(interests.slice(i, i + chunkSize));
}
// PUSH NOTIFICATION — web + fcm (Android) + apns (iOS) for app-closed delivery
        const pushTitle = ann.title || 'New Announcement';
        const pushBody  = ann.description || '';
        const pushIcon  = 'https://tms.thedesigns.live/images/tms_logo.jpeg';
        const pushUrl   = 'https://m-tms.thedesigns.live';

try {
            const pushPayload = {
                web: {
                    notification: {
                        title: pushTitle,
                        body: pushBody,
                        icon: pushIcon,
                        deep_link: pushUrl,
                    },
                },
                fcm: {
                    notification: {
                        title: pushTitle,
                        body: pushBody,
                        image: pushIcon,
                    },
                    data: {
                        url: pushUrl,
                        type: 'announcement',
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
                        url: pushUrl,
                        type: 'announcement',
                    },
                },
            };

            for (const chunk of interestChunks) {
                if (chunk.length === 0) continue;
                await beamsClient.publishToInterests(chunk, pushPayload);
            }
            // Admin/Owner ko user-based send karo (self exclude)
            console.log('[Mobile] 🔔 Push sent for announcement:', ann.id, '→ interests:', interests);
        } catch (pushErr) {
            console.error('[Mobile] ❌ Beams push failed:', pushErr.message);
        }
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

router.post('/edit-announcement/:id', upload.single('attachment'), async (req, res) => {
    try {
        const { title, description, role_id } = req.body;
        const announcementId = req.params.id;
        const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
        const MOBILE_SECRET = 'tms_mobile_bridge_2026';

        const [check] = await con.query(
            "SELECT id FROM announcements WHERE id=? AND admin_id=?", [announcementId, req.session.adminId]);
        if (!check.length) return res.status(403).json({ success: false, message: 'Not found' });

        let desktopFilename = null;
        if (req.file) {
            try {
                const fileBuffer = fs.readFileSync(req.file.path);

                const formData = new FormData();
                formData.append('attachment', fileBuffer, {
                    filename: req.file.filename,
                    contentType: req.file.mimetype,
                    knownLength: fileBuffer.length,
                });

                const uploadRes = await fetch(`${DESKTOP_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: {
                        'x-mobile-secret': MOBILE_SECRET,
                        ...formData.getHeaders(),
                    },
                    body: formData,
                });

                if (!uploadRes.ok) {
                    console.error('[Mobile] ❌ Desktop upload HTTP error:', uploadRes.status, uploadRes.statusText);
                } else {
                    const uploadData = await uploadRes.json();
                    if (uploadData.success) {
                        desktopFilename = uploadData.filename;
                        console.log('[Mobile] ✅ Edit attachment uploaded to desktop:', desktopFilename);
                    } else {
                        console.error('[Mobile] ❌ Desktop rejected:', uploadData);
                    }
                }
            } catch (uploadErr) {
                console.error('[Mobile] ❌ Edit attachment upload failed:', uploadErr.message);
            }
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