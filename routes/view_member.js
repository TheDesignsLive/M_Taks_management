// routes/view_member.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';
import con from '../config/db.js';
import { notifyDesktop } from '../utils/notifyDesktop.js';

const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── MULTER CONFIG (temp folder — image forwarded to desktop like profile.js) ─
const TEMP_DIR = path.join(__dirname, '..', 'public', 'images');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        cb(null, TEMP_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `member_${Date.now()}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedMime = /^image\/(jpeg|jpg|png|gif|webp)$/;
    const allowedExt = /\.(jpeg|jpg|png|gif|webp)$/i;
    if (allowedMime.test(file.mimetype) && allowedExt.test(file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── HELPER: forward member image to desktop server (same as profile.js) ──────
async function forwardMemberImageToDesktop(localFilename) {
    try {
        const filePath = path.join(TEMP_DIR, localFilename);
        if (!fs.existsSync(filePath)) {
            console.error('[view_member] Temp file not found:', filePath);
            return null;
        }
        const form = new FormData();
        form.append('profile_pic', fs.createReadStream(filePath), localFilename);

        const response = await fetch(`${DESKTOP_BASE_URL}/profile/upload-image`, {
            method: 'POST',
            headers: {
                ...form.getHeaders(),
                'x-mobile-secret': 'tms_mobile_bridge_2026',
            },
            body: form,
        });

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error('[view_member] Desktop returned non-JSON:', text.substring(0, 200));
            safeDeleteFile(localFilename);
            return null;
        }

        const data = await response.json();
        safeDeleteFile(localFilename); // delete temp file after forwarding
        if (data.success) {
            console.log('[view_member] Image forwarded to desktop:', data.filename);
            return data.filename;
        } else {
            console.error('[view_member] Desktop upload failed:', data.message);
            return null;
        }
    } catch (err) {
        console.error('[view_member] forwardMemberImageToDesktop error:', err.message);
        safeDeleteFile(localFilename);
        return null;
    }
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (!req.session?.role) {
        return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }
    next();
}

// ─── HELPER: safe delete file ─────────────────────────────────────────────────
function safeDeleteFile(filename) {
    if (!filename) return;
    try {
        const filePath = path.join(__dirname, '..', 'public', 'images', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
        console.error('[view_member] file delete error:', err.message);
    }
}

// ─── HELPER: get adminId based on session ────────────────────────────────────
async function getAdminId(session) {
    if (session.role === 'admin') return session.adminId;
    const [rows] = await con.query('SELECT admin_id FROM users WHERE id=?', [session.userId]);
    return rows.length ? rows[0].admin_id : null;
}

// ─── HELPER: get control_type ────────────────────────────────────────────────
async function getControlInfo(session) {
    if (session.role === 'admin') return { controlType: 'ADMIN', teamId: null };
    const [rows] = await con.query(
        'SELECT r.control_type, r.team_id FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id=?',
        [session.userId]
    );
    if (!rows.length) return { controlType: 'NONE', teamId: null };
    return { controlType: rows[0].control_type, teamId: rows[0].team_id };
}

// ════════════════════════════════════════════════════════════
// GET /api/view_member  — fetch all members, roles, teams
// ════════════════════════════════════════════════════════════
router.get('/', requireAuth, async (req, res) => {
    try {
        const adminId = await getAdminId(req.session);
        if (!adminId) return res.status(403).json({ success: false, message: 'Admin not found.' });

        const { controlType, teamId } = await getControlInfo(req.session);

        let users = [], roles = [], teams = [];

        if (controlType === 'ADMIN' || controlType === 'OWNER' || req.session.role === 'admin') {
            const [teamRows] = await con.query(
                'SELECT id, name FROM teams WHERE admin_id=? ORDER BY name ASC', [adminId]
            );
            teams = teamRows;

            const [roleRows] = await con.query(
                'SELECT id, role_name, team_id FROM roles WHERE admin_id=?', [adminId]
            );
            roles = roleRows;

            const [userRows] = await con.query(
                `SELECT u.*, r.role_name, r.team_id as role_team_id
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.admin_id=?
                 ORDER BY u.name ASC`,
                [adminId]
            );
            users = userRows;
        } else if (teamId) {
            const [teamRows] = await con.query('SELECT id, name FROM teams WHERE id=?', [teamId]);
            teams = teamRows;

            const [roleRows] = await con.query(
                'SELECT id, role_name, team_id FROM roles WHERE admin_id=? AND team_id=?',
                [adminId, teamId]
            );
            roles = roleRows;

            const [userRows] = await con.query(
                `SELECT u.*, r.role_name, r.team_id as role_team_id
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.admin_id=? AND r.team_id=?
                 ORDER BY u.name ASC`,
                [adminId, teamId]
            );
            users = userRows;
        } else {
            const [userRows] = await con.query(
                `SELECT u.*, r.role_name, r.team_id as role_team_id
                 FROM users u
                 JOIN roles r ON u.role_id = r.id
                 WHERE u.id=?`,
                [req.session.userId]
            );
            users = userRows;
        }

    return res.json({
            success: true,
            users,
            roles,
            teams,
            sessionRole: req.session.role,
            sessionUserId: req.session.userId || null,
            sessionControlType: req.session.control_type || 'NONE',
        });

    } catch (err) {
        console.error('[view_member GET]', err);
        return res.status(500).json({ success: false, message: 'Error fetching members.' });
    }
});

// ════════════════════════════════════════════════════════════
// POST /api/view_member/add  — add a new member
// ════════════════════════════════════════════════════════════
router.post('/add', requireAuth, (req, res) => {
    upload.single('profile_pic')(req, res, async (uploadErr) => {
        if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });

const { name, email, phone, password, role_id, team_id } = req.body;
        const tempPic = req.file ? req.file.filename : null;

        if (!name || !email || !password || !role_id) {
            if (tempPic) safeDeleteFile(tempPic);
            return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
        }

        try {
            const adminId = await getAdminId(req.session);
            if (!adminId) {
                if (tempPic) safeDeleteFile(tempPic);
                return res.status(403).json({ success: false, message: 'Admin not found.' });
            }

            // ── Forward image to desktop server (same as profile.js) ──────
            let profilePic = null;
            if (tempPic) {
                profilePic = await forwardMemberImageToDesktop(tempPic);
                if (!profilePic) {
                    return res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
                }
            }
// ── CHECK: admin or owner → insert into users
            //           any other user  → insert into member_requests
            // Re-read control_type fresh from DB (don't trust stale session value)
            const sessionRole = req.session.role; // 'admin' | 'owner' | 'user'

            let freshControlType = req.session.control_type; // fallback
            if (req.session.userId) {
                const [ctRows] = await con.query(
                    'SELECT r.control_type FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id=?',
                    [req.session.userId]
                );
                if (ctRows.length) freshControlType = ctRows[0].control_type;
            }

            const canDirectInsert =
                sessionRole === 'admin' ||
                sessionRole === 'owner' ||
                freshControlType === 'OWNER';

            const hashed = await bcrypt.hash(password, 10);

            if (canDirectInsert) {
                // ── DIRECT INSERT INTO USERS ──────────────────────────────
                const [existing] = await con.query('SELECT id FROM users WHERE email=?', [email]);
                if (existing.length) {
                    if (profilePic) safeDeleteFile(profilePic);
                    return res.status(400).json({ success: false, message: 'Email already exists.' });
                }

                await con.query(
                    'INSERT INTO users (admin_id, name, email, phone, password, role_id, profile_pic, status) VALUES (?,?,?,?,?,?,?,?)',
                    [adminId, name.trim(), email.trim(), phone?.trim() || '', hashed, role_id, profilePic, 'ACTIVE']
                );

if (req.io) req.io.emit('update_members');
                notifyDesktop('members');

                return res.json({ success: true, message: 'Member added successfully.' });

            } else {
                // ── INSERT INTO MEMBER_REQUESTS ───────────────────────────
                const [existing] = await con.query(
                    'SELECT id FROM member_requests WHERE email=? AND status="PENDING"', [email]
                );
                if (existing.length) {
                    if (profilePic) safeDeleteFile(profilePic);
                    return res.status(400).json({ success: false, message: 'A pending request for this email already exists.' });
                }

                const requestedBy = req.session.userId; // the user who is requesting

                await con.query(
                    'INSERT INTO member_requests (admin_id, role_id, requested_by, name, email, password, profile_pic, created_by, status) VALUES (?,?,?,?,?,?,?,?,?)',
                    [adminId, role_id, requestedBy, name.trim(), email.trim(), hashed, profilePic || null, requestedBy, 'PENDING']
                );

if (req.io) req.io.emit('update_member_requests');
                notifyDesktop('members');

                return res.json({ success: true, message: 'Member request submitted. Awaiting admin approval.', isRequest: true });
            }

} catch (err) {
            console.error('[view_member ADD]', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Email already exists.' });
            }
            return res.status(500).json({ success: false, message: 'Failed to add member.' });
        }
    });
});

// ════════════════════════════════════════════════════════════
// POST /api/view_member/edit/:id  — edit a member
// ════════════════════════════════════════════════════════════
router.post('/edit/:id', requireAuth, (req, res) => {
    upload.single('profile_pic')(req, res, async (uploadErr) => {
        if (uploadErr) return res.status(400).json({ success: false, message: uploadErr.message });

const { id } = req.params;
        const { name, email, phone, password, role_id } = req.body;
        const tempPic = req.file ? req.file.filename : null;

        if (!name || !email || !role_id) {
            if (tempPic) safeDeleteFile(tempPic);
            return res.status(400).json({ success: false, message: 'Name, email, and role are required.' });
        }

        try {
            const adminId = await getAdminId(req.session);
            if (!adminId) {
                if (tempPic) safeDeleteFile(tempPic);
                return res.status(403).json({ success: false, message: 'Admin not found.' });
            }

            const [userRows] = await con.query('SELECT * FROM users WHERE id=? AND admin_id=?', [id, adminId]);
            if (!userRows.length) {
                if (tempPic) safeDeleteFile(tempPic);
                return res.status(404).json({ success: false, message: 'Member not found.' });
            }

            const user = userRows[0];
            let finalPic = user.profile_pic;

            if (tempPic) {
                // Forward new image to desktop server
                const forwardedPic = await forwardMemberImageToDesktop(tempPic);
                if (!forwardedPic) {
                    return res.status(500).json({ success: false, message: 'Image upload failed. Please try again.' });
                }
                // Tell desktop to delete old image
                if (user.profile_pic) {
                    try {
                        await fetch(`${DESKTOP_BASE_URL}/profile/delete-image`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-mobile-secret': 'tms_mobile_bridge_2026' },
                            body: JSON.stringify({ filename: user.profile_pic }),
                        });
                    } catch (e) { console.error('[view_member] delete old image error:', e.message); }
                }
                finalPic = forwardedPic;
            }

            if (password && password.trim()) {
                const hashed = await bcrypt.hash(password.trim(), 10);
                await con.query(
                    'UPDATE users SET name=?, email=?, phone=?, role_id=?, profile_pic=?, password=? WHERE id=?',
                    [name.trim(), email.trim(), phone?.trim() || '', role_id, finalPic, hashed, id]
                );
            } else {
                await con.query(
                    'UPDATE users SET name=?, email=?, phone=?, role_id=?, profile_pic=? WHERE id=?',
                    [name.trim(), email.trim(), phone?.trim() || '', role_id, finalPic, id]
                );
            }

     if (req.io) req.io.emit('update_members');
            notifyDesktop('members');

            return res.json({ success: true, message: 'Member updated successfully.' });
} catch (err) {
            console.error('[view_member EDIT]', err);
            if (tempPic) safeDeleteFile(tempPic);
            return res.status(500).json({ success: false, message: 'Failed to update member.' });
        }
    });
});

// ════════════════════════════════════════════════════════════
// POST /api/view_member/remove-pic/:id  — remove profile picture
// ════════════════════════════════════════════════════════════
router.post('/remove-pic/:id', requireAuth, async (req, res) => {
    try {
        const adminId = await getAdminId(req.session);
        const { id } = req.params;

        const [rows] = await con.query('SELECT profile_pic FROM users WHERE id=? AND admin_id=?', [id, adminId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Member not found.' });

if (rows[0].profile_pic) {
            // Tell desktop to delete the file (it lives on desktop server)
            try {
                await fetch(`${DESKTOP_BASE_URL}/profile/delete-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-mobile-secret': 'tms_mobile_bridge_2026' },
                    body: JSON.stringify({ filename: rows[0].profile_pic }),
                });
            } catch (e) { console.error('[view_member] Desktop delete-image failed:', e.message); }
            await con.query('UPDATE users SET profile_pic=NULL WHERE id=?', [id]);
        }

        if (req.io) req.io.emit('update_members');
        notifyDesktop('members');

        return res.json({ success: true, message: 'Profile picture removed.' });
    } catch (err) {
        console.error('[view_member REMOVE-PIC]', err);
        return res.status(500).json({ success: false, message: 'Failed to remove picture.' });
    }
});

