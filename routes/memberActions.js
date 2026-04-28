import express from 'express';
const router = express.Router();
import con from '../config/db.js';

// Pattern: All routes send pure JSON and trigger socket update_members
const checkAuth = (req, res, next) => {
    if (!req.session.role || (req.session.role !== 'admin' && req.session.role !== 'owner')) {
        return res.status(401).json({ success: false, message: 'Unauthorized Action.' });
    }
    next();
};

// APPROVE MEMBER
router.get('/approve-member/:id', checkAuth, async (req, res) => {
    const requestId = req.params.id;
    try {
        const [rows] = await con.query("SELECT * FROM member_requests WHERE id=? AND status='PENDING'", [requestId]);
        if (rows.length === 0) return res.json({ success: false, message: 'Request no longer available.' });

        const request = rows[0];
        const [existingUser] = await con.query("SELECT id FROM users WHERE email=?", [request.email]);
        if (existingUser.length > 0) return res.json({ success: false, message: 'User already exists.' });

        await con.query(`INSERT INTO users (admin_id, role_id, name, email, password, profile_pic, created_by, status) VALUES (?,?,?,?,?,?,?, 'ACTIVE')`, 
            [request.admin_id, request.role_id, request.name, request.email, request.password, request.profile_pic, request.requested_by]);

        await con.query("DELETE FROM member_requests WHERE id=?", [requestId]);
        if (req.io) req.io.emit('update_members');
        return res.json({ success: true, message: 'Member approved successfully.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

// REJECT MEMBER
router.get('/reject-member/:id', checkAuth, async (req, res) => {
    try {
        await con.query("DELETE FROM member_requests WHERE id=?", [req.params.id]);
        if (req.io) req.io.emit('update_members');
        return res.json({ success: true, message: 'Member request rejected.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

// CONFIRM DELETION
router.get('/confirm-deletion/:id', checkAuth, async (req, res) => {
    try {
        const [rows] = await con.query("SELECT email FROM member_requests WHERE id=? AND request_type='DELETE'", [req.params.id]);
        if (rows.length > 0) {
            await con.query("DELETE FROM users WHERE email=?", [rows[0].email]);
            await con.query("DELETE FROM member_requests WHERE id=?", [req.params.id]);
            if (req.io) req.io.emit('update_members');
        }
        return res.json({ success: true, message: 'Member permanently deleted.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

// REJECT DELETION
router.get('/reject-deletion/:id', checkAuth, async (req, res) => {
    try {
        await con.query("DELETE FROM member_requests WHERE id=?", [req.params.id]);
        if (req.io) req.io.emit('update_members');
        return res.json({ success: true, message: 'Deletion request rejected.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

export default router;