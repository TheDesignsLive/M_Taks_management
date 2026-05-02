// ============================================================
//Mobile Versionyy
//  routes/profile.js  —  Express Router (ESM) — MOBILE
//  ✅ FIX: Images are uploaded to DESKTOP server via its API
//  so both desktop and mobile share the same image store
// ============================================================

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';   // ✅ NEW: to forward image to desktop
import fetch from 'node-fetch';     // ✅ NEW: to call desktop API
import con from '../config/db.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ Desktop server base URL — images will be saved here
const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';

// ✅ Temp folder on mobile server — image lands here first, then gets forwarded
const TEMP_DIR = path.join(__dirname, '..', 'public', 'images');

// ─── TEMP FILE UPLOAD CONFIG (mobile saves temporarily, then forwards) ───────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        cb(null, TEMP_DIR);
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        cb(null, `profile_${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMime = /^image\/(jpeg|jpg|png|webp)$/;
        const allowedExt  = /\.(jpeg|jpg|png|webp)$/i;
        if (allowedMime.test(file.mimetype) && allowedExt.test(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, JPEG, PNG, WEBP images are allowed.'));
        }
    },
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (!req.session?.role) {
        return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }
    next();
}

// ─── HELPER: delete temp file on mobile ──────────────────────────────────────
function deleteTempFile(filename) {
    if (!filename) return;
    try {
        const p = path.join(TEMP_DIR, filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (err) {
        console.error('[Profile] Temp file delete error:', err.message);
    }
}

// ─── HELPER: forward image to desktop server ─────────────────────────────────
// ✅ Mobile uploads file to DESKTOP /profile/upload-image endpoint
// Desktop saves it in its own public/images folder and returns the filename
// ─── HELPER: forward image to desktop server ─────────────────────────────────
async function forwardImageToDesktop(localFilename, sessionCookie) {
    try {
        const filePath = path.join(TEMP_DIR, localFilename);

        // ✅ Check file actually exists before trying to forward
        if (!fs.existsSync(filePath)) {
            console.error('[Profile] Temp file not found:', filePath);
            return null;
        }

        const form = new FormData();
        form.append('profile_pic', fs.createReadStream(filePath), localFilename);

        console.log('[Mobile] Forwarding image to desktop:', localFilename);

        const response = await fetch(`${DESKTOP_BASE_URL}/profile/upload-image`, {
            method: 'POST',
            headers: {
                ...form.getHeaders(),
                // ✅ CRITICAL: Send secret token — desktop checks this
                // Also prevents the mobile-redirect middleware from redirecting this call
                'x-mobile-secret': 'tms_mobile_bridge_2026',
            },
            body: form,
        });

        // ✅ Check if response is actually JSON before parsing
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            console.error('[Mobile] Desktop returned non-JSON:', text.substring(0, 200));
            deleteTempFile(localFilename);
            return null;
        }

        const data = await response.json();

        // ✅ Delete temp file from mobile after forwarding
        deleteTempFile(localFilename);

        if (data.success) {
            console.log('[Mobile] Image forwarded successfully:', data.filename);
            return data.filename;
        } else {
            console.error('[Mobile] Desktop upload failed:', data.message);
            return null;
        }
    } catch (err) {
        console.error('[Mobile] forwardImageToDesktop error:', err.message);
        deleteTempFile(localFilename);
        return null;
    }
}

// ════════════════════════════════════════════════════════════
//  GET /api/profile
// ════════════════════════════════════════════════════════════
router.get('/', requireAuth, async (req, res) => {
    const { adminId, role: sessionRole, userId } = req.session;

    try {
        let name = '', email = '', phone = '', company = '',
            role = '', userRoleName = '', profilePic = null;

        if (sessionRole === 'admin') {
            role = 'Admin';
            const [rows] = await con.query(
                'SELECT name, email, phone, company_name, profile_pic FROM admins WHERE id = ?',
                [adminId]
            );
            if (rows.length) {
                name       = rows[0].name        || '';
                email      = rows[0].email       || '';
                phone      = rows[0].phone       || '';
                company    = rows[0].company_name || '';
                profilePic = rows[0].profile_pic  || null;
            }
        }
        else if (sessionRole === 'owner') {
            role = 'Admin';
            const [uRows] = await con.query(
                `SELECT u.name, u.email, u.phone, u.profile_pic, u.admin_id FROM users u WHERE u.id = ?`,
                [userId]
            );
            if (uRows.length) {
                name       = uRows[0].name        || '';
                email      = uRows[0].email       || '';
                phone      = uRows[0].phone       || '';
                profilePic = uRows[0].profile_pic  || null;
                const [cRows] = await con.query('SELECT company_name FROM admins WHERE id = ?', [uRows[0].admin_id]);
                if (cRows.length) company = cRows[0].company_name || '';
            }
        }
        else {
            role = 'User';
            const [uRows] = await con.query(
                `SELECT u.name, u.email, u.phone, u.profile_pic, u.admin_id, r.role_name
                 FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
                [userId]
            );
            if (uRows.length) {
                name         = uRows[0].name        || '';
                email        = uRows[0].email       || '';
                phone        = uRows[0].phone       || '';
                profilePic   = uRows[0].profile_pic  || null;
                userRoleName = uRows[0].role_name   || '';
                const [cRows] = await con.query('SELECT company_name FROM admins WHERE id = ?', [uRows[0].admin_id]);
                if (cRows.length) company = cRows[0].company_name || '';
            }
        }

        return res.json({
            success:      true,
            name, email,
            phone:        phone   || '',
            company:      company || '',
            role, userRoleName,
            profilePic:   profilePic || null,
            isAdmin:      sessionRole === 'admin' || sessionRole === 'owner',
            status:       'Active',
        });

    } catch (err) {
        console.error('[Profile GET]', err);
        return res.status(500).json({ success: false, message: 'Error loading profile. Please try again.' });
    }
});