// ════════════════════════════════════════════════════════════
// GET /api/view_member/suspend/:id  — toggle suspend/activate
// ════════════════════════════════════════════════════════════
router.get('/suspend/:id', requireAuth, async (req, res) => {
    try {
        const adminId = await getAdminId(req.session);
        const { id } = req.params;

        const [rows] = await con.query('SELECT status FROM users WHERE id=? AND admin_id=?', [id, adminId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Member not found.' });

        const newStatus = rows[0].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await con.query('UPDATE users SET status=? WHERE id=?', [newStatus, id]);

if (req.io) req.io.emit('update_members');
        notifyDesktop('members');

        const msg = newStatus === 'ACTIVE' ? 'Member activated successfully.' : 'Member suspended successfully.';
        return res.json({ success: true, message: msg, newStatus });
    } catch (err) {
        console.error('[view_member SUSPEND]', err);
        return res.status(500).json({ success: false, message: 'Failed to update status.' });
    }
});

// ════════════════════════════════════════════════════════════
// GET /api/view_member/delete/:id  — delete a member
// ════════════════════════════════════════════════════════════
router.get('/delete/:id', requireAuth, async (req, res) => {
    try {
        const adminId = await getAdminId(req.session);
        const { id } = req.params;

       const [rows] = await con.query('SELECT profile_pic FROM users WHERE id=? AND admin_id=?', [id, adminId]);
        if (!rows.length) return res.status(404).json({ success: false, message: 'Member not found.' });

        // ── Re-read control_type fresh from DB ───────────────────────────
        const sessionRole = req.session.role;
        let freshControlType = req.session.control_type;
        if (req.session.userId) {
            const [ctRows] = await con.query(
                'SELECT r.control_type FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id=?',
                [req.session.userId]
            );
            if (ctRows.length) freshControlType = ctRows[0].control_type;
        }

        const canDirectDelete =
            sessionRole === 'admin' ||
            sessionRole === 'owner' ||
            freshControlType === 'OWNER';

        if (canDirectDelete) {
            // ── DIRECT DELETE ─────────────────────────────────────────────
            safeDeleteFile(rows[0].profile_pic);
            await con.query('DELETE FROM users WHERE id=?', [id]);

if (req.io) req.io.emit('update_members');
            notifyDesktop('members');

            return res.json({ success: true, message: 'Member deleted successfully.' });
} else {
            // ── INSERT DELETE REQUEST INTO MEMBER_REQUESTS ────────────────
            const requestedBy = req.session.userId;

            // Fetch full member data so we can copy it into the request row
            const [memberData] = await con.query(
                'SELECT * FROM users WHERE id=? AND admin_id=?', [id, adminId]
            );
            if (!memberData.length) {
                return res.status(404).json({ success: false, message: 'Member not found.' });
            }
            const m = memberData[0];

            // Check if a pending delete request already exists for this member
            const [existing] = await con.query(
                'SELECT id FROM member_requests WHERE requested_by=? AND request_type="DELETE" AND status="PENDING" AND email=?',
                [requestedBy, m.email]
            );
            if (existing.length) {
                return res.status(400).json({ success: false, message: 'A pending delete request already exists for this member.' });
            }

            await con.query(
                `INSERT INTO member_requests 
                 (admin_id, role_id, request_type, requested_by, name, email, password, profile_pic, status, created_at) 
                 VALUES (?, ?, 'DELETE', ?, ?, ?, ?, ?, 'PENDING', NOW())`,
                [adminId, m.role_id, requestedBy, m.name, m.email, m.password, m.profile_pic]
            );

            if (req.io) req.io.emit('member_request');
            if (req.io) req.io.emit('update_members');

            return res.json({ success: true, message: 'Delete request submitted. Awaiting admin approval.', isRequest: true });
        }

    } catch (err) {
        console.error('[view_member DELETE]', err);
        return res.status(500).json({ success: false, message: 'Failed to delete member.' });
    }
});

export default router;