import express from 'express';
const router = express.Router();
import con from '../config/db.js';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';

// MAIN DATA
router.get('/data', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });
    const { adminId, role, userId, email } = req.session;
    const name = role === 'admin' ? req.session.adminName : req.session.userName;
    try {
        let members = [];
        if (role === "admin") {
            const [mRows] = await con.query("SELECT id, name FROM users WHERE admin_id=? AND status='ACTIVE'", [adminId]);
            members = mRows;
        } else {
            const [mRows] = await con.query("SELECT id, name FROM users WHERE admin_id=? AND status='ACTIVE' AND id != ?", [adminId, userId]);
            members = mRows;
        }
        res.json({ success: true, name, email, role, members, isAdmin: role === 'admin' });
    } catch (err) { res.status(500).json({ success: false }); }
});

// GENERATE & REQUEST OTP
router.post('/request-otp', async (req, res) => {
    const { email, reason } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        // COMMENTED: CALLING SENT MAIL ROUTER
        
      await fetch(`http://127.0.0.1:5000/api/sentmail/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact: email, otp, sent_for: reason })
});
        console.log(`\n-----------------------------------------`);
        console.log(`[MAIL SERVER] Sending OTP to: ${email}`);
        console.log(`[MAIL SERVER] Reason: ${reason}`);
        console.log(`[MAIL SERVER] OTP Code: ${otp}`);
        console.log(`-----------------------------------------\n`);
        res.json({ success: true, otp: otp });
    } catch (err) { res.status(500).json({ success: false }); }
});

// CHANGE PASSWORD
router.post('/change-password', async (req, res) => {
    if (!req.session.role) return res.json({ success: false });
    const { new_password } = req.body;
    try {
        const table = req.session.role === "admin" ? "admins" : "users";
        const id = req.session.role === "admin" ? req.session.adminId : req.session.userId;
        const hashed = await bcrypt.hash(new_password, 10);
        await con.query(`UPDATE ${table} SET password=? WHERE id=?`, [hashed, id]);
        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (err) { res.json({ success: false, message: 'Server error.' }); }
});

// CHANGE EMAIL (Strict Table Check)
router.post('/change-email', async (req, res) => {
    if (!req.session.role) return res.json({ success: false });
    const { new_email } = req.body;
    const { role, adminId, userId } = req.session;
    try {
        const table = role === "admin" ? "admins" : "users";
        const id = role === "admin" ? adminId : userId;
        
        // Agar Admin change kar raha hai toh sirf admins table check karega, User hai toh users
        const [check] = await con.query(`SELECT id FROM ${table} WHERE email=?`, [new_email]);
        if (check.length > 0) return res.json({ success: false, message: `This email is already registered in ${table} table.` });

        await con.query(`UPDATE ${table} SET email=? WHERE id=?`, [new_email, id]);
        req.session.email = new_email;
        res.json({ success: true, message: 'Gmail updated successfully!', newEmail: new_email });
    } catch (err) { res.json({ success: false, message: 'Server error.' }); }
});

// DELETE PROFILE
router.get('/delete-profile', async (req, res) => {
    if (req.session.role !== "admin") return res.json({ success: false });
    try {
        await con.query(`DELETE FROM users WHERE admin_id=?`, [req.session.adminId]);
        await con.query(`DELETE FROM admins WHERE id=?`, [req.session.adminId]);
        req.session.destroy();
        res.json({ success: true, message: 'Profile deleted.' });
    } catch (err) { res.json({ success: false }); }
});

export default router;