// ════════════════════════════════════════════════════════════
//  POST /api/profile/update-profile
// ════════════════════════════════════════════════════════════
router.post('/update-profile', requireAuth, (req, res) => {
    upload.single('profile_pic')(req, res, async function (uploadErr) {
        if (uploadErr) {
            return res.status(400).json({ success: false, message: uploadErr.message });
        }

        const { name, phone, company } = req.body;
        const tempFilename  = req.file ? req.file.filename : null; // temp file on mobile
        const { adminId, userId, role } = req.session;

        if (!name || !name.trim()) {
            if (tempFilename) deleteTempFile(tempFilename);
            return res.status(400).json({ success: false, message: 'Name is required.' });
        }

        if (phone && phone.trim() && !/^\d{10}$/.test(phone.trim())) {
            if (tempFilename) deleteTempFile(tempFilename);
            return res.status(400).json({ success: false, message: 'Enter a valid 10-digit phone number.' });
        }

        try {
            // ✅ If image was uploaded, forward it to desktop server
            let newPic = null;
            if (tempFilename) {
                const sessionCookie = req.headers.cookie || '';
                newPic = await forwardImageToDesktop(tempFilename, sessionCookie);
                if (!newPic) {
                    return res.status(500).json({ success: false, message: 'Image upload to server failed. Please try again.' });
                }
            }

            // ✅ Update DB with the filename returned by desktop server
            if (role === 'admin') {
                if (newPic) {
                    await con.query(
                        'UPDATE admins SET name=?, phone=?, company_name=?, profile_pic=? WHERE id=?',
                        [name.trim(), phone?.trim() || '', company?.trim() || '', newPic, adminId]
                    );
                } else {
                    await con.query(
                        'UPDATE admins SET name=?, phone=?, company_name=? WHERE id=?',
                        [name.trim(), phone?.trim() || '', company?.trim() || '', adminId]
                    );
                }
                req.session.adminName = name.trim();
            } else {
                if (newPic) {
                    await con.query(
                        'UPDATE users SET name=?, phone=?, profile_pic=? WHERE id=?',
                        [name.trim(), phone?.trim() || '', newPic, userId]
                    );
                } else {
                    await con.query(
                        'UPDATE users SET name=?, phone=? WHERE id=?',
                        [name.trim(), phone?.trim() || '', userId]
                    );
                }
                req.session.userName = name.trim();

                if (role === 'owner' && company !== undefined) {
                    await con.query(
                        'UPDATE admins SET company_name=? WHERE id=?',
                        [company?.trim() || '', adminId]
                    );
                }
            }

            return res.json({
                success:    true,
                name:       name.trim(),
                phone:      phone?.trim()   || '',
                company:    company?.trim() || '',
                profilePic: newPic || null,
            });

        } catch (err) {
            console.error('[Profile UPDATE]', err);
            if (tempFilename) deleteTempFile(tempFilename);
            return res.status(500).json({ success: false, message: 'Profile update failed. Please try again.' });
        }
    });
});

// ════════════════════════════════════════════════════════════
//  POST /api/profile/remove-picture
// ════════════════════════════════════════════════════════════
router.post('/remove-picture', requireAuth, async (req, res) => {
    const { role, adminId, userId } = req.session;
    const table = role === 'admin' ? 'admins' : 'users';
    const id    = role === 'admin' ? adminId  : userId;

    try {
        const [rows] = await con.query(`SELECT profile_pic, name FROM ${table} WHERE id = ?`, [id]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (rows[0].profile_pic) {
            // ✅ Tell desktop server to delete the file from its folder
            try {
                    // In the remove-picture route, replace the fetch call:
                await fetch(`${DESKTOP_BASE_URL}/profile/delete-image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-mobile-secret': 'tms_mobile_bridge_2026', // ✅ ADD THIS
                    },
                    body: JSON.stringify({ filename: rows[0].profile_pic }),
                });
            } catch (e) {
                console.error('[Profile] Desktop delete-image failed:', e.message);
                // Continue anyway — update DB even if file delete fails
            }

            await con.query(`UPDATE ${table} SET profile_pic = NULL WHERE id = ?`, [id]);
        }

        return res.json({ success: true, name: rows[0].name || '' });

    } catch (err) {
        console.error('[Profile REMOVE-PIC]', err);
        return res.status(500).json({ success: false, message: 'Could not remove picture. Please try again.' });
    }
});

export default router;