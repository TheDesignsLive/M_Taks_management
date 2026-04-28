import express from 'express';
const router = express.Router();
import con from '../config/db.js';
import bcrypt from 'bcryptjs';

// MAIN SESSION DATA FOR SETTINGS
router.get('/session-data', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });
    
    const { adminId, role, userId, email } = req.session;
    const name = role === 'admin' ? req.session.adminName : req.session.userName;

    res.json({ 
        success: true, 
        name, 
        email, 
        role,
        isAdmin: role === 'admin' 
    });
});

// CHANGE PASSWORD
router.post('/change-password', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });
    const { new_password } = req.body;
    try {
        const table = req.session.role === "admin" ? "admins" : "users";
        const id = req.session.role === "admin" ? req.session.adminId : req.session.userId;
        const hashedNewPassword = await bcrypt.hash(new_password, 10);
        
        await con.query(`UPDATE ${table} SET password=? WHERE id=?`, [hashedNewPassword, id]);
        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// CHANGE EMAIL
router.post('/change-email', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });
    const { new_email } = req.body;
    try {
        const table = req.session.role === "admin" ? "admins" : "users";
        const id = req.session.role === "admin" ? req.session.adminId : req.session.userId;

        const [check] = await con.query("SELECT id FROM admins WHERE email=? UNION SELECT id FROM users WHERE email=?", [new_email, new_email]);
        if (check.length > 0) return res.json({ success: false, message: 'Email already registered.' });

        await con.query(`UPDATE ${table} SET email=? WHERE id=?`, [new_email, id]);
        req.session.email = new_email;
        res.json({ success: true, message: 'Email updated successfully.', newEmail: new_email });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// DELETE PROFILE
router.delete('/delete-profile', async (req, res) => {
    if (req.session.role !== "admin") return res.status(403).json({ success: false, message: 'Unauthorized' });
    try {
        const adminId = req.session.adminId;
        await con.query(`DELETE FROM users WHERE admin_id=?`, [adminId]);
        await con.query(`DELETE FROM admins WHERE id=?`, [adminId]);
        req.session.destroy();
        res.json({ success: true, message: 'Account deleted permanently.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

export default router;