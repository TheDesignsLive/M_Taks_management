// ============================================================
//  routes/profile.js  —  Express Router (ESM) — MOBILE
//  GET  /api/profile
//  POST /api/profile/update-profile
//  POST /api/profile/remove-picture
// ============================================================

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import con from '../config/db.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ SHARED IMAGE FOLDER — same physical folder as desktop app on Hostinger
// Desktop saves to:  /home/u213405511/nodejs/public/images/
// Mobile now ALSO saves to the same folder — so both apps share one image store
const SHARED_IMAGES_DIR = '/home/u213405511/nodejs/public/images';

// ─── FILE UPLOAD CONFIG ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // ✅ CHANGED: Save directly into desktop's shared images folder
        if (!fs.existsSync(SHARED_IMAGES_DIR)) {
            fs.mkdirSync(SHARED_IMAGES_DIR, { recursive: true });
        }
        cb(null, SHARED_IMAGES_DIR);
    },
    filename: (req, file, cb) => {
        const ext  = path.extname(file.originalname).toLowerCase();
        const safe = `profile_${Date.now()}${ext}`;
        cb(null, safe);
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

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (!req.session?.role) {
        return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }
    next();
}

// ─── HELPER: safe file delete from SHARED folder ─────────────────────────────
function safeDeleteFile(filename) {
    if (!filename) return;
    try {
        // ✅ CHANGED: Delete from shared images folder
        const filePath = path.join(SHARED_IMAGES_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error('[Profile] File delete error:', err.message);
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
                `SELECT u.name, u.email, u.phone, u.profile_pic, u.admin_id
                 FROM users u WHERE u.id = ?`,
                [userId]
            );
            if (uRows.length) {
                name       = uRows[0].name        || '';
                email      = uRows[0].email       || '';
                phone      = uRows[0].phone       || '';
                profilePic = uRows[0].profile_pic  || null;
                const [cRows] = await con.query(
                    'SELECT company_name FROM admins WHERE id = ?',
                    [uRows[0].admin_id]
                );
                if (cRows.length) company = cRows[0].company_name || '';
            }
        }
        else {
            role = 'User';
            const [uRows] = await con.query(
                `SELECT u.name, u.email, u.phone, u.profile_pic, u.admin_id, r.role_name
                 FROM users u
                 LEFT JOIN roles r ON u.role_id = r.id
                 WHERE u.id = ?`,
                [userId]
            );
            if (uRows.length) {
                name         = uRows[0].name        || '';
                email        = uRows[0].email       || '';
                phone        = uRows[0].phone       || '';
                profilePic   = uRows[0].profile_pic  || null;
                userRoleName = uRows[0].role_name   || '';
                const [cRows] = await con.query(
                    'SELECT company_name FROM admins WHERE id = ?',
                    [uRows[0].admin_id]
                );
                if (cRows.length) company = cRows[0].company_name || '';
            }
        }

        return res.json({
            success:      true,
            name,
            email,
            phone:        phone   || '',
            company:      company || '',
            role,
            userRoleName,
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
        const newPic    = req.file ? req.file.filename : null;
        const { adminId, userId, role } = req.session;

        if (!name || !name.trim()) {
            if (newPic) safeDeleteFile(newPic);
            return res.status(400).json({ success: false, message: 'Name is required.' });
        }

        if (phone && phone.trim() && !/^\d{10}$/.test(phone.trim())) {
            if (newPic) safeDeleteFile(newPic);
            return res.status(400).json({ success: false, message: 'Enter a valid 10-digit phone number.' });
        }

        try {
            if (role === 'admin') {
                if (newPic) {
                    const [old] = await con.query('SELECT profile_pic FROM admins WHERE id = ?', [adminId]);
                    // ✅ Delete old pic from shared folder
                    if (old.length) safeDeleteFile(old[0].profile_pic);
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
            }
            else {
                if (newPic) {
                    const [old] = await con.query('SELECT profile_pic FROM users WHERE id = ?', [userId]);
                    // ✅ Delete old pic from shared folder
                    if (old.length) safeDeleteFile(old[0].profile_pic);
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

            if (req.io) {
                req.io.emit('update_session_name', { userId, adminId, newName: name.trim() });
                req.io.emit('update_profiles', { userId, name: name.trim(), phone: phone?.trim() || '', company: company?.trim() || '', profilePic: newPic });
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
            if (newPic) safeDeleteFile(newPic);
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
        const [rows] = await con.query(
            `SELECT profile_pic, name FROM ${table} WHERE id = ?`,
            [id]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (rows[0].profile_pic) {
            // ✅ Delete from shared folder
            safeDeleteFile(rows[0].profile_pic);
            await con.query(`UPDATE ${table} SET profile_pic = NULL WHERE id = ?`, [id]);
        }

        return res.json({ success: true, name: rows[0].name || '' });

    } catch (err) {
        console.error('[Profile REMOVE-PIC]', err);
        return res.status(500).json({ success: false, message: 'Could not remove picture. Please try again.' });
    }
});

export default router